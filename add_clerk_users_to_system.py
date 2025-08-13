import os
import requests
from supabase import create_client, Client
import re
from typing import Optional, Dict, Any
from dotenv import load_dotenv
from datetime import datetime, timezone

# Load environment variables from .env file
load_dotenv()

def normalize_phone_number(phone: str) -> Optional[str]:
    """Normalize phone number to E.164 format"""
    if not phone:
        return None
    
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    
    # If it starts with 1 and has 11 digits, it's likely US/Canada
    if len(digits_only) == 11 and digits_only.startswith('1'):
        return f"+{digits_only}"
    # If it has 10 digits, assume US/Canada and add +1
    elif len(digits_only) == 10:
        return f"+1{digits_only}"
    # If it already looks international (starts with country code)
    elif len(digits_only) > 10:
        return f"+{digits_only}"
    
    return None

def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv('SUPABASE_URL')
    key = os.getenv('SUPABASE_ANON_KEY')
    
    if not url or not key:
        raise ValueError("SUPABASE_URL and SUPABASE_ANON_KEY environment variables are required")
    
    return create_client(url, key)

def fetch_all_clerk_users() -> list:
    """Fetch all users from Clerk with pagination"""
    clerk_secret_key = os.getenv('CLERK_SECRET_KEY')
    if not clerk_secret_key:
        raise ValueError("CLERK_SECRET_KEY environment variable is required")
    
    headers = {
        'Authorization': f'Bearer {clerk_secret_key}',
        'Content-Type': 'application/json'
    }
    
    all_users = []
    offset = 0
    limit = 100
    
    while True:
        url = f'https://api.clerk.com/v1/users?limit={limit}&offset={offset}'
        response = requests.get(url, headers=headers)
        
        if response.status_code != 200:
            print(f"Error fetching users: {response.status_code} - {response.text}")
            break
        
        data = response.json()
        
        # Handle different response formats
        if isinstance(data, list):
            users = data
        else:
            users = data.get('data', [])
        
        if not users:
            break
        
        all_users.extend(users)
        offset += limit
        
        print(f"Fetched {len(users)} users (total: {len(all_users)})")
        
        # Check if we've reached the end
        if len(users) < limit:
            break
    
    return all_users

def add_clerk_user_to_supabase(supabase: Client, user: Dict[Any, Any]) -> bool:
    """Add a single Clerk user to Supabase clients table"""
    try:
        # Extract user data
        clerk_id = user.get('id')
        first_name = user.get('first_name', '')
        last_name = user.get('last_name', '')
        name = f"{first_name} {last_name}".strip() or 'Unknown'
        
        # Get primary email
        email_addresses = user.get('email_addresses', [])
        primary_email = None
        for email_obj in email_addresses:
            if email_obj.get('id') == user.get('primary_email_address_id'):
                primary_email = email_obj.get('email_address')
                break
        
        if not primary_email and email_addresses:
            primary_email = email_addresses[0].get('email_address')
        
        # Get primary phone
        phone_numbers = user.get('phone_numbers', [])
        primary_phone = None
        for phone_obj in phone_numbers:
            if phone_obj.get('id') == user.get('primary_phone_number_id'):
                primary_phone = phone_obj.get('phone_number')
                break
        
        if not primary_phone and phone_numbers:
            primary_phone = phone_numbers[0].get('phone_number')
        
        # Normalize phone number
        normalized_phone = normalize_phone_number(primary_phone) if primary_phone else None
        
        if not primary_email:
            print(f"Skipping user {clerk_id}: No email address found")
            return False
        
        # Check if user already exists
        existing_user = supabase.table('clients').select('*').eq('clerk_id', clerk_id).execute()
        if existing_user.data:
            print(f"User {primary_email} already exists in database")
            return False
        
        # Convert Clerk timestamp to ISO format
        created_at = user.get('created_at')
        if created_at and isinstance(created_at, (int, str)):
            try:
                # Clerk timestamps are in milliseconds
                timestamp_ms = int(created_at)
                created_at_iso = datetime.fromtimestamp(timestamp_ms / 1000, tz=timezone.utc).isoformat()
            except (ValueError, TypeError):
                created_at_iso = None
        else:
            created_at_iso = None
        
        # Prepare user data for insertion
        user_data = {
            'clerk_id': clerk_id,
            'name': name,
            'email': primary_email,
            'phone': normalized_phone,
            'created_at': created_at_iso
        }
        
        # Insert user into Supabase
        result = supabase.table('clients').insert(user_data).execute()
        
        if result.data:
            print(f"Successfully added user: {primary_email}")
            return True
        else:
            print(f"Failed to add user: {primary_email}")
            return False
            
    except Exception as e:
        print(f"Error adding user {user.get('id', 'unknown')}: {str(e)}")
        return False

def main():
    """Main function to add all Clerk users to Supabase"""
    try:
        print("Starting Clerk users sync to Supabase...")
        
        # Initialize Supabase client
        supabase = get_supabase_client()
        print("Connected to Supabase")
        
        # Fetch all Clerk users
        print("Fetching all users from Clerk...")
        clerk_users = fetch_all_clerk_users()
        print(f"Found {len(clerk_users)} users in Clerk")
        
        if not clerk_users:
            print("No users found in Clerk")
            return
        
        # Add users to Supabase
        print("Adding users to Supabase...")
        added_count = 0
        skipped_count = 0
        
        for user in clerk_users:
            if add_clerk_user_to_supabase(supabase, user):
                added_count += 1
            else:
                skipped_count += 1
        
        print(f"\nSync completed!")
        print(f"Added: {added_count} users")
        print(f"Skipped: {skipped_count} users")
        print(f"Total processed: {len(clerk_users)} users")
        
    except Exception as e:
        print(f"Error in main function: {str(e)}")
        raise

if __name__ == "__main__":
    main()