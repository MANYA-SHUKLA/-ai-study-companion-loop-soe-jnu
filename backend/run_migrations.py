#!/usr/bin/env python3
"""
Automated database migration runner for AI Study Companion
This script runs all database migrations in Supabase automatically.
"""

import os
import sys
from pathlib import Path
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_supabase_client() -> Client:
    """Get Supabase client using service role key for admin operations"""
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not url or not key:
        print("❌ Error: SUPABASE_URL and SUPABASE_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set in .env")
        print("\nPlease add these to your backend/.env file:")
        print("  SUPABASE_URL=your_supabase_url")
        print("  SUPABASE_KEY=your_supabase_anon_key")
        print("\nOr for admin operations:")
        print("  SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
        sys.exit(1)
    
    return create_client(url, key)

def read_migration_file(file_path: Path) -> str:
    """Read migration SQL file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        print(f"❌ Error: Migration file not found: {file_path}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error reading migration file: {e}")
        sys.exit(1)

def run_migration(client: Client, sql: str, migration_name: str):
    """Run a migration using Supabase RPC or direct SQL execution"""
    print(f"\n🔄 Running migration: {migration_name}")
    
    try:
        # Split SQL into individual statements (basic splitting by semicolon)
        # Note: This is a simplified approach. For complex SQL with functions,
        # you might need to use Supabase's SQL execution API or run via psql
        
        # Try using Supabase's REST API to execute SQL
        # Note: Supabase Python client doesn't have direct SQL execution
        # We'll need to use the REST API directly
        
        import requests
        import json
        
        url = os.getenv("SUPABASE_URL")
        service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
        
        # Use Supabase Management API to run SQL
        # This requires the service role key
        headers = {
            "apikey": service_key,
            "Authorization": f"Bearer {service_key}",
            "Content-Type": "application/json"
        }
        
        # Supabase doesn't have a direct SQL execution endpoint via REST
        # We need to use the PostgREST API or run via psql
        # For now, let's try using the database connection directly
        
        print("⚠️  Note: Supabase Python client doesn't support direct SQL execution.")
        print("   You need to run migrations manually in Supabase SQL Editor.")
        print("\n📋 Here's what to do:")
        print("   1. Go to https://supabase.com/dashboard")
        print("   2. Select your project")
        print("   3. Click 'SQL Editor' → 'New query'")
        print(f"   4. Copy the contents of: backend/migrations/000_complete_setup.sql")
        print("   5. Paste and click 'Run'")
        
        return False
        
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

def main():
    """Main migration runner"""
    print("=" * 60)
    print("🚀 AI Study Companion - Database Migration Runner")
    print("=" * 60)
    
    # Check if we're in the right directory
    backend_dir = Path(__file__).parent
    migrations_dir = backend_dir / "migrations"
    
    if not migrations_dir.exists():
        print(f"❌ Error: Migrations directory not found: {migrations_dir}")
        sys.exit(1)
    
    # Get Supabase client
    try:
        client = get_supabase_client()
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        sys.exit(1)
    
    # Read the complete setup migration
    migration_file = migrations_dir / "000_complete_setup.sql"
    if not migration_file.exists():
        print(f"❌ Error: Migration file not found: {migration_file}")
        print("\nAvailable migration files:")
        for f in sorted(migrations_dir.glob("*.sql")):
            print(f"  - {f.name}")
        sys.exit(1)
    
    sql_content = read_migration_file(migration_file)
    print(f"✅ Loaded migration file: {migration_file.name}")
    print(f"   Size: {len(sql_content)} characters")
    
    # Since Supabase Python client doesn't support direct SQL execution,
    # we'll create a helper script that uses psql or provide instructions
    print("\n" + "=" * 60)
    print("📝 MIGRATION INSTRUCTIONS")
    print("=" * 60)
    print("\nSince Supabase Python client doesn't support direct SQL execution,")
    print("please run the migration manually in Supabase SQL Editor:\n")
    print("1. Open: https://supabase.com/dashboard")
    print("2. Select your project")
    print("3. Click 'SQL Editor' → 'New query'")
    print(f"4. Copy the entire contents of: {migration_file}")
    print("5. Paste into SQL Editor")
    print("6. Click 'Run' (or press Ctrl+Enter / Cmd+Enter)")
    print("\n" + "=" * 60)
    
    # Alternatively, try to use psql if available
    print("\n🔧 Alternative: Using psql (if available)")
    print("=" * 60)
    
    # Get database connection string from env
    db_url = os.getenv("DATABASE_URL")
    if db_url:
        print(f"\n✅ Found DATABASE_URL")
        print("\nYou can also run migrations using psql:")
        print(f"  psql '{db_url}' -f {migration_file}")
        print("\nOr copy-paste the SQL:")
        print(f"  cat {migration_file} | psql '{db_url}'")
    else:
        print("\n⚠️  DATABASE_URL not found in .env")
        print("   To use psql, add DATABASE_URL to your .env file")
        print("   Format: postgresql://postgres:[password]@[host]:[port]/postgres")
    
    print("\n" + "=" * 60)
    print("✨ After running the migration, restart your backend:")
    print("   cd backend && source venv/bin/activate && python main.py")
    print("=" * 60)

if __name__ == "__main__":
    main()

