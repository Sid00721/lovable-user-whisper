import os
from dotenv import load_dotenv
from supabase import create_client, Client

def get_supabase_client():
    load_dotenv()
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)

def apply_migration(migration_file):
    print(f"Applying migration: {migration_file}...")
    
    supabase = get_supabase_client()
    
    with open(migration_file, 'r') as f:
        sql_content = f.read()

    # Split statements in case there are multiple
    sql_statements = [s.strip() for s in sql_content.split(';') if s.strip()]

    for stmt in sql_statements:
        try:
            # Supabase Python library doesn't have a direct way to execute arbitrary DDL
            # The recommended way is to use a custom RPC function `exec_sql`
            # This function needs to be created in your Supabase SQL editor:
            # CREATE OR REPLACE FUNCTION exec_sql(query TEXT) RETURNS void AS $$
            # BEGIN
            #     EXECUTE query;
            # END;
            # $$ LANGUAGE plpgsql;
            result = supabase.rpc('exec_sql', {'query': stmt}).execute()
            print(f"  ✅ Success: {stmt[:60]}...")
        except Exception as e:
            print(f"  ❌ Error applying statement: {stmt[:60]}...")
            print(f"     Error: {e}")

    print(f"Migration {migration_file} completed!")



def apply_all_new_migrations():
    print("Checking for new migrations to apply...")
    # This is a placeholder for a more robust migration tracking system
    # For now, we'll just apply the latest one we created
    migrations_dir = os.path.join(os.path.dirname(__file__), 'supabase', 'migrations')
    
    # In a real scenario, you'd track applied migrations in a db table
    # For this script, we'll just apply the one we know is new.
    new_migration = os.path.join(migrations_dir, '20250808000000_fix_invoices_id_column.sql')

    if os.path.exists(new_migration):
        apply_migration(new_migration)
    else:
        print("No new migration found to apply.")

if __name__ == "__main__":
    apply_all_new_migrations()