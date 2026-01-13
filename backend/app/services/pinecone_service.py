"""
Pinecone service for vector embeddings and semantic search
Uses Google Gemini embeddings (free tier)
"""

import os
import requests
import time
import random
from typing import List, Dict, Any, Optional
from pinecone import Pinecone, ServerlessSpec
from app.services.rate_limit_handler import RateLimitError

class PineconeService:
    def __init__(self):
        api_key = os.getenv("PINECONE_API_KEY")
        if not api_key:
            raise ValueError("PINECONE_API_KEY must be set")
        
        self.pc = Pinecone(api_key=api_key)
        
        # Environment-based index name with fallback
        # Priority:
        # 1. PINECONE_INDEX_NAME (if explicitly set) - allows custom index names
        # 2. study-companion-{ENVIRONMENT} (if ENVIRONMENT is "dev" or "prod")
        # 3. study-companion-dev (fallback)
        # This ensures dev and prod data are separated by default
        env = os.getenv("ENVIRONMENT", "dev").lower()
        default_index = f"study-companion-{env}" if env in ["dev", "prod"] else "study-companion-dev"
        self.index_name = os.getenv("PINECONE_INDEX_NAME", default_index)
        
        # Use Gemini embeddings (FREE tier)
        gemini_api_key = os.getenv("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError(
                "GEMINI_API_KEY must be set for embeddings. "
                "Get your free API key from: https://makersuite.google.com/app/apikey\n"
                "This is FREE - no credit card required!"
            )
        
        self.gemini_api_key = gemini_api_key
        # Use Gemini's embedding API endpoint (FREE tier)
        self.gemini_embedding_url = f"https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key={gemini_api_key}"
        self.embedding_dimension = 768  # Gemini text-embedding-004 is 768 dimensions
        
        # Initialize or connect to index
        self._ensure_index_exists()
    
    def _ensure_index_exists(self):
        """Create index if it doesn't exist"""
        existing_indexes = [idx.name for idx in self.pc.list_indexes()]
        
        if self.index_name not in existing_indexes:
            # Create index with dimensions based on embedding provider
            self.pc.create_index(
                name=self.index_name,
                dimension=self.embedding_dimension,
                metric="cosine",
                spec=ServerlessSpec(
                    cloud="aws",
                    region=os.getenv("PINECONE_ENVIRONMENT", "us-east-1")
                )
            )
        
        self.index = self.pc.Index(self.index_name)
    
    def get_embedding(self, text: str, max_retries: int = 5) -> List[float]:
        """
        Generate embedding for text using Gemini (free tier)
        Includes retry logic for rate limit errors
        """
        # Use Gemini embeddings via REST API (100% FREE!)
        last_exception = None
        
        for attempt in range(max_retries + 1):
            try:
                # Use Gemini's REST API for embeddings (FREE!)
                response = requests.post(
                    self.gemini_embedding_url,
                    json={
                        "content": {
                            "parts": [{"text": text}]
                        }
                    },
                    headers={"Content-Type": "application/json"}
                )
                response.raise_for_status()
                result = response.json()
                # Extract embedding values from response
                if 'embedding' in result:
                    return result['embedding'].get('values', result['embedding'])
                else:
                    # Fallback: try direct access
                    return result.get('values', result)
            except requests.exceptions.HTTPError as e:
                # Check for rate limit (429)
                if response.status_code == 429:
                    last_exception = e
                    if attempt < max_retries:
                        # Get Retry-After header if available
                        retry_after = response.headers.get('Retry-After')
                        delay = 1.0 * (2 ** attempt)  # Exponential backoff
                        
                        if retry_after:
                            try:
                                delay = max(delay, int(retry_after))
                            except ValueError:
                                pass
                        
                        # Add jitter
                        delay += random.uniform(0, delay * 0.1)
                        delay = min(delay, 60.0)  # Cap at 60 seconds
                        
                        print(f"Rate limit hit (429). Retrying in {delay:.2f} seconds... (attempt {attempt + 1}/{max_retries + 1})")
                        time.sleep(delay)
                        continue
                    else:
                        raise RateLimitError(
                            f"Rate limit exceeded after {max_retries} retries. Please wait a moment and try again.",
                            retry_after=int(retry_after) if retry_after else None
                        ) from e
                else:
                    # Not a rate limit error, raise immediately
                    raise ValueError(
                        f"Failed to get Gemini embedding. HTTP {response.status_code}: {str(e)}\n"
                        f"Make sure GEMINI_API_KEY is valid. Get it from: https://makersuite.google.com/app/apikey"
                    ) from e
            except requests.exceptions.RequestException as e:
                last_exception = e
                if attempt < max_retries:
                    delay = 1.0 * (2 ** attempt)
                    delay = min(delay, 10.0)  # Cap at 10 seconds for network errors
                    print(f"Network error. Retrying in {delay:.2f} seconds... (attempt {attempt + 1}/{max_retries + 1})")
                    time.sleep(delay)
                    continue
                else:
                    raise ValueError(
                        f"Failed to get Gemini embedding after {max_retries} retries. Error: {str(e)}\n"
                        f"Make sure GEMINI_API_KEY is valid. Get it from: https://makersuite.google.com/app/apikey"
                    ) from e
            except KeyError as e:
                raise ValueError(
                    f"Unexpected response from Gemini API. Error: {str(e)}\n"
                    f"Response: {response.text if 'response' in locals() else 'No response'}"
                ) from e
        
        # All retries exhausted
        if last_exception:
            raise RateLimitError(
                f"Rate limit exceeded after {max_retries} retries. Please wait a moment and try again.",
                retry_after=None
            ) from last_exception
    
    def upsert_note(self, note_id: str, text: str, metadata: Dict[str, Any]):
        """Store note embedding in Pinecone"""
        embedding = self.get_embedding(text)
        
        self.index.upsert(
            vectors=[{
                "id": note_id,
                "values": embedding,
                "metadata": metadata
            }]
        )
    
    def search(self, query: str, top_k: int = 5, filter_dict: Optional[Dict] = None) -> List[Dict]:
        """Semantic search across notes"""
        query_embedding = self.get_embedding(query)
        
        results = self.index.query(
            vector=query_embedding,
            top_k=top_k,
            include_metadata=True,
            filter=filter_dict
        )
        
        return [
            {
                "id": match.id,
                "score": match.score,
                "metadata": match.metadata
            }
            for match in results.matches
        ]
    
    def delete_note(self, note_id: str):
        """Delete note embedding from Pinecone"""
        self.index.delete(ids=[note_id])

