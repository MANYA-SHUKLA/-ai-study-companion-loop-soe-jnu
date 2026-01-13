"""
Database connection and models using Supabase
"""

from supabase import create_client, Client
import os
from typing import Optional

class Database:
    _instance: Optional['Database'] = None
    _client: Optional[Client] = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
        return cls._instance
    
    def get_client(self) -> Client:
        if self._client is None:
            url = os.getenv("SUPABASE_URL")
            # Use service role key for backend operations (bypasses RLS)
            # Falls back to anon key if service role key not available
            key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
            if not url or not key:
                raise ValueError("SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set")
            self._client = create_client(url, key)
        return self._client

# Global database instance
db = Database()

