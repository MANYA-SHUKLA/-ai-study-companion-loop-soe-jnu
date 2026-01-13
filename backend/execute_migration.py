#!/usr/bin/env python3
"""
Execute database migration using Supabase connection
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT

load_dotenv()

def get_db_connection():
    """Get database connection from environment"""
    # Try DATABASE_URL first
    db_url = os.getenv("DATABASE_URL")
    
    if db_url:
        return psycopg2.connect(db_url)
    
    # Try to construct from Supabase URL
    supabase_url = os.getenv("SUPABASE_URL")
    db_password = os.getenv("SUPABASE_DB_PASSWORD")
    
    if supabase_url and db_password:
        # Extract project ref from URL
        project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")
        
        # Supabase connection string format
        # Direct connection (not pooler)
        db_url = f"postgresql://postgres.{project_ref}:{db_password}@db.{project_ref}.supabase.co:5432/postgres"
        
        try:
            return psycopg2.connect(db_url)
        except Exception as e:
            print(f"❌ Failed to connect with constructed URL: {e}")
            print(f"   Tried: postgresql://postgres.{project_ref}:***@db.{project_ref}.supabase.co:5432/postgres")
    
    print("❌ Could not establish database connection.")
    print("\nPlease add one of these to your .env file:")
    print("1. DATABASE_URL=postgresql://postgres:[password]@[host]:[port]/postgres")
    print("   (Get from Supabase Dashboard → Settings → Database → Connection string → URI)")
    print("\n2. Or add:")
    print("   SUPABASE_DB_PASSWORD=your_database_password")
    print("   (Get from Supabase Dashboard → Settings → Database → Database password)")
    
    return None

def execute_migration():
    """Execute the migration SQL"""
    print("=" * 60)
    print("🚀 Executing Database Migration")
    print("=" * 60)
    
    # Read migration file
    migrations_dir = Path(__file__).parent / "migrations"
    migration_file = migrations_dir / "000_complete_setup.sql"
    
    if not migration_file.exists():
        print(f"❌ Migration file not found: {migration_file}")
        return False
    
    with open(migration_file, 'r', encoding='utf-8') as f:
        sql = f.read()
    
    print(f"✅ Loaded migration file: {migration_file.name}")
    print(f"   Size: {len(sql)} characters\n")
    
    # Connect to database
    print("🔄 Connecting to database...")
    conn = get_db_connection()
    
    if not conn:
        return False
    
    try:
        # Set autocommit mode for DDL statements
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        print("🔄 Executing migration...\n")
        
        # Execute SQL (split by semicolon for better error reporting)
        # Note: This is a simplified approach - for complex SQL with functions,
        # we execute the whole thing at once
        try:
            cursor.execute(sql)
            print("✅ Migration executed successfully!")
            
            # Verify tables were created
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public' 
                AND table_name IN ('subjects', 'topics', 'notes', 'study_plans', 'quizzes')
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            if tables:
                print("\n✅ Verified tables created:")
                for table in tables:
                    print(f"   - {table[0]}")
            else:
                print("\n⚠️  Warning: Could not verify table creation")
            
            return True
            
        except Exception as e:
            print(f"❌ Error executing migration: {e}")
            print("\nThis might be because:")
            print("  - Tables already exist (this is okay)")
            print("  - Permission issues")
            print("  - SQL syntax error")
            print("\nCheck the error above for details.")
            return False
            
    except Exception as e:
        print(f"❌ Database error: {e}")
        return False
    finally:
        cursor.close()
        conn.close()
        print("\n✅ Database connection closed")

def main():
    """Main function"""
    try:
        success = execute_migration()
        
        if success:
            print("\n" + "=" * 60)
            print("✨ Migration Complete!")
            print("=" * 60)
            print("\nNext steps:")
            print("1. Restart your backend:")
            print("   cd backend && source venv/bin/activate && python main.py")
            print("2. Refresh your frontend browser")
            print("3. Try creating a subject - it should work now!")
            print("=" * 60)
        else:
            print("\n" + "=" * 60)
            print("⚠️  Migration may have failed or tables already exist")
            print("=" * 60)
            print("\nIf you see errors about 'already exists', that's okay!")
            print("The migration uses 'IF NOT EXISTS' so it's safe to run multiple times.")
            print("\nTry refreshing your app - it might work now!")
            print("=" * 60)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Migration cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()

