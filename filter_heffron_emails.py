import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def get_unassigned_users_without_heffron():
    """Get phone numbers of unassigned users who don't have heffron.ai emails"""
    try:
        # Query for unassigned users (employee_id is NULL) who don't have heffron.ai emails
        response = supabase.table('clients').select('phone').is_('employee_id', 'null').not_.like('email', '%heffron.ai%').execute()
        
        if response.data:
            # Extract phone numbers and filter out None/empty values
            phone_numbers = [user['phone'] for user in response.data if user['phone']]
            return phone_numbers
        else:
            print("No unassigned users found without heffron.ai emails")
            return []
            
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

if __name__ == "__main__":
    phone_numbers = get_unassigned_users_without_heffron()
    
    if phone_numbers:
        # Print comma-separated phone numbers
        print(','.join(phone_numbers))
        print(f"\nTotal unassigned users without heffron.ai emails: {len(phone_numbers)}")
    else:
        print("No phone numbers found for unassigned users without heffron.ai emails")