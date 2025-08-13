import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_unassigned_users_phones():
    """
    Get phone numbers of all users who are not assigned to any employee
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
        # This means their employee_id is NULL
        response = supabase.table('clients').select(
            'id, name, email, phone, employee_id'
        ).is_('employee_id', 'null').execute()
        
        if response.data:
            unassigned_users = response.data
            print(f"Found {len(unassigned_users)} unassigned users")
            print("\nUnassigned Users:")
            print("-" * 50)
            
            phone_numbers = []
            
            for user in unassigned_users:
                name = user.get('name', 'N/A')
                email = user.get('email', 'N/A')
                phone = user.get('phone', '')
                
                print(f"Name: {name}")
                print(f"Email: {email}")
                print(f"Phone: {phone if phone else 'No phone number'}")
                print("-" * 30)
                
                # Add phone number to list if it exists and is not empty
                if phone and phone.strip():
                    phone_numbers.append(phone.strip())
            
            # Print comma-separated phone numbers
            if phone_numbers:
                print(f"\nPhone numbers (comma-separated):")
                print(",".join(phone_numbers))
                print(f"\nTotal phone numbers: {len(phone_numbers)}")
            else:
                print("\nNo phone numbers found for unassigned users.")
                
        else:
            print("No unassigned users found.")
            
    except Exception as e:
        print(f"Error fetching unassigned users: {str(e)}")

if __name__ == "__main__":
    get_unassigned_users_phones()