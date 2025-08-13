import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_unassigned_phones_only():
    """
    Get phone numbers of all users who are not assigned to any employee
    Output only the comma-separated phone numbers
    """
    # Initialize Supabase client
    url = os.getenv('VITE_SUPABASE_URL')
    key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not url or not key:
        print("Error: Missing Supabase credentials in .env file")
        return
    
    supabase: Client = create_client(url, key)
    
    try:
        # Query to get all clients who are not assigned to any employee
        response = supabase.table('clients').select(
            'phone'
        ).is_('employee_id', 'null').execute()
        
        if response.data:
            phone_numbers = []
            
            for user in response.data:
                phone = user.get('phone', '')
                # Add phone number to list if it exists and is not empty
                if phone and phone.strip():
                    phone_numbers.append(phone.strip())
            
            # Print comma-separated phone numbers
            if phone_numbers:
                print(",".join(phone_numbers))
                print(f"\nTotal: {len(phone_numbers)} phone numbers")
            else:
                print("No phone numbers found for unassigned users.")
                
        else:
            print("No unassigned users found.")
            
    except Exception as e:
        print(f"Error: {str(e)}")

if __name__ == "__main__":
    get_unassigned_phones_only()