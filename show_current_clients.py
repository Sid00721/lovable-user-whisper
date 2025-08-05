import os
from dotenv import load_dotenv
from supabase import create_client, Client

def get_supabase_client():
    load_dotenv()
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)

def show_current_clients():
    """Show current clients in the database"""
    supabase = get_supabase_client()
    
    try:
        # Get all clients with existing columns
        result = supabase.table('clients').select(
            'id, name, email, company, phone, priority, is_using_platform, referred_by, last_contact, created_at'
        ).execute()
        
        if result.data:
            print(f"Found {len(result.data)} clients in the database:")
            print("\n" + "="*120)
            
            for i, client in enumerate(result.data, 1):
                print(f"Client {i}:")
                print(f"  ID: {client['id']}")
                print(f"  Name: {client['name']}")
                print(f"  Email: {client['email']}")
                print(f"  Company: {client['company'] or 'N/A'}")
                print(f"  Phone: {client['phone'] or 'N/A'}")
                print(f"  Priority: {client['priority'] or 'N/A'}")
                print(f"  Using Platform: {client['is_using_platform']}")
                print(f"  Referred By: {client['referred_by'] or 'N/A'}")
                print(f"  Last Contact: {client['last_contact'] or 'N/A'}")
                print(f"  Created At: {client['created_at']}")
                print("-" * 120)
            
            print(f"\n📋 Current Database Schema:")
            print("The clients table currently has these columns:")
            print("- id (uuid)")
            print("- clerk_id (text)")
            print("- name (text)")
            print("- email (text)")
            print("- company (text)")
            print("- phone (text)")
            print("- priority (text)")
            print("- is_using_platform (boolean)")
            print("- referred_by (text)")
            print("- last_contact (date)")
            print("- employee_id (uuid)")
            print("- created_at (timestamp with time zone)")
            print("- notes (text)")
            print("- commission_approved (boolean)")
            print("- is_upsell_opportunity (boolean)")
            
            print(f"\n🔄 Subscription Columns to be Added:")
            print("The following columns need to be added for subscription management:")
            print("- stripe_customer_id (text) - Stripe customer ID for subscription management")
            print("- subscription_status (text) - Current subscription status (active, canceled, past_due, etc.)")
            print("- subscription_product (text) - Name of the subscribed product")
            print("- subscription_plan (text) - Subscription plan identifier or nickname")
            print("- last_payment_date (date) - Date of the last successful payment")
            
            print(f"\n⚠️  Note: The subscription columns migration was applied locally but needs to be applied to the remote database.")
            print("This requires database owner permissions or using Supabase CLI with proper authentication.")
            
        else:
            print("No clients found in the database.")
            
    except Exception as e:
        print(f"Error querying clients: {e}")

if __name__ == "__main__":
    show_current_clients()