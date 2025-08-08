#!/usr/bin/env python3
"""
Find Existing Stripe Customers by Email

This script searches for existing Stripe customers by email address
and updates the client records with their Stripe customer IDs.

Usage:
    python find_stripe_customers.py

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
        # Get clients with null stripe_customer_id
        result_null = supabase.table('clients').select('id, name, email, stripe_customer_id').is_('stripe_customer_id', 'null').execute()
        # Get clients with empty string stripe_customer_id
        result_empty = supabase.table('clients').select('id, name, email, stripe_customer_id').eq('stripe_customer_id', '').execute()
        
        # Combine both results
        all_clients = []
        if result_null.data:
            all_clients.extend(result_null.data)
        if result_empty.data:
            all_clients.extend(result_empty.data)
            
        if all_clients:
            print(f"✅ Found {len(all_clients)} clients without Stripe customer IDs.")
            return all_clients
        else:
            print("  ✅ All clients already have Stripe customer IDs.")
            return []
    except Exception as e:
        print(f"❌ Error fetching clients from Supabase: {e}")
        raise


def find_stripe_customer_by_email(email: str):
    """Search for a Stripe customer by email address"""
    try:
        customers = stripe.Customer.list(email=email, limit=1)
        if customers.data:
            return customers.data[0]
        return None
    except Exception as e:
        print(f"  ❌ Error searching for customer with email {email}: {e}")
        return None


def update_client_stripe_id(supabase: Client, client_id: str, stripe_customer_id: str):
    """Update a client's Stripe customer ID"""
    try:
        update_data = {'stripe_customer_id': stripe_customer_id}
        supabase.table('clients').update(update_data).eq('id', client_id).execute()
        return True
    except Exception as e:
        print(f"  ❌ Error updating client: {e}")
        return False


def main():
    """Main function"""
    # Load environment variables
    load_dotenv()
    
    # Initialize Stripe
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    if not stripe.api_key:
        raise ValueError("Missing STRIPE_SECRET_KEY environment variable")
    
    print("🚀 Searching for existing Stripe customers...")
    
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # Get clients without Stripe customer IDs
    clients = get_clients_without_stripe_id(supabase)
    
    if not clients:
        print("\n🎉 All clients already have Stripe customer IDs!")
        return
    
    print(f"\n🔍 Searching Stripe for {len(clients)} clients...")
    
    found_count = 0
    not_found_count = 0
    error_count = 0
    
    for client in clients:
        client_id = client['id']
        client_name = client.get('name', 'Unknown')
        email = client.get('email', '')
        
        if not email:
            print(f"  ⚠️  Skipping {client_name} - no email address")
            not_found_count += 1
            continue
        
        print(f"  🔍 Searching for {client_name} ({email})...")
        
        # Search for existing Stripe customer
        stripe_customer = find_stripe_customer_by_email(email)
        
        if stripe_customer:
            print(f"    ✅ Found Stripe customer: {stripe_customer.id}")
            
            # Update client record
            if update_client_stripe_id(supabase, client_id, stripe_customer.id):
                print(f"    ✅ Updated {client_name} with Stripe ID: {stripe_customer.id}")
                found_count += 1
            else:
                error_count += 1
        else:
            print(f"    ❌ No Stripe customer found for {email}")
            not_found_count += 1
    
    print(f"\n📊 Results:")
    print(f"  ✅ Found and updated: {found_count} clients")
    print(f"  ❌ Not found in Stripe: {not_found_count} clients")
    print(f"  ❌ Errors: {error_count} clients")
    
    if found_count > 0:
        print(f"\n💡 Next steps:")
        print(f"  1. Run 'python sync_stripe_data.py' to sync subscription data")
        print(f"  2. Check the dashboard to verify the updates")
    
    if not_found_count > 0:
        print(f"\n⚠️  Note: {not_found_count} clients were not found in Stripe.")
        print(f"  They may need to be created manually in Stripe first.")
    
    print("\n🎉 Search complete!")


if __name__ == "__main__":
    main()