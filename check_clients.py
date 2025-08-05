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

def check_clients_subscription_data():
    """Check clients table for subscription information"""
    supabase = get_supabase_client()
    
    try:
        # Get all clients with their subscription data
        result = supabase.table('clients').select(
            'id, name, email, stripe_customer_id, subscription_status, subscription_product, subscription_plan, last_payment_date'
        ).execute()
        
        if result.data:
            print(f"Found {len(result.data)} clients:")
            print("\n" + "="*100)
            
            clients_with_stripe = 0
            clients_without_stripe = 0
            
            for client in result.data:
                print(f"ID: {client['id']}")
                print(f"Name: {client['name']}")
                print(f"Email: {client['email']}")
                print(f"Stripe Customer ID: {client['stripe_customer_id'] or 'None'}")
                print(f"Subscription Status: {client['subscription_status'] or 'None'}")
                print(f"Subscription Product: {client['subscription_product'] or 'None'}")
                print(f"Subscription Plan: {client['subscription_plan'] or 'None'}")
                print(f"Last Payment Date: {client['last_payment_date'] or 'None'}")
                
                if client['stripe_customer_id']:
                    clients_with_stripe += 1
                else:
                    clients_without_stripe += 1
                    
                print("-" * 100)
            
            print(f"\nSummary:")
            print(f"Clients with Stripe data: {clients_with_stripe}")
            print(f"Clients without Stripe data: {clients_without_stripe}")
            
        else:
            print("No clients found in the database.")
            
    except Exception as e:
        print(f"Error querying clients: {e}")

if __name__ == "__main__":
    check_clients_subscription_data()