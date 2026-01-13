"""
AI service for generating study plans, quizzes, and topic extraction
Uses Google Gemini (free tier)
"""

import os
import json
import requests
import re
from typing import List, Dict, Any, Optional, Tuple
from app.services.adaptive_difficulty import AdaptiveDifficultyService
from app.services.rate_limit_handler import handle_gemini_rate_limit, RateLimitError

# Import Google Gemini (optional - we'll use REST API as fallback)
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    # We'll use REST API instead

class AIService:
    def __init__(self):
        # Use Gemini (free tier)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError(
                "GEMINI_API_KEY must be set. "
                "Get your free API key from: https://makersuite.google.com/app/apikey"
            )
        
        self.api_key = api_key
        # Recommended: v1 + gemini-1.5-flash for speed + low cost (topic extraction/summarization)
        # Fallback: v1beta + gemini-pro for maximum stability
        self.model_name = "gemini-1.5-flash"
        self.api_version = "v1"  # Use v1 API (recommended for speed + cost)
        
        # Priority order based on recommendations:
        # 1. v1 + gemini-1.5-flash (speed + low cost - best for topic extraction)
        # 2. v1beta + gemini-pro (maximum stability)
        # 3. Other fallbacks
        self.priority_models = [
            ("gemini-1.5-flash", "v1"),      # Primary: speed + low cost
            ("gemini-pro", "v1beta"),        # Fallback: maximum stability
            ("gemini-1.5-flash", "v1beta"), # Alternative API version
            ("gemini-1.5-pro", "v1"),       # Pro version with v1
            ("gemini-1.5-pro", "v1beta")    # Pro version with v1beta
        ]
        
        # Try to initialize SDK (optional - we'll use REST API primarily)
        self.gemini_model = None
        if GEMINI_AVAILABLE:
            try:
                genai.configure(api_key=api_key)
                # Try to initialize - if it fails, we'll use REST API
                try:
                    self.gemini_model = genai.GenerativeModel("gemini-1.5-flash")
                except:
                    pass  # Will use REST API instead
            except:
                pass  # Will use REST API instead
    
    def _parse_json_response(self, text: str) -> Dict[str, Any]:
        """
        Parse JSON from AI response, handling common issues:
        - JSON wrapped in markdown code blocks
        - Malformed JSON with unterminated strings
        - Extra text before/after JSON
        - Very long responses (250k+ chars)
        - Truncated responses (incomplete fields)
        """
        if not text:
            raise ValueError("Empty response from AI")
        
        # Log response size for debugging
        if len(text) > 100000:
            print(f"[Gemini API] Warning: Large response ({len(text)} chars), may have parsing issues")
        
        # Check for explicit truncation marker from API
        is_explicitly_truncated = "[TRUNCATED]" in text
        if is_explicitly_truncated:
            # Remove the marker
            text = text.replace("[TRUNCATED]", "").rstrip()
            print(f"[Gemini API] Response was explicitly marked as truncated by API")
        
        # Check for truncated response (ends with incomplete field like "hours": or "topic":)
        text_stripped = text.rstrip()
        truncated_patterns = [
            r':\s*$',  # Ends with colon
            r':\s*"[^"]*$',  # Ends with unterminated string value
            r':\s*\d*\.?\d*$',  # Ends with incomplete number
            r'"\s*$',  # Ends with quote (incomplete string)
            r'[^"]"[^"]*$',  # Ends with unterminated string (no closing quote)
        ]
        is_truncated = is_explicitly_truncated
        for pattern in truncated_patterns:
            if re.search(pattern, text_stripped):
                is_truncated = True
                print(f"[Gemini API] Warning: Response appears truncated (pattern: {pattern}), attempting to fix...")
                break
        
        # Also check if response ends with incomplete JSON structure
        if not is_truncated:
            # Check if it ends with incomplete field (e.g., "date": "2025)
            if text_stripped.endswith('"') and text_stripped.count('"') % 2 != 0:
                # Odd number of quotes - likely unterminated string
                is_truncated = True
                print(f"[Gemini API] Warning: Response appears truncated (unterminated string), attempting to fix...")
            elif ':' in text_stripped[-50:] and not text_stripped.rstrip().endswith(('}', ']', ',')):
                # Ends with a field separator but not a valid JSON terminator
                is_truncated = True
                print(f"[Gemini API] Warning: Response appears truncated (incomplete field), attempting to fix...")
        
        # Try direct JSON parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError as e:
            error_msg = str(e)
            # If it's an unterminated string error, try to fix it
            if 'Unterminated string' in error_msg:
                print(f"[Gemini API] Detected unterminated string, attempting to fix...")
                # Extract position from error message
                match = re.search(r'char (\d+)', error_msg)
                if match:
                    error_pos = int(match.group(1))
                    # Try to find the start of the unterminated string and close it
                    # Look backwards from error position to find the opening quote
                    search_start = max(0, error_pos - 1000)  # Look back up to 1000 chars
                    substring = text[search_start:error_pos + 100]
                    
                    # Find the last unescaped quote before the error
                    # This is a simplified approach - find the last " that's not escaped
                    last_quote_pos = -1
                    for i in range(len(substring) - 1, -1, -1):
                        if substring[i] == '"' and (i == 0 or substring[i-1] != '\\'):
                            last_quote_pos = search_start + i
                            break
                    
                    if last_quote_pos > 0:
                        # Close the string at the error position
                        fixed_text = text[:error_pos] + '"' + text[error_pos:]
                        try:
                            return json.loads(fixed_text)
                        except:
                            # Try closing at the last quote position instead
                            fixed_text = text[:last_quote_pos+1] + text[error_pos:]
                            try:
                                return json.loads(fixed_text)
                            except:
                                pass
        
        # Try to extract JSON from markdown code blocks
        json_match = re.search(r'```(?:json)?\s*(\{.*?\})\s*```', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group(1))
            except json.JSONDecodeError:
                pass
        
        # Try to fix truncated responses
        if is_truncated:
            print(f"[Gemini API] Attempting to fix truncated JSON response...")
            fixed_text = text_stripped
            
            # Strategy 1: Find and remove incomplete day/activity objects at the end
            # Look for the last complete day object in the "days" array
            # A complete day object should end with: }, "total_hours": X }
            
            # Find the last complete closing brace for a day object
            # Days are in format: {"date": "...", "activities": [...], "total_hours": X}
            # We need to find the last complete day and remove any incomplete one after it
            
            # Find positions of key structures
            last_complete_day_end = -1
            
            # Look for pattern: }, "total_hours": number }
            # This indicates a complete day object
            total_hours_pattern = r'"total_hours"\s*:\s*\d+\.?\d*\s*\}'
            matches = list(re.finditer(total_hours_pattern, fixed_text))
            if matches:
                # Found at least one complete day, use the last one
                last_match = matches[-1]
                last_complete_day_end = last_match.end()
                print(f"[Gemini API] Found last complete day at position {last_complete_day_end}")
            
            # If we found a complete day, try to cut there and close the structures
            if last_complete_day_end > 0 and last_complete_day_end > len(fixed_text) - 500:
                # Cut at the end of the last complete day
                fixed_text = fixed_text[:last_complete_day_end]
                
                # Ensure we close the days array and main object properly
                # Count structures
                open_braces = fixed_text.count('{')
                close_braces = fixed_text.count('}')
                open_brackets = fixed_text.count('[')
                close_brackets = fixed_text.count(']')
                
                # Close brackets first (days array)
                if open_brackets > close_brackets:
                    fixed_text += ']'
                    close_brackets += 1
                
                # Then close braces (main object)
                if open_braces > close_braces:
                    fixed_text += '}' * (open_braces - close_braces)
                
                print(f"[Gemini API] Attempting to parse fixed JSON (length: {len(fixed_text)})...")
                try:
                    parsed = json.loads(fixed_text)
                    print(f"[Gemini API] Successfully parsed fixed JSON!")
                    return parsed
                except json.JSONDecodeError as e:
                    print(f"[Gemini API] Failed to parse fixed JSON: {e}")
            
            # Strategy 2: Find last complete activity and remove incomplete day
            # Look for the last complete activity object: }, "hours": number }
            activity_pattern = r'\}\s*,\s*\{[^}]*"hours"\s*:\s*\d+\.?\d*\s*\}'
            activity_matches = list(re.finditer(activity_pattern, fixed_text))
            if activity_matches:
                last_activity = activity_matches[-1]
                # Find the end of this activity's closing brace
                activity_end = last_activity.end()
                # Look for the closing brace of the activities array
                after_activity = fixed_text[activity_end:]
                next_brace = after_activity.find('}')
                if next_brace > 0:
                    cut_pos = activity_end + next_brace + 1
                    fixed_text = fixed_text[:cut_pos]
                    
                    # Close structures
                    open_braces = fixed_text.count('{')
                    close_braces = fixed_text.count('}')
                    open_brackets = fixed_text.count('[')
                    close_brackets = fixed_text.count(']')
                    
                    if open_brackets > close_brackets:
                        fixed_text += ']'
                    if open_braces > close_braces:
                        fixed_text += '}' * (open_braces - close_braces)
                    
                    try:
                        return json.loads(fixed_text)
                    except json.JSONDecodeError:
                        pass
            
            # Strategy 3: Simple approach - find last complete structure and close it
            # Find the last complete closing brace or bracket
            last_brace = fixed_text.rfind('}')
            last_bracket = fixed_text.rfind(']')
            
            if last_brace > 0 or last_bracket > 0:
                cut_pos = max(last_brace, last_bracket)
                if cut_pos > len(fixed_text) - 200:  # Only if truncation is near the end
                    fixed_text = fixed_text[:cut_pos+1]
                    
                    # Close all open structures
                    open_braces = fixed_text.count('{')
                    close_braces = fixed_text.count('}')
                    open_brackets = fixed_text.count('[')
                    close_brackets = fixed_text.count(']')
                    
                    if open_brackets > close_brackets:
                        fixed_text += ']'
                    if open_braces > close_braces:
                        fixed_text += '}' * (open_braces - close_braces)
                    
                    try:
                        return json.loads(fixed_text)
                    except json.JSONDecodeError:
                        pass
        
        # Try to find JSON object in the text (handle very long responses)
        # Use a more efficient approach for large text
        if len(text) > 100000:
            # For very long text, find the first { and try to parse incrementally
            first_brace = text.find('{')
            if first_brace >= 0:
                # Try to find a reasonable end point
                # Look for the last } that might close the main object
                last_brace = text.rfind('}')
                if last_brace > first_brace:
                    json_str = text[first_brace:last_brace+1]
                    try:
                        return json.loads(json_str)
                    except json.JSONDecodeError as e:
                        # Try to fix unterminated strings in the extracted portion
                        error_msg = str(e)
                        if 'Unterminated string' in error_msg:
                            match = re.search(r'char (\d+)', error_msg)
                            if match:
                                pos_in_substring = int(match.group(1))
                                # Close the string
                                fixed_json = json_str[:pos_in_substring] + '"' + json_str[pos_in_substring:]
                                try:
                                    return json.loads(fixed_json)
                                except:
                                    pass
        else:
            # For smaller responses, use regex
            json_match = re.search(r'\{.*\}', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                try:
                    return json.loads(json_str)
                except json.JSONDecodeError as e:
                    # Try to fix common issues
                    json_str = re.sub(r',\s*}', '}', json_str)
                    json_str = re.sub(r',\s*]', ']', json_str)
                    if 'Unterminated string' in str(e):
                        match = re.search(r'char (\d+)', str(e))
                        if match:
                            pos = int(match.group(1))
                            json_str = json_str[:pos] + '"' + json_str[pos:]
                        try:
                            return json.loads(json_str)
                        except:
                            pass
        
        # Last resort: try to extract and fix the JSON manually
        raise ValueError(
            f"Failed to parse JSON from AI response. "
            f"Response length: {len(text)} chars. "
            f"First 500 chars: {text[:500]}... "
            f"Last 500 chars: ...{text[-500:]}"
        )
    
    def _list_available_models(self) -> List[tuple]:
        """
        List available models from Gemini API using ListModels endpoint
        Returns list of (model_name, api_version) tuples for models that support generateContent
        """
        available_models = []
        # Try v1beta first (as recommended), then v1
        for api_version in ["v1beta", "v1"]:
            try:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models?key={self.api_key}"
                response = requests.get(url, headers={"Content-Type": "application/json"})
                if response.status_code == 200:
                    result = response.json()
                    if "models" in result:
                        for model in result["models"]:
                            name = model.get("name", "")
                            # Extract model name (remove "models/" prefix)
                            if name.startswith("models/"):
                                name = name.replace("models/", "")
                            # Check if model supports generateContent
                            methods = model.get("supportedGenerationMethods", [])
                            if "generateContent" in methods:
                                available_models.append((name, api_version))
                        # If we found models, return them (prefer v1beta results)
                        if available_models:
                            print(f"[Gemini API] Found {len(available_models)} available models in {api_version}: {[m[0] for m in available_models[:5]]}")
                            return available_models
            except Exception as e:
                print(f"[Gemini API] Error listing models from {api_version}: {e}")
                continue
        return available_models
    
    def _generate_content_rest_api(self, prompt: str, temperature: float = 0.7, response_mime_type: str = "text/plain", max_tokens: Optional[int] = None) -> str:
        """
        Generate content using Gemini REST API (more reliable than deprecated SDK)
        Tries multiple API versions and model names
        """
        # If we have a cached working model, use it first
        if hasattr(self, '_cached_working_model'):
            model_name, api_version = self._cached_working_model
            try:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={self.api_key}"
                generation_config = {
                    "temperature": temperature,
                    "responseMimeType": response_mime_type,
                }
                # Use provided max_tokens or default to 4096
                max_output_tokens = max_tokens if max_tokens is not None else 4096
                generation_config["maxOutputTokens"] = max_output_tokens
                
                payload = {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": generation_config
                }
                response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
                if response.status_code == 200:
                    result = response.json()
                    if "candidates" in result and len(result["candidates"]) > 0:
                        candidate = result["candidates"][0]
                        # Check for truncation indicator
                        finish_reason = candidate.get("finishReason", "")
                        if finish_reason == "MAX_TOKENS":
                            print(f"[Gemini API] Warning: Response was truncated (MAX_TOKENS finish reason)")
                        if "content" in candidate and "parts" in candidate["content"]:
                            parts = candidate["content"]["parts"]
                            if len(parts) > 0 and "text" in parts[0]:
                                text = parts[0]["text"]
                                # If truncated, mark it for special handling
                                if finish_reason == "MAX_TOKENS":
                                    # Add a marker to help parsing logic detect truncation
                                    text += "\n[TRUNCATED]"
                                return text
            except:
                # Cached model failed, clear it and try others
                delattr(self, '_cached_working_model')
        
        # First, get list of available models (best practice)
        available_models = self._list_available_models()
        
        # Build models_to_try list with smart prioritization
        models_to_try = []
        
        if available_models:
            # We have available models - prioritize recommended combinations
            available_dict = {(m, v): True for m, v in available_models}
            
            # 1. Try recommended: v1 + gemini-1.5-flash (speed + low cost)
            if ("gemini-1.5-flash", "v1") in available_dict:
                models_to_try.append(("gemini-1.5-flash", "v1"))
                print("[Gemini API] Using recommended: v1 + gemini-1.5-flash (speed + low cost)")
            
            # 2. Try stability fallback: v1beta + gemini-pro
            if ("gemini-pro", "v1beta") in available_dict:
                models_to_try.append(("gemini-pro", "v1beta"))
                print("[Gemini API] Fallback available: v1beta + gemini-pro (maximum stability)")
            
            # 3. Add other available models that match our priority list
            for model_name, api_version in self.priority_models:
                if (model_name, api_version) in available_dict and (model_name, api_version) not in models_to_try:
                    models_to_try.append((model_name, api_version))
            
            # 4. Add any other available models we haven't tried
            for model_name, api_version in available_models:
                if (model_name, api_version) not in models_to_try:
                    models_to_try.append((model_name, api_version))
        else:
            # Fallback: use priority models if listing fails
            print("[Gemini API] Could not list models, using priority models")
            models_to_try = self.priority_models.copy()
        
        last_error = None
        attempted = []
        
        # Try each model/API version combination
        for model_name, api_version in models_to_try:
            attempted.append(f"{model_name} ({api_version})")
            try:
                url = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent?key={self.api_key}"
                
                payload = {
                    "contents": [{
                        "parts": [{"text": prompt}]
                    }],
                    "generationConfig": {
                        "temperature": temperature,
                        "responseMimeType": response_mime_type,
                        "maxOutputTokens": max_tokens if max_tokens is not None else 4096
                    }
                }
                
                response = requests.post(url, json=payload, headers={"Content-Type": "application/json"}, timeout=60)
                
                # If successful, update the model name and API version for future calls
                if response.status_code == 200:
                    self.model_name = model_name
                    self.api_version = api_version
                    self._cached_working_model = (model_name, api_version)
                    print(f"[Gemini API] ✓ Successfully using model: {model_name} with API version: {api_version}")
                    result = response.json()
                    
                    # Extract text from response
                    if "candidates" in result and len(result["candidates"]) > 0:
                        candidate = result["candidates"][0]
                        # Check for truncation indicator
                        finish_reason = candidate.get("finishReason", "")
                        if finish_reason == "MAX_TOKENS":
                            print(f"[Gemini API] Warning: Response was truncated (MAX_TOKENS finish reason)")
                        if "content" in candidate and "parts" in candidate["content"]:
                            parts = candidate["content"]["parts"]
                            if len(parts) > 0 and "text" in parts[0]:
                                text = parts[0]["text"]
                                # If truncated, mark it for special handling
                                if finish_reason == "MAX_TOKENS":
                                    # Add a marker to help parsing logic detect truncation
                                    text += "\n[TRUNCATED]"
                                return text
                    
                    raise ValueError(f"Unexpected response format from Gemini API: {result}")
                elif response.status_code == 404:
                    # Model not found, try next one
                    last_error = f"Model {model_name} not found in {api_version}"
                    print(f"[Gemini API] ✗ Model {model_name} not found in {api_version}, trying next...")
                    continue
                else:
                    # Other error, raise it
                    response.raise_for_status()
                    
            except requests.exceptions.HTTPError as e:
                if e.response.status_code == 404:
                    last_error = f"Model {model_name} not found in {api_version}: {str(e)}"
                    print(f"[Gemini API] ✗ Model {model_name} not found in {api_version}, trying next...")
                    continue
                else:
                    last_error = f"HTTP error for {model_name} in {api_version}: {str(e)}"
                    # For non-404 errors, try next model/version
                    continue
            except Exception as e:
                last_error = f"Error with {model_name} in {api_version}: {str(e)}"
                continue
        
        # If we get here, all attempts failed
        error_msg = (
            f"Failed to generate content with any available model.\n"
            f"Attempted: {', '.join(attempted[:10])}{'...' if len(attempted) > 10 else ''}\n"
            f"Last error: {last_error}\n"
            f"Please check your API key and available models at https://ai.google.dev/gemini-api/docs/models"
        )
        print(f"[Gemini API] {error_msg}")
        raise ValueError(error_msg)
    
    async def generate_topics_from_subject(self, subject_name: str, subject_description: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate topics for a subject based on its name and description.
        Used when no notes are uploaded - creates a basic topic structure.
        """
        description_text = subject_description or ""
        
        prompt = f"""Generate a comprehensive list of topics for the subject: {subject_name}
        
{description_text if description_text else "Create a typical curriculum structure for this subject."}

Requirements:
1. Generate 8-15 main topics that would typically be covered in this subject
2. For each topic, provide:
   - A clear, concise title
   - A brief description (1-2 sentences)
   - Difficulty level: 1 (easy), 2 (medium), 3 (intermediate), 4 (hard), or 5 (very hard)
   - Estimated study hours needed (realistic estimate)
3. Organize topics in a logical learning sequence
4. Consider typical curriculum progression for this subject

Return a JSON object with a "topics" array. Each topic object should have:
- "title": string
- "description": string
- "difficulty_level": integer (1-5)
- "estimated_hours": float
- "parent_topic_title": null (all are main topics)

Example format:
{{
  "topics": [
    {{
      "title": "Introduction to {subject_name}",
      "description": "Overview of key concepts and fundamentals",
      "difficulty_level": 2,
      "estimated_hours": 3.0,
      "parent_topic_title": null
    }},
    {{
      "title": "Core Concepts",
      "description": "Fundamental principles and theories",
      "difficulty_level": 3,
      "estimated_hours": 5.0,
      "parent_topic_title": null
    }}
  ]
}}"""
        
        full_prompt = f"""You are an expert educational content creator. Generate a comprehensive topic list for academic subjects based on their name and typical curriculum structure.

{prompt}

IMPORTANT: Return ONLY valid JSON, no other text."""
        
        @handle_gemini_rate_limit
        def _generate_content():
            try:
                text = self._generate_content_rest_api(
                    full_prompt,
                    temperature=0.5,
                    response_mime_type="application/json"
                )
                class Response:
                    def __init__(self, text):
                        self.text = text
                return Response(text)
            except Exception as e:
                if self.gemini_model:
                    return self.gemini_model.generate_content(
                        full_prompt,
                        generation_config={
                            "temperature": 0.5,
                            "response_mime_type": "application/json",
                        }
                    )
                else:
                    raise e
        
        try:
            response = await _generate_content()
            result = self._parse_json_response(response.text)
        except RateLimitError as e:
            raise ValueError(
                f"Rate limit exceeded. Please wait a moment and try again. "
                f"Details: {str(e)}"
            ) from e
        except Exception as e:
            error_str = str(e).lower()
            if '429' in error_str or 'rate limit' in error_str or 'quota' in error_str:
                raise ValueError(
                    f"Rate limit exceeded. Please wait a moment and try again. "
                    f"Details: {str(e)}"
                ) from e
            raise
        
        topics = result.get("topics", [])
        
        # Validate and clean topics
        validated_topics = []
        for idx, topic in enumerate(topics):
            if not topic.get("title"):
                continue
            
            validated_topics.append({
                "title": topic["title"].strip(),
                "description": topic.get("description", "").strip() or None,
                "difficulty_level": max(1, min(5, int(topic.get("difficulty_level", 2)))),
                "estimated_hours": float(topic.get("estimated_hours", 2.0)),
                "parent_topic_title": None,  # All are main topics
                "order_index": idx
            })
        
        return validated_topics
    
    async def extract_topics(self, syllabus_text: str, subject: str) -> List[Dict[str, Any]]:
        """
        Extract topics and subtopics from syllabus text using Google Gemini.
        
        This method is isolated from Pinecone/embeddings:
        - Uses only AI service (Gemini or OpenAI) for extraction
        - Does NOT interact with Pinecone or generate embeddings
        - Returns structured topic data for database storage
        
        Returns a list of topics with:
        - title: Topic/subtopic name
        - description: Brief description
        - difficulty_level: 1-5 (1=easy, 2=medium, 3=intermediate, 4=hard, 5=very hard)
        - estimated_hours: Estimated study time in hours
        - parent_topic_title: If it's a subtopic, name of parent topic (null if main topic)
        
        Note: Embeddings are handled separately in PineconeService for semantic search.
        """
        # Truncate text if too long (to avoid token limits)
        max_chars = 15000  # Approximate limit to stay within token budget
        if len(syllabus_text) > max_chars:
            syllabus_text = syllabus_text[:max_chars] + "\n[Content truncated...]"
        
        prompt = f"""Analyze the following {subject} syllabus and extract all topics and subtopics.

Extract topics and organize them hierarchically. For each topic, provide:
1. A clear, concise title
2. A brief description (1-2 sentences)
3. Difficulty level: 1 (easy), 2 (medium), 3 (intermediate), 4 (hard), or 5 (very hard)
4. Estimated study hours needed
5. If it's a subtopic, specify the parent topic title (null for main topics)

Focus on extracting:
- Main topics/chapters
- Subtopics within each main topic
- Organize logically in a hierarchical structure

Syllabus Content:
{syllabus_text}

Return a JSON object with a "topics" array. Each topic object should have:
- "title": string
- "description": string
- "difficulty_level": integer (1-5)
- "estimated_hours": float
- "parent_topic_title": string or null

Example format:
{{
  "topics": [
    {{
      "title": "Introduction to Machine Learning",
      "description": "Overview of ML concepts and applications",
      "difficulty_level": 2,
      "estimated_hours": 3.0,
      "parent_topic_title": null
    }},
    {{
      "title": "Supervised Learning",
      "description": "Learning with labeled data",
      "difficulty_level": 3,
      "estimated_hours": 5.0,
      "parent_topic_title": "Introduction to Machine Learning"
    }}
  ]
}}"""
        
        # Call Gemini AI
        full_prompt = f"""You are an expert educational content analyst. Extract structured topics from syllabi, maintaining logical hierarchy and providing realistic difficulty assessments and time estimates.

{prompt}

IMPORTANT: Return ONLY valid JSON, no other text."""
        
        @handle_gemini_rate_limit
        def _generate_content():
            # Try REST API first (more reliable)
            try:
                text = self._generate_content_rest_api(
                    full_prompt,
                    temperature=0.3,
                    response_mime_type="application/json"
                )
                # Create a simple object that mimics the SDK response
                class Response:
                    def __init__(self, text):
                        self.text = text
                return Response(text)
            except Exception as e:
                # Fallback to SDK if REST API fails and SDK is available
                if self.gemini_model:
                    return self.gemini_model.generate_content(
                        full_prompt,
                        generation_config={
                    "temperature": 0.3,
                    "response_mime_type": "application/json",
                }
            )
                else:
                    raise e
        
        try:
            # Await async rate-limited call
            response = await _generate_content()
            result = self._parse_json_response(response.text)
        except RateLimitError as e:
            raise ValueError(
                f"Rate limit exceeded. Please wait a moment and try again. "
                f"Details: {str(e)}"
            ) from e
        except Exception as e:
            # Check if it's a rate limit error from Gemini
            error_str = str(e).lower()
            if '429' in error_str or 'rate limit' in error_str or 'quota' in error_str:
                raise ValueError(
                    f"Rate limit exceeded. Please wait a moment and try again. "
                    f"Details: {str(e)}"
                ) from e
            raise
        topics = result.get("topics", [])
        
        # Validate and clean topics
        validated_topics = []
        for topic in topics:
            if not topic.get("title"):
                continue
            
            validated_topics.append({
                "title": topic["title"].strip(),
                "description": topic.get("description", "").strip() or None,
                "difficulty_level": max(1, min(5, int(topic.get("difficulty_level", 2)))),
                "estimated_hours": float(topic.get("estimated_hours", 2.0)),
                "parent_topic_title": topic.get("parent_topic_title") or None
            })
        
        return validated_topics
    
    async def generate_study_plan(
        self,
        topics: List[Dict],
        exam_date: str,
        available_hours_per_day: float,
        user_weak_areas: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Generate a personalized study plan with day-wise breakdown
        Each day includes topics with specific activities (learn/revise/quiz)
        """
        # Format topics with difficulty and estimated hours
        topics_str = "\n".join([
            f"- {t['title']} (Difficulty: {t.get('difficulty_level', 2)}/5, Estimated: {t.get('estimated_hours', 2.0)} hours)"
            for t in topics
        ])
        weak_areas_str = f"\nWeak areas to focus on: {', '.join(user_weak_areas)}" if user_weak_areas else ""
        
        # Calculate total days available
        from datetime import datetime, timedelta
        today = datetime.now().date()
        exam = datetime.strptime(exam_date, "%Y-%m-%d").date()
        days_available = (exam - today).days
        
        # Calculate total estimated hours needed
        total_hours_needed = sum(t.get('estimated_hours', 2.0) for t in topics)
        # Add 30% for revision and practice
        total_hours_needed = total_hours_needed * 1.3
        
        # Group topics by difficulty for better sequencing
        easy_topics = [t for t in topics if t.get('difficulty_level', 2) <= 2]
        medium_topics = [t for t in topics if 2 < t.get('difficulty_level', 2) <= 3]
        hard_topics = [t for t in topics if t.get('difficulty_level', 2) > 3]
        
        topics_by_difficulty = f"""
Topics breakdown:
- Easy topics ({len(easy_topics)}): {', '.join([t['title'] for t in easy_topics[:5]])}{'...' if len(easy_topics) > 5 else ''}
- Medium topics ({len(medium_topics)}): {', '.join([t['title'] for t in medium_topics[:5]])}{'...' if len(medium_topics) > 5 else ''}
- Hard topics ({len(hard_topics)}): {', '.join([t['title'] for t in hard_topics[:5]])}{'...' if len(hard_topics) > 5 else ''}
"""
        
        prompt = f"""You are an expert educational psychologist and study planner with deep knowledge of learning science, cognitive psychology, and effective study strategies. Create a comprehensive, realistic, and scientifically-backed daily study plan.

STUDENT PROFILE:
- Exam date: {exam_date}
- Days until exam: {days_available} days
- Available study hours per day: {available_hours_per_day} hours
- Total study hours available: {days_available * available_hours_per_day:.1f} hours
- Total estimated content hours: {total_hours_needed:.1f} hours
- Number of topics: {len(topics)}

TOPICS TO COVER:
{topics_str}
{topics_by_difficulty}
{weak_areas_str}

SCIENTIFIC STUDY PRINCIPLES TO APPLY:

1. **Spaced Repetition (Ebbinghaus Forgetting Curve)**
   - First review: 1-2 days after learning
   - Second review: 4-7 days after first review
   - Third review: 2-3 weeks after second review
   - Final review: 1 week before exam

2. **Progressive Difficulty Sequencing**
   - Start with easier topics to build confidence and momentum
   - Gradually introduce medium difficulty topics
   - Tackle hard topics after foundational knowledge is solid
   - Mix difficulty levels in later weeks to maintain engagement

3. **Active Learning Distribution**
   - Learn phase: 40% of time (first exposure to new content)
   - Revise phase: 35% of time (spaced repetition reviews)
   - Quiz/Practice phase: 25% of time (active recall and application)

4. **Interleaving Practice**
   - Don't study one topic for too long (max 2-3 hours per topic per day)
   - Mix related topics in the same session for better retention
   - Alternate between different types of activities

5. **Cognitive Load Management**
   - Break complex topics into smaller chunks
   - Limit new content per day (max 2-3 new topics)
   - Include buffer days for catch-up and review

6. **Weak Areas Reinforcement**
   - Allocate 20-30% more time to weak areas
   - Include multiple revision cycles for weak topics
   - Add extra quiz sessions for weak areas

7. **Exam Preparation Phases**
   - Phase 1 (Weeks 1-2): Foundation building - learn all easy and medium topics
   - Phase 2 (Weeks 3-4): Deep learning - tackle hard topics, first revision cycle
   - Phase 3 (Weeks 5-6): Integration - mixed practice, second revision cycle
   - Phase 4 (Final week): Intensive review - all topics, mock tests, weak area focus

DETAILED REQUIREMENTS:

1. **Day Structure:**
   - Each day must have 2-4 activities (mix of learn/revise/quiz)
   - Total hours per day should be {available_hours_per_day} hours (can be slightly less on lighter days)
   - Never exceed {available_hours_per_day} hours per day
   - Include 1-2 rest/buffer days per week for catch-up

2. **Activity Types:**
   - "learn": First-time learning of new content (1.5-3 hours per topic)
   - "revise": Review of previously learned content (1-2 hours per topic)
   - "quiz": Practice questions and active recall (1-1.5 hours per topic)

3. **Topic Coverage:**
   - All topics must be learned at least once
   - Each topic should have 2-3 revision sessions (spaced out)
   - Each topic should have at least 1 quiz session
   - Weak areas should have 3-4 revision sessions

4. **Realistic Progression:**
   - Week 1-2: Focus on easy and medium topics (build foundation)
   - Week 3-4: Introduce hard topics, start first revision cycle
   - Week 5-6: Deep practice, second revision cycle, interleaving
   - Final week: Comprehensive review, all topics, intensive practice

5. **Quality Standards:**
   - Make the plan realistic and achievable
   - Include variety to prevent burnout
   - Balance new learning with review
   - Ensure adequate time for each topic based on its estimated hours
   - Account for difficulty levels in time allocation

6. **Special Considerations:**
   - If exam is more than 60 days away, create a focused 60-day intensive plan
   - If exam is less than 7 days away, create an intensive review-focused plan
   - Include lighter days (50-70% of available hours) for sustainability
   - Add milestone days (every 2 weeks) for comprehensive review

Return JSON format (CRITICAL - must be valid JSON):
{{
    "plan_type": "daily",
    "start_date": "YYYY-MM-DD",
    "end_date": "YYYY-MM-DD",
    "days": [
        {{
            "date": "YYYY-MM-DD",
            "activities": [
                {{
                    "topic": "Exact Topic Name (match exactly from list above)",
                    "activity": "learn" | "revise" | "quiz",
                    "hours": 1.5
                }}
            ],
            "total_hours": 2.5
        }}
    ]
}}"""
        
        # Call Gemini AI
        full_prompt = f"""You are an expert educational psychologist specializing in creating evidence-based, realistic study plans. Your plans are used by real students preparing for important exams.

{prompt}

CRITICAL JSON FORMATTING REQUIREMENTS:
- Return ONLY valid JSON, no other text, no markdown, no code blocks
- Use exact topic names from the list provided (do not shorten or modify)
- Ensure all dates are in YYYY-MM-DD format
- All numbers must be valid (hours > 0, total_hours <= {available_hours_per_day})
- Every opening brace {{ must have a closing brace }}
- Every opening bracket [ must have a closing bracket ]
- All strings must be properly quoted and escaped
- Complete ALL required fields - never leave incomplete structures
- If response would exceed token limits, prioritize creating a complete plan for the first {min(60, days_available)} days
- Validate JSON structure before returning - ensure it's parseable

QUALITY CHECKLIST:
✓ All topics are covered at least once
✓ Spaced repetition is implemented (revisions spaced appropriately)
✓ Weak areas get extra attention
✓ Difficulty progression is logical
✓ Time allocation is realistic
✓ Plan fits within available days and hours
✓ JSON is complete and valid"""
        
        @handle_gemini_rate_limit
        def _generate_content():
            # Try REST API first (more reliable)
            try:
                text = self._generate_content_rest_api(
                    full_prompt,
                    temperature=0.4,  # Lower temperature for more structured, consistent output
                    response_mime_type="application/json",
                    max_tokens=32768  # Maximum for gemini-1.5-flash to prevent truncation
                )
                # Create a simple object that mimics the SDK response
                class Response:
                    def __init__(self, text):
                        self.text = text
                return Response(text)
            except Exception as e:
                # Fallback to SDK if REST API fails and SDK is available
                if self.gemini_model:
                    return self.gemini_model.generate_content(
                        full_prompt,
                        generation_config={
                    "temperature": 0.4,  # Lower temperature for better structure
                    "response_mime_type": "application/json",
                }
            )
                else:
                    raise e
        
        try:
            # Await async rate-limited call
            response = await _generate_content()
            result = self._parse_json_response(response.text)
        except RateLimitError as e:
            raise ValueError(
                f"Rate limit exceeded. Please wait a moment and try again. "
                f"Details: {str(e)}"
            ) from e
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse study plan JSON from AI response. "
                f"The response may be malformed or too long. Please try again. "
                f"Error: {str(e)}"
            ) from e
        except Exception as e:
            # Check if it's a rate limit error from Gemini
            error_str = str(e).lower()
            if '429' in error_str or 'rate limit' in error_str or 'quota' in error_str:
                raise ValueError(
                    f"Rate limit exceeded. Please wait a moment and try again. "
                    f"Details: {str(e)}"
                ) from e
            raise
        
        # Validate and ensure structure is correct
        if "days" not in result:
            result["days"] = []
        
        # Validate and enhance the plan
        validated_days = []
        topics_covered = set()
        topics_revised = {}
        
        for day in result["days"]:
            if "activities" not in day:
                day["activities"] = []
            
            # Calculate total hours if missing
            if "total_hours" not in day:
                day["total_hours"] = sum(act.get("hours", 0) for act in day.get("activities", []))
            
            # Ensure total_hours doesn't exceed available hours
            if day["total_hours"] > available_hours_per_day:
                # Scale down proportionally
                scale_factor = available_hours_per_day / day["total_hours"]
                for activity in day["activities"]:
                    activity["hours"] = round(activity.get("hours", 0) * scale_factor, 1)
                day["total_hours"] = round(sum(act.get("hours", 0) for act in day["activities"]), 1)
            
            # Track topic coverage
            for activity in day["activities"]:
                topic_name = activity.get("topic", "")
                if topic_name:
                    if activity.get("activity") == "learn":
                        topics_covered.add(topic_name)
                    elif activity.get("activity") == "revise":
                        topics_revised[topic_name] = topics_revised.get(topic_name, 0) + 1
            
            validated_days.append(day)
        
        result["days"] = validated_days
        
        # Log coverage statistics for debugging
        print(f"[Study Plan] Generated {len(validated_days)} days")
        print(f"[Study Plan] Topics covered (learned): {len(topics_covered)}/{len(topics)}")
        print(f"[Study Plan] Topics with revisions: {len([t for t, count in topics_revised.items() if count > 0])}")
        
        return result
    
    async def generate_quiz(
        self,
        topic: str,
        notes_text: str,
        difficulty_level: int = 2,
        question_type: str = "mcq"
    ) -> Dict[str, Any]:
        """
        Generate quiz questions for a topic
        Focus on MCQs for MVP (Step 1)
        """
        difficulty_description = {
            1: "Very easy - test basic recall and definitions",
            2: "Easy - test understanding of key concepts",
            3: "Medium - test application of concepts",
            4: "Hard - test analysis and synthesis",
            5: "Very hard - test evaluation and critical thinking"
        }
        
        prompt = f"""Generate a high-quality multiple-choice question (MCQ) based on the following topic and notes.

Topic: {topic}

Notes:
{notes_text}

Difficulty Level: {difficulty_level}/5
{difficulty_description.get(difficulty_level, "Medium difficulty")}

Requirements:
1. Create a clear, well-worded question that tests understanding
2. Provide exactly 4 answer options (A, B, C, D)
3. Only one option should be correct
4. Distractors (wrong answers) should be plausible but clearly incorrect
5. Include a brief explanation of why the correct answer is right
6. Question should be relevant to the topic and notes provided

Return JSON format:
{{
    "question": "Question text",
    "question_type": "mcq",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_answer": "Option A" (or B, C, or D - must match one of the options exactly),
    "explanation": "Brief explanation of why the correct answer is right"
}}
"""
        
        # Call Gemini AI
        full_prompt = f"""You are an expert educational content creator specializing in creating high-quality multiple-choice questions that effectively test student understanding. Your questions are clear, fair, and pedagogically sound.

{prompt}

IMPORTANT: Return ONLY valid JSON, no other text."""
        
        @handle_gemini_rate_limit
        def _generate_content():
            # Try REST API first (more reliable)
            try:
                text = self._generate_content_rest_api(
                    full_prompt,
                    temperature=0.8,
                    response_mime_type="application/json"
                )
                # Create a simple object that mimics the SDK response
                class Response:
                    def __init__(self, text):
                        self.text = text
                return Response(text)
            except Exception as e:
                # Fallback to SDK if REST API fails and SDK is available
                if self.gemini_model:
                    return self.gemini_model.generate_content(
                        full_prompt,
                        generation_config={
                    "temperature": 0.8,
                    "response_mime_type": "application/json",
                }
            )
                else:
                    raise e
        
        try:
            # Await async rate-limited call
            response = await _generate_content()
            return self._parse_json_response(response.text)
        except RateLimitError as e:
            raise ValueError(
                f"Rate limit exceeded. Please wait a moment and try again. "
                f"Details: {str(e)}"
            ) from e
        except json.JSONDecodeError as e:
            raise ValueError(
                f"Failed to parse quiz JSON from AI response. "
                f"The response may be malformed. Please try again. "
                f"Error: {str(e)}"
            ) from e
        except Exception as e:
            # Check if it's a rate limit error from Gemini
            error_str = str(e).lower()
            if '429' in error_str or 'rate limit' in error_str or 'quota' in error_str:
                raise ValueError(
                    f"Rate limit exceeded. Please wait a moment and try again. "
                    f"Details: {str(e)}"
                ) from e
            raise
    
    async def generate_multiple_quizzes(
        self,
        topic: str,
        notes_text: str,
        count: int = 5,
        difficulty_level: Optional[int] = None,
        question_type: str = "mcq",
        user_id: Optional[str] = None,
        topic_id: Optional[str] = None,
        supabase_client: Optional[Any] = None,
        base_difficulty: int = 2
    ) -> tuple[List[Dict[str, Any]], int]:
        """
        Generate multiple quiz questions with adaptive difficulty
        
        Adaptive Mode:
        When difficulty_level is None, the method switches to adaptive mode.
        In adaptive mode (if user_id/topic_id/supabase_client provided):
        - Automatically pulls user performance from database
        - Calculates adaptive difficulty based on recent quiz results
        - Uses calculated difficulty for quiz generation
        
        Fixed Mode:
        When difficulty_level is provided (1-5), uses that fixed difficulty.
        
        Args:
            topic: Topic name
            notes_text: Notes content
            count: Number of quizzes to generate
            difficulty_level: Fixed difficulty (1-5) or None for adaptive mode
            question_type: Type of question (default: "mcq")
            user_id: User ID for adaptive difficulty calculation (required if adaptive mode)
            topic_id: Topic ID for adaptive difficulty calculation (UUID string of topic being quizzed, required if adaptive mode)
            supabase_client: Supabase client instance (required if adaptive mode)
            base_difficulty: Base difficulty from topic (default: 2)
        
        Returns:
            Tuple of (list of quiz dictionaries, difficulty_used)
            - First element: List of quiz dictionaries
            - Second element: Integer difficulty level (1-5) that was actually used for generation
            
        Return Value Details:
            difficulty_used is always an integer between 1 and 5.
            It may differ from difficulty_level if adaptive mode is triggered:
            - If difficulty_level is None (adaptive mode): difficulty_used = calculated adaptive difficulty (1-5)
            - If difficulty_level is provided (fixed mode): difficulty_used = difficulty_level (same value)
            
            Example:
                - Input: difficulty_level=None → Output: difficulty_used=3 (calculated)
                - Input: difficulty_level=2 → Output: difficulty_used=2 (same as input)
            
        Note:
            This function returns exactly 2 items. The route layer unpacks it as:
            quizzes, difficulty_used = generate_multiple_quizzes(...)
            DO NOT modify to return 3 items - it will break the route layer.
        """
        # Adaptive difficulty: pull performance and calculate if needed
        if difficulty_level is None and user_id and topic_id and supabase_client:
            # Get user's progress for this topic (including stored base_difficulty)
            progress_result = supabase_client.table("topic_progress").select(
                "current_difficulty, last_quiz_difficulty, base_difficulty"
            ).eq("user_id", user_id).eq("topic_id", topic_id).execute()
            
            # Use stored base_difficulty if available, otherwise use passed base_difficulty
            stored_base_difficulty = base_difficulty
            if progress_result.data and progress_result.data[0].get("base_difficulty"):
                stored_base_difficulty = progress_result.data[0].get("base_difficulty")
            
            # Determine baseline difficulty
            current_difficulty = stored_base_difficulty
            if progress_result.data:
                # Prefer last_quiz_difficulty (what was actually used), fallback to current_difficulty
                current_difficulty = (
                    progress_result.data[0].get("last_quiz_difficulty") or
                    progress_result.data[0].get("current_difficulty") or
                    stored_base_difficulty
                )
            
            # Get recent quiz results for performance analysis
            all_results = supabase_client.table("quiz_results").select(
                "is_correct, time_taken_seconds, attempted_at"
            ).eq("user_id", user_id).eq("topic_id", topic_id).order("attempted_at", desc=True).execute()
            
            # Filter recent results (last 7 days, max 20)
            recent_results = AdaptiveDifficultyService.get_recent_results_for_analysis(
                all_results.data,
                lookback_days=7,
                max_results=20
            )
            
            # Calculate adaptive difficulty using AdaptiveDifficultyService
            # This is the core integration point
            difficulty_level, _ = AdaptiveDifficultyService.calculate_next_difficulty(
                current_difficulty=current_difficulty,
                recent_results=recent_results,
                base_difficulty=stored_base_difficulty
            )
        elif difficulty_level is None:
            # No adaptive data available, use base difficulty
            difficulty_level = base_difficulty
        else:
            # Fixed difficulty provided, ensure it's in valid range
            difficulty_level = max(1, min(5, difficulty_level))
        
        quizzes = []
        
        # Truncate notes if too long (to avoid token limits)
        max_chars = 8000
        if len(notes_text) > max_chars:
            notes_text = notes_text[:max_chars] + "\n[Content truncated...]"
        
        # Generate MCQs with calculated difficulty
        for i in range(count):
            quiz = await self.generate_quiz(
                topic=topic,
                notes_text=notes_text,
                difficulty_level=difficulty_level,
                question_type=question_type
            )
            quizzes.append(quiz)
        
        # IMPORTANT: Returns exactly 2 items: (quizzes, difficulty_level)
        # Route layer expects: quizzes, difficulty_used = generate_multiple_quizzes(...)
        # DO NOT add a third return value - it will break the route layer
        return quizzes, difficulty_level

