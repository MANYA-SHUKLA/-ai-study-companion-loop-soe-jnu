"""
Semantic search API routes with AI fallback
"""

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional, List

from app.services.pinecone_service import PineconeService
from app.services.ai_service import AIService
from app.models.database import db
from app.middleware.auth import get_user_id

router = APIRouter(prefix="/api/search", tags=["search"])

class SearchQuery(BaseModel):
    query: str
    top_k: int = 5
    subject_id: Optional[str] = None
    topic_id: Optional[str] = None
    use_ai_fallback: bool = True  # Use AI to answer if no notes found

@router.post("/")
async def semantic_search(search: SearchQuery, user_id: str = Depends(get_user_id)):
    """
    Semantic search across notes using embeddings
    User can query by meaning, e.g., "Explain Newton's Second Law"
    """
    try:
        pinecone = PineconeService()
        supabase = db.get_client()
        
        # Build filter for Pinecone
        filter_dict = {"user_id": user_id}
        if search.subject_id:
            filter_dict["subject_id"] = search.subject_id
        if search.topic_id:
            filter_dict["topic_id"] = search.topic_id
        
        # Perform semantic search
        search_results = pinecone.search(
            query=search.query,
            top_k=search.top_k,
            filter_dict=filter_dict
        )
        
        # Enrich results with note content and metadata from database
        enriched_results = []
        for result in search_results:
            note_id = result["id"]
            
            # Fetch full note details from database
            note_result = supabase.table("notes").select("*").eq("id", note_id).eq("user_id", user_id).execute()
            
            if note_result.data:
                note = note_result.data[0]
                
                # Find query in content for context snippet
                content = note.get("content", "")
                query_lower = search.query.lower()
                content_lower = content.lower()
                
                # Extract relevant snippet (300 chars around query match)
                # Try to find best match using query words
                snippet_start = 0
                snippet_end = len(content)
                
                query_words = [w for w in query_lower.split() if len(w) > 2]
                if query_words:
                    # Find first occurrence of any query word
                    best_match = len(content)
                    for word in query_words:
                        match_index = content_lower.find(word)
                        if match_index != -1 and match_index < best_match:
                            best_match = match_index
                    
                    if best_match < len(content):
                        snippet_start = max(0, best_match - 150)
                        snippet_end = min(len(content), best_match + 300)
                
                snippet = content[snippet_start:snippet_end]
                if snippet_start > 0:
                    snippet = "..." + snippet
                if snippet_end < len(content):
                    snippet = snippet + "..."
                
                enriched_results.append({
                    "id": note_id,
                    "title": note.get("title"),
                    "snippet": snippet,
                    "content": content,
                    "file_type": note.get("file_type"),
                    "subject_id": note.get("subject_id"),
                    "topic_id": note.get("topic_id"),
                    "score": result["score"],  # Similarity score from Pinecone
                    "created_at": note.get("created_at"),
                    "metadata": result.get("metadata", {})
                })
        
        # AI Fallback - ALWAYS generate answer when enabled
        ai_answer = None
        used_ai_fallback = False
        
        if search.use_ai_fallback:
            print(f"\n{'='*60}")
            print(f"🤖 AI FALLBACK ACTIVATED")
            print(f"{'='*60}")
            print(f"Query: '{search.query}'")
            print(f"Notes found: {len(enriched_results)}")
            
            try:
                from app.services.ai_service import AIService
                ai_service = AIService()
                
                # Build context from notes if available
                context = ""
                if enriched_results and len(enriched_results) > 0:
                    top_score = enriched_results[0].get("score", 0)
                    if top_score >= 0.5:
                        context = "\n\nRelevant information from user's notes:\n"
                        for i, result in enumerate(enriched_results[:3], 1):
                            context += f"{i}. From '{result['title']}': {result['snippet'][:200]}...\n"
                        print(f"✓ Using context from {min(3, len(enriched_results))} notes (score: {top_score:.2f})")
                    else:
                        print(f"✗ Notes found but low relevance (score: {top_score:.2f}), using general knowledge")
                else:
                    print(f"✗ No notes found, using general knowledge")
                
                # Generate comprehensive AI answer
                prompt = f"""You are a helpful educational AI assistant. Answer this question clearly and thoroughly:

QUESTION: {search.query}
{context}

INSTRUCTIONS:
1. Provide a clear, comprehensive answer
2. If notes were provided above, incorporate that information and mention it
3. Otherwise, use your general knowledge to give an accurate answer
4. Use markdown formatting for better readability
5. For complex topics, break into sections with headers
6. Include examples where helpful
7. Keep it educational and engaging

ANSWER:"""
                
                print(f"📤 Sending request to Gemini API...")
                ai_response = ai_service._generate_content_rest_api(
                    prompt=prompt,
                    temperature=0.7,
                    max_tokens=2000
                )
                
                if ai_response and len(ai_response.strip()) > 0:
                    ai_answer = ai_response.strip()
                    used_ai_fallback = True
                    print(f"✅ AI ANSWER GENERATED SUCCESSFULLY")
                    print(f"   Length: {len(ai_answer)} characters")
                    print(f"   Preview: {ai_answer[:100]}...")
                    print(f"{'='*60}\n")
                else:
                    print(f"❌ Empty response from Gemini API")
                    
            except Exception as ai_error:
                print(f"❌ AI FALLBACK ERROR:")
                print(f"   Error type: {type(ai_error).__name__}")
                print(f"   Error message: {str(ai_error)}")
                import traceback
                print(f"   Traceback:\n{traceback.format_exc()}")
                print(f"{'='*60}\n")
                # Set a helpful error message for the user
                ai_answer = f"I encountered an error while generating an answer. Please make sure:\n\n1. The backend server is running\n2. Your GEMINI_API_KEY is set correctly\n3. You have an active internet connection\n\nError: {str(ai_error)}"
                used_ai_fallback = True
        
        return {
            "query": search.query,
            "results": enriched_results,
            "count": len(enriched_results),
            "ai_answer": ai_answer,
            "used_ai_fallback": used_ai_fallback
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

