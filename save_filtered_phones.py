import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Initialize Supabase client
url: str = os.environ.get("VITE_SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")
supabase: Client = create_client(url, key)

def save_filtered_phone_numbers():
    """Save phone numbers of unassigned users without heffron.ai emails to a file"""
    try:
        # Query for unassigned users (employee_id is NULL) who don't have heffron.ai emails
        response = supabase.table('clients').select('phone').is_('employee_id', 'null').not_.like('email', '%heffron.ai%').execute()
        
        if response.data:
            # Extract phone numbers and filter out None/empty values
            phone_numbers = [user['phone'] for user in response.data if user['phone']]
            
            # Save to file
            with open('filtered_unassigned_phone_numbers.txt', 'w') as f:
                f.write(','.join(phone_numbers))
            
            print(f"Saved {len(phone_numbers)} phone numbers to filtered_unassigned_phone_numbers.txt")
            return phone_numbers
        else:
            print("No unassigned users found without heffron.ai emails")
            return []
            
    except Exception as e:
        print(f"Error fetching data: {e}")
        return []

if __name__ == "__main__":
    phone_numbers = save_filtered_phone_numbers()