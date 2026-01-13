"""
Rate limit handler for Gemini API
Handles 429 Too Many Requests with retry logic and request queuing
Uses asyncio for FastAPI compatibility (async/await)
"""

import asyncio
import time
from typing import Callable, Any, Optional, Coroutine
from functools import wraps
import random
import logging

logger = logging.getLogger(__name__)

class RateLimitError(Exception):
    """Custom exception for rate limit errors"""
    def __init__(self, message: str, retry_after: Optional[int] = None):
        super().__init__(message)
        self.retry_after = retry_after

class AsyncRequestQueue:
    """Async request queue for managing concurrent API requests using asyncio"""
    
    def __init__(self, max_concurrent: int = 3):
        """
        Initialize async request queue
        
        Args:
            max_concurrent: Maximum number of concurrent requests allowed
        """
        self.max_concurrent = max_concurrent
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.queue = asyncio.Queue()
    
    async def acquire(self):
        """Acquire a slot for a request (async, waits if queue is full)"""
        await self.semaphore.acquire()
    
    def release(self):
        """Release a slot and allow next queued request"""
        self.semaphore.release()

# Global async request queue instance
_request_queue = AsyncRequestQueue(max_concurrent=3)

async def exponential_backoff_retry_async(
    func: Callable,
    max_retries: int = 5,
    initial_delay: float = 1.0,
    max_delay: float = 60.0,
    exponential_base: float = 2.0,
    jitter: bool = True,
    *args,
    **kwargs
) -> Any:
    """
    Async retry wrapper with exponential backoff
    
    Args:
        func: Function to retry (can be sync or async)
        max_retries: Maximum number of retry attempts
        initial_delay: Initial delay in seconds
        max_delay: Maximum delay in seconds
        exponential_base: Base for exponential backoff
        jitter: Whether to add random jitter to delays
        *args, **kwargs: Arguments to pass to func
    """
    last_exception = None
    
    for attempt in range(max_retries + 1):
        try:
            # If func is a coroutine, await it; otherwise run in thread pool
            if asyncio.iscoroutinefunction(func):
                return await func(*args, **kwargs)
            else:
                # Run synchronous Gemini calls in thread pool to avoid blocking
                return await asyncio.to_thread(func, *args, **kwargs)
        except Exception as e:
            last_exception = e
            
            # Check if it's a rate limit error (429)
            is_rate_limit = (
                hasattr(e, 'status_code') and e.status_code == 429
            ) or (
                hasattr(e, 'code') and e.code == 429
            ) or (
                '429' in str(e) or 'rate limit' in str(e).lower() or 'quota' in str(e).lower()
            )
            
            # Only retry on rate limit errors or if it's the last attempt
            if not is_rate_limit and attempt < max_retries:
                raise
            
            # Don't retry on last attempt
            if attempt >= max_retries:
                break
            
            # Calculate delay with exponential backoff
            delay = min(
                initial_delay * (exponential_base ** attempt),
                max_delay
            )
            
            # Add jitter to prevent thundering herd
            if jitter:
                jitter_amount = delay * 0.1 * random.random()
                delay += jitter_amount
            
            # Check for Retry-After header if available
            retry_after = None
            if hasattr(e, 'response') and hasattr(e.response, 'headers'):
                retry_after_header = e.response.headers.get('Retry-After')
                if retry_after_header:
                    try:
                        retry_after = int(retry_after_header)
                        delay = max(delay, retry_after)
                    except ValueError:
                        pass
            
            logger.warning(
                f"Rate limit error (attempt {attempt + 1}/{max_retries + 1}): {str(e)}. "
                f"Retrying in {delay:.2f} seconds..."
            )
            
            # Use asyncio.sleep instead of time.sleep for async compatibility
            await asyncio.sleep(delay)
    
    # All retries exhausted
    if last_exception:
        raise RateLimitError(
            f"Rate limit exceeded after {max_retries} retries: {str(last_exception)}",
            retry_after=None
        ) from last_exception
    
    raise RuntimeError("Unexpected error in retry logic")

async def with_rate_limit_queue_async(func: Callable, *args, **kwargs) -> Any:
    """
    Async wrapper to queue requests and prevent overwhelming the API
    
    This ensures only a limited number of requests are processed concurrently
    using asyncio.Semaphore (not threading)
    """
    # Acquire semaphore slot (waits if max_concurrent reached)
    await _request_queue.acquire()
    
    try:
        # Execute function with retry logic
        return await exponential_backoff_retry_async(
            func,
            max_retries=5,
            initial_delay=1.0,
            max_delay=60.0,
            *args,
            **kwargs
        )
    finally:
        # Release semaphore slot
        _request_queue.release()

def handle_gemini_rate_limit(func: Callable) -> Callable:
    """
    Decorator for Gemini API calls that handles rate limiting with async support
    
    This decorator:
    1. Queues requests using asyncio.Semaphore (max_concurrent=3)
    2. Retries on 429 errors with exponential backoff
    3. Runs synchronous Gemini calls in thread pool to avoid blocking event loop
    
    Usage in async FastAPI routes:
        @handle_gemini_rate_limit
        def _generate_content():
            return self.gemini_model.generate_content(...)
        
        # In async route:
        response = await _generate_content()
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs) -> Any:
        """Async wrapper that handles rate limiting"""
        return await with_rate_limit_queue_async(func, *args, **kwargs)
    
    return async_wrapper

# Legacy synchronous wrapper (for backwards compatibility if needed)
# Note: This should not be used in FastAPI async routes
def handle_gemini_rate_limit_sync(func: Callable) -> Callable:
    """
    Synchronous version (legacy) - NOT recommended for FastAPI
    
    Use handle_gemini_rate_limit instead for async routes
    """
    @wraps(func)
    def sync_wrapper(*args, **kwargs) -> Any:
        # Run async handler in event loop
        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
        
        return loop.run_until_complete(
            with_rate_limit_queue_async(func, *args, **kwargs)
        )
    
    return sync_wrapper
