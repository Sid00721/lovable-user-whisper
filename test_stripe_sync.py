#!/usr/bin/env python3
"""
Test Stripe Sync Script

This script demonstrates what the Stripe sync process would look like
with sample data, without requiring real API keys.

Usage:
    python test_stripe_sync.py
"""

import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)


def get_sample_stripe_data():
    """Generate sample Stripe data for demonstration"""
    print("🔄 Generating sample Stripe data for demonstration...")
    
    # Sample data that might match some of your existing clients
    sample_data = {
        "john.doe@example.com": {
            'stripe_customer_id': 'cus_sample123',
            'subscription_status': 'active',
            'subscription_product': 'Pro Plan',
            'subscription_plan': 'monthly',
            'last_payment_date': (datetime.now() - timedelta(days=15)).strftime("%Y-%m-%d")
        },
        "jane.smith@example.com": {
            'stripe_customer_id': 'cus_sample456',
            'subscription_status': 'past_due',
            'subscription_product': 'Basic Plan',
            'subscription_plan': 'yearly',
            'last_payment_date': (datetime.now() - timedelta(days=45)).strftime("%Y-%m-%d")
        },
        "bob.wilson@example.com": {
            'stripe_customer_id': 'cus_sample789',
            'subscription_status': 'canceled',
            'subscription_product': 'Premium Plan',
            'subscription_plan': 'monthly',
            'last_payment_date': (datetime.now() - timedelta(days=90)).strftime("%Y-%m-%d")
        }
    }
    
    print(f"✅ Generated sample data for {len(sample_data)} customers")
    return sample_data


def get_existing_clients(supabase: Client):
    """Fetch existing clients from Supabase"""
    print("🔄 Fetching existing clients from Supabase...")
    
    try:
        result = supabase.table('clients').select('id, name, email').execute()
        clients = {client['email'].lower(): client for client in result.data}
        print(f"✅ Found {len(clients)} existing clients")
        return clients
    except Exception as e:
        print(f"❌ Error fetching clients: {e}")
        raise


def simulate_sync_process(existing_clients: dict, stripe_data: dict):
    """Simulate the sync process without actually updating data"""
    print(f"\n🔄 Simulating sync process...")
    
    matches_found = 0
    no_matches = 0
    
    print("\n📋 Sync Simulation Results:")
    print("-" * 80)
    
    for email, stripe_info in stripe_data.items():
        if email in existing_clients:
            client = existing_clients[email]
            matches_found += 1
            status = stripe_info['subscription_status']
            product = stripe_info['subscription_product']
            print(f"  ✅ WOULD UPDATE: {client['name']} ({email})")
            print(f"     → Status: {status}, Product: {product}")
        else:
            no_matches += 1
            print(f"  ⚠️  NO MATCH: {email} (not found in clients table)")
    
    print("-" * 80)
    print(f"📊 Simulation Summary:")
    print(f"  ✅ Clients that would be updated: {matches_found}")
    print(f"  ⚠️  Stripe customers with no matching client: {no_matches}")
    print(f"  📈 Total existing clients: {len(existing_clients)}")
    
    return matches_found


def show_current_client_status(supabase: Client):
    """Show current subscription status of clients"""
    print("\n📊 Current Client Subscription Status:")
    print("-" * 80)
    
    try:
        result = supabase.table('clients').select(
            'name, email, stripe_customer_id, subscription_status, subscription_product'
        ).limit(10).execute()
        
        for client in result.data:
            name = client['name'] or 'Unknown'
            email = client['email']
            status = client['subscription_status'] or 'No subscription data'
            product = client['subscription_product'] or 'N/A'
            
            print(f"  👤 {name} ({email})")
            print(f"     → Status: {status}, Product: {product}")
        
        if len(result.data) == 10:
            print("  ... (showing first 10 clients)")
            
    except Exception as e:
        print(f"❌ Error fetching client status: {e}")


def main():
    """Main test function"""
    print("🧪 Stripe Sync Test - Demonstration Mode\n")
    
    # Load environment variables
    load_dotenv()
    
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        print("✅ Connected to Supabase")
        
        # Show current status
        show_current_client_status(supabase)
        
        # Get existing clients
        existing_clients = get_existing_clients(supabase)
        
        # Generate sample Stripe data
        stripe_data = get_sample_stripe_data()
        
        # Simulate sync process
        matches = simulate_sync_process(existing_clients, stripe_data)
        
        print(f"\n🎯 What happens with real Stripe data:")
        print(f"  1. The script connects to your Stripe account")
        print(f"  2. Fetches all customers and their subscription info")
        print(f"  3. Matches them with existing clients by email")
        print(f"  4. Updates the subscription columns in Supabase")
        
        print(f"\n🚀 To run the real sync:")
        print(f"  1. Add your real STRIPE_SECRET_KEY to .env file")
        print(f"  2. Run: python sync_stripe_data.py")
        
        print(f"\n📖 For detailed setup instructions:")
        print(f"  See: setup_stripe_sync.md")
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        print("\n🔧 Make sure your Supabase connection is working")


if __name__ == "__main__":
    main()