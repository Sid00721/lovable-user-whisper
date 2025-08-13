import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def find_sid_employee_id():
    """Find the employee ID for 'sid'"""
    try:
        # Search for employee with name containing 'sid' (case insensitive)
        response = supabase.table('employees').select('id, name').ilike('name', '%sid%').execute()
        
        if response.data:
            print(f"Found employees matching 'sid':")
            for emp in response.data:
                print(f"ID: {emp['id']}, Name: {emp['name']}")
            return response.data[0]['id']  # Return first match
        else:
            print("No employee found with name containing 'sid'")
            return None
            
    except Exception as e:
        print(f"Error finding employee: {e}")
        return None

def assign_unassigned_users_to_sid():
    """Assign all unassigned users (excluding heffron.ai emails) to sid"""
    try:
        # First, find sid's employee ID
        sid_id = find_sid_employee_id()
        if not sid_id:
            print("Cannot proceed without sid's employee ID")
            return
        
        print(f"Using employee ID {sid_id} for sid")
        
        # Get all unassigned users without heffron.ai emails
        response = supabase.table('clients').select('id, name, email, phone').is_('employee_id', 'null').not_.like('email', '%heffron.ai%').execute()
        
        if response.data:
            user_ids = [user['id'] for user in response.data]
            print(f"Found {len(user_ids)} unassigned users to assign to sid")
            
            # Update all these users to be assigned to sid
            update_response = supabase.table('clients').update({'employee_id': sid_id}).in_('id', user_ids).execute()
            
            if update_response.data:
                print(f"Successfully assigned {len(update_response.data)} users to sid")
                return len(update_response.data)
            else:
                print("No users were updated")
                return 0
        else:
            print("No unassigned users found")
            return 0
            
    except Exception as e:
        print(f"Error assigning users: {e}")
        return 0

if __name__ == "__main__":
    assigned_count = assign_unassigned_users_to_sid()
    print(f"\nTotal users assigned to sid: {assigned_count}")