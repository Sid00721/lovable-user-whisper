#!/usr/bin/env python3
"""
Manually Add Stripe Customer IDs

This script allows you to manually add Stripe customer IDs for users
after creating them in the Stripe dashboard.

Usage:
    python manual_add_stripe_ids.py

Requirements:
    - VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file
"""

import os
from dotenv import load_dotenv
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)


def get_clients_without_stripe_id(supabase: Client):
    """Fetch clients who don't have Stripe customer IDs"""
    print("🔄 Fetching clients without Stripe customer IDs...")
    try:
        result = supabase.table('clients').select('id, name, email, stripe_customer_id').is_('stripe_customer_id', 'null').execute()
        if result.data:
            print(f"✅ Found {len(result.data)} clients without Stripe customer IDs.")
            return result.data
        else:
            print("  ✅ All clients already have Stripe customer IDs.")
            return []
    except Exception as e:
        print(f"❌ Error fetching clients from Supabase: {e}")
        raise


def update_stripe_customer_id(supabase: Client, client_id: str, stripe_customer_id: str):
    """Update a client's Stripe customer ID"""
    try:
        update_data = {'stripe_customer_id': stripe_customer_id}
        supabase.table('clients').update(update_data).eq('id', client_id).execute()
        return True
    except Exception as e:
        print(f"❌ Error updating client: {e}")
        return False


def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    print("🚀 Manual Stripe Customer ID Assignment")
    print("="*50)
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # Get clients without Stripe customer IDs
    clients = get_clients_without_stripe_id(supabase)
    
    if not clients:
        print("\n🎉 All clients already have Stripe customer IDs!")
        return
    
    print("\n📋 Clients without Stripe customer IDs:")
    for i, client in enumerate(clients, 1):
        print(f"  {i}. {client['name']} ({client['email']})")
    
    print("\n💡 Instructions:")
    print("1. Go to your Stripe Dashboard (https://dashboard.stripe.com/customers)")
    print("2. Create customers for the users listed above using their email addresses")
    print("3. Copy the customer IDs (they start with 'cus_')")
    print("4. Enter them below when prompted")
    print("\n" + "="*50)
    
    updated_count = 0
    
    for client in clients:
        print(f"\n👤 Client: {client['name']} ({client['email']})")
        
        while True:
            stripe_id = input("Enter Stripe Customer ID (or 'skip' to skip): ").strip()
            
            if stripe_id.lower() == 'skip':
                print("  ⏭️  Skipped")
                break
            
            if not stripe_id:
                print("  ⚠️  Please enter a valid Stripe Customer ID or 'skip'")
                continue
            
            if not stripe_id.startswith('cus_'):
                print("  ⚠️  Stripe Customer IDs should start with 'cus_'")
                continue
            
            if update_stripe_customer_id(supabase, client['id'], stripe_id):
                print(f"  ✅ Updated {client['name']} with Stripe ID: {stripe_id}")
                updated_count += 1
                break
            else:
                print("  ❌ Failed to update. Please try again.")
    
    print(f"\n📊 Results:")
    print(f"  ✅ Updated: {updated_count} clients")
    
    if updated_count > 0:
        print(f"\n💡 Next steps:")
        print(f"  1. Run 'python sync_stripe_data.py' to sync subscription data")
        print(f"  2. Check the dashboard to verify the updates")
    
    print("\n🎉 Process complete!")


if __name__ == "__main__":
    main()