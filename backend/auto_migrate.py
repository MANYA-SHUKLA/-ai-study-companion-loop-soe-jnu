#!/usr/bin/env python3
"""
Automated database migration runner using Supabase Management API
This script automatically runs the database migrations.
"""

import os
import sys
import requests
import json
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()

def get_migration_sql():
    """Read the complete migration SQL file"""
    migrations_dir = Path(__file__).parent / "migrations"
    migration_file = migrations_dir / "000_complete_setup.sql"
    
    if not migration_file.exists():
        print(f"❌ Error: Migration file not found: {migration_file}")
        sys.exit(1)
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        return f.read()

def run_migration_via_api():
    """Run migration using Supabase Management API"""
    supabase_url = os.getenv("SUPABASE_URL")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not service_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set")
        return False
    
    # Supabase doesn't have a direct SQL execution endpoint
    # We need to use the database connection directly
    print("⚠️  Supabase REST API doesn't support direct SQL execution.")
    print("   Trying alternative method...")
    return False

def run_migration_via_psql():
    """Run migration using psql command"""
    db_url = os.getenv("DATABASE_URL")
    
    if not db_url:
        # Try to construct from Supabase URL
        supabase_url = os.getenv("SUPABASE_URL")
        db_password = os.getenv("SUPABASE_DB_PASSWORD")
        
        if supabase_url and db_password:
            # Extract project ref from URL
            # Format: https://[project-ref].supabase.co
            try:
                project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
                db_url = f"postgresql://postgres.{project_ref}:{db_password}@aws-0-us-east-1.pooler.supabase.com:6543/postgres"
            except:
                pass
        
        if not db_url:
            print("❌ DATABASE_URL not found. Please add to .env:")
            print("   DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres")
            print("\n   Or get it from Supabase Dashboard:")
            print("   Settings → Database → Connection string → URI")
            return False
    
    migration_sql = get_migration_sql()
    migration_file = Path(__file__).parent / "migrations" / "000_complete_setup.sql"
    
    # Check if psql is available
    import subprocess
    try:
        result = subprocess.run(["which", "psql"], capture_output=True, text=True)
        if result.returncode != 0:
            print("❌ psql not found. Please install PostgreSQL client tools.")
            return False
    except:
        print("❌ psql not available. Please install PostgreSQL client tools.")
        return False
    
    print(f"🔄 Running migration via psql...")
    print(f"   Database: {db_url.split('@')[1] if '@' in db_url else 'hidden'}")
    
    try:
        # Run migration using psql
        process = subprocess.Popen(
            ["psql", db_url, "-f", str(migration_file)],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True
        )
        stdout, stderr = process.communicate()
        
        if process.returncode == 0:
            print("✅ Migration completed successfully!")
            if stdout:
                print(stdout)
            return True
        else:
            print("❌ Migration failed:")
            print(stderr)
            return False
    except Exception as e:
        print(f"❌ Error running migration: {e}")
        return False

def main():
    """Main function"""
    print("=" * 60)
    print("🚀 AI Study Companion - Auto Migration Runner")
    print("=" * 60)
    
    # Try psql first (most reliable)
    if run_migration_via_psql():
        print("\n" + "=" * 60)
        print("✨ Migration complete! Restart your backend:")
        print("   cd backend && source venv/bin/activate && python main.py")
        print("=" * 60)
        return
    
    # If psql fails, provide manual instructions
    print("\n" + "=" * 60)
    print("📝 MANUAL MIGRATION REQUIRED")
    print("=" * 60)
    print("\nSince automatic migration isn't available, please run manually:\n")
    print("1. Go to: https://supabase.com/dashboard")
    print("2. Select your project")
    print("3. Click 'SQL Editor' → 'New query'")
    print("4. Copy the entire file:")
    print(f"   {Path(__file__).parent / 'migrations' / '000_complete_setup.sql'}")
    print("5. Paste and click 'Run'")
    print("\n" + "=" * 60)

if __name__ == "__main__":
    main()

