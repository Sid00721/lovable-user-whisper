import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def verify_assignments():
    """Verify the assignment results"""
    try:
        # Get sid's employee ID
        sid_response = supabase.table('employees').select('id, name').ilike('name', '%sid%').execute()
        if not sid_response.data:
            print("Sid not found")
            return
        
        sid_id = sid_response.data[0]['id']
        sid_name = sid_response.data[0]['name']
        print(f"Checking assignments for {sid_name} (ID: {sid_id})")
        
        # Count users assigned to sid
        assigned_response = supabase.table('clients').select('id', count='exact').eq('employee_id', sid_id).execute()
        assigned_count = assigned_response.count
        
        # Count total unassigned users
        unassigned_response = supabase.table('clients').select('id', count='exact').is_('employee_id', 'null').execute()
        unassigned_count = unassigned_response.count
        
        # Count unassigned users without heffron.ai emails
        unassigned_no_heffron_response = supabase.table('clients').select('id', count='exact').is_('employee_id', 'null').not_.like('email', '%heffron.ai%').execute()
        unassigned_no_heffron_count = unassigned_no_heffron_response.count
        
        print(f"\n=== Assignment Verification ===")
        print(f"Users assigned to {sid_name}: {assigned_count}")
        print(f"Total unassigned users remaining: {unassigned_count}")
        print(f"Unassigned users without heffron.ai emails: {unassigned_no_heffron_count}")
        
        if unassigned_no_heffron_count == 0:
            print("\n✅ SUCCESS: All non-heffron.ai unassigned users have been assigned to sid!")
        else:
            print(f"\n⚠️  WARNING: {unassigned_no_heffron_count} non-heffron.ai users are still unassigned")
            
    except Exception as e:
        print(f"Error verifying assignments: {e}")

if __name__ == "__main__":
    verify_assignments()