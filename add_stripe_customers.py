#!/usr/bin/env python3
"""
Add Stripe Customer IDs for New Users

This script creates Stripe customers for users who don't have Stripe customer IDs yet
and updates their records in Supabase.

Usage:
    python add_stripe_customers.py

Requirements:
    - STRIPE_SECRET_KEY in .env file
    - VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file
"""

import os
import stripe
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


def create_stripe_customer_and_update(supabase: Client, client):
    """Create a Stripe customer and update the client record"""
    client_id = client['id']
    client_name = client.get('name', 'Unknown')
    email = client.get('email', '')
    
    if not email:
        print(f"  ⚠️  Skipping {client_name} - no email address")
        return False
    
    try:
        # Create Stripe customer
        print(f"  🔄 Creating Stripe customer for {client_name} ({email})...")
        stripe_customer = stripe.Customer.create(
            email=email,
            name=client_name,
            metadata={
                'supabase_client_id': client_id
            }
        )
        
        # Update client record in Supabase
        update_data = {
            'stripe_customer_id': stripe_customer.id
        }
        
        supabase.table('clients').update(update_data).eq('id', client_id).execute()
        print(f"  ✅ Created Stripe customer {stripe_customer.id} for {client_name} ({email})")
        return True
        
    except Exception as e:
        print(f"  ❌ Error creating Stripe customer for {client_name} ({email}): {e}")
        return False


def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Initialize Stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise ValueError("Missing STRIPE_SECRET_KEY environment variable")
    
    print("🚀 Starting Stripe customer creation process...")
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # Get clients without Stripe customer IDs
    clients = get_clients_without_stripe_id(supabase)
    
    if not clients:
        print("\n🎉 All clients already have Stripe customer IDs!")
        return
    
    print(f"\n🔄 Creating Stripe customers for {len(clients)} clients...")
    
    created_count = 0
    error_count = 0
    
    for client in clients:
        if create_stripe_customer_and_update(supabase, client):
            created_count += 1
        else:
            error_count += 1
    
    print(f"\n📊 Results:")
    print(f"  ✅ Created: {created_count} Stripe customers")
    print(f"  ❌ Errors: {error_count} clients")
    
    if created_count > 0:
        print(f"\n💡 Next steps:")
        print(f"  1. Run 'python sync_stripe_data.py' to sync subscription data")
        print(f"  2. Check the dashboard to verify the updates")
    
    print("\n🎉 Process complete!")


if __name__ == "__main__":
    main()