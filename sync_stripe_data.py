#!/usr/bin/env python3
"""
Stripe Subscription Data Sync Script

This script fetches subscription data from Stripe and updates existing clients
in your Supabase database with their subscription information.

Usage:
    python sync_stripe_data.py

Requirements:
    - STRIPE_SECRET_KEY in .env file
    - VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env file
"""

import os
import stripe
from datetime import datetime, timezone
from dotenv import load_dotenv
from supabase import create_client, Client


def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)


def get_clients_from_supabase(supabase: Client):
    """Fetch all clients from Supabase"""
    print("🔄 Fetching clients from Supabase...")
    try:
        result = supabase.table('clients').select('id, name, email, stripe_customer_id').execute()
        if result.data:
            print(f"✅ Found {len(result.data)} clients in Supabase.")
            return result.data
        else:
            print("  ⚠️ No clients found in Supabase.")
            return []
    except Exception as e:
        print(f"❌ Error fetching clients from Supabase: {e}")
        raise


def sync_stripe_data_for_clients(supabase: Client, clients: list):
    """Update existing clients in Supabase with Stripe subscription data"""
    print(f"\n🔄 Updating clients with Stripe data...")
    
    updated_count = 0
    not_found_count = 0
    error_count = 0
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    for client in clients:
        client_id = client['id']
        stripe_customer_id = client.get('stripe_customer_id')
        client_name = client.get('name', 'Unknown')
        email = client.get('email', 'No email')

        if not stripe_customer_id:
            print(f"  ℹ️  Skipping {client_name} ({email}) - no Stripe customer ID.")
            not_found_count += 1
            continue

        try:
            # Fetch subscription data from Stripe
            subscriptions = stripe.Subscription.list(customer=stripe_customer_id, limit=10).data

            if not subscriptions:
                print(f"  ℹ️  No subscriptions found for {client_name} ({email}) in Stripe.")
                continue

            # Get the most recent active subscription, or the most recent one
            active_subs = [s for s in subscriptions if s.status in ['active', 'trialing', 'past_due']]
            sub = active_subs[0] if active_subs else subscriptions[0]

            # Prepare data for update
            update_data = {'subscription_status': sub['status']}

            # Get product and plan info
            if sub['items']['data']:
                price = sub['items']['data'][0]['price']
                update_data['subscription_plan'] = price['nickname'] or price['id']
                if price['product']:
                    try:
                        product = stripe.Product.retrieve(price['product'])
                        update_data['subscription_product'] = product.name
                    except Exception as e:
                        print(f"      ⚠️  Could not retrieve product {price['product']}: {e}")
                        update_data['subscription_product'] = price['product']

            # Get last payment date
            if sub['latest_invoice']:
                try:
                    invoice = stripe.Invoice.retrieve(sub['latest_invoice'])
                    if invoice.status_transitions and invoice.status_transitions.paid_at:
                        update_data['last_payment_date'] = datetime.fromtimestamp(
                            invoice.status_transitions.paid_at, tz=timezone.utc
                        ).strftime("%Y-%m-%d")
                except Exception as e:
                    print(f"      ⚠️  Could not retrieve invoice {sub['latest_invoice']}: {e}")

            # Update client in Supabase
            supabase.table('clients').update(update_data).eq('id', client_id).execute()
            print(f"  ✅ Synced {client_name} ({email}): {update_data.get('subscription_status')}")
            updated_count += 1

        except Exception as e:
            print(f"  ❌ Error syncing data for {client_name} ({email}): {e}")
            error_count += 1
    
    print(f"\n📊 Sync Results:")
    print(f"  ✅ Updated: {updated_count} clients")
    print(f"  ⚠️  Not found: {not_found_count} emails")
    print(f"  ❌ Errors: {error_count} clients")
    
    return updated_count


def sync_invoices(supabase: Client):
    """Fetch all Stripe invoices and sync them to the Supabase invoices table."""
    print("\n\n---\n🔄 Syncing Stripe invoices...")

    # 1. Get all clients from Supabase to map stripe_customer_id to client_id
    clients_result = supabase.table('clients').select('id, stripe_customer_id').neq('stripe_customer_id', 'null').execute()
    if not clients_result.data:
        print("  ⚠️ No clients with Stripe customer IDs found in Supabase.")
        return

    client_map = {client['stripe_customer_id']: client['id'] for client in clients_result.data}
    print(f"  Found {len(client_map)} clients with Stripe IDs.")

    # 2. Fetch invoices from Stripe and upsert to Supabase
    total_invoices_synced = 0
    error_count = 0
    
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    for stripe_customer_id, client_id in client_map.items():
        try:
            # Fetch only paid invoices from Stripe to be more efficient
            invoices = stripe.Invoice.list(
                customer=stripe_customer_id,
                status='paid',
                limit=100
            )

            for invoice in invoices.data:
                 # Only sync invoices related to subscriptions, not one-off charges
                 if invoice.billing_reason not in ['subscription_create', 'subscription_cycle']:
                     continue

                 try:
                     # Check if invoice already exists to prevent duplicates
                     result = supabase.table('invoices').select('id').eq('stripe_invoice_id', invoice.id).execute()
                     if result.data:
                         continue  # Skip if invoice is already synced

                     # Call the RPC function to insert the invoice
                     supabase.rpc('insert_invoice', {
                         'p_client_id': client_id,
                         'p_stripe_invoice_id': invoice.id,
                         'p_amount_paid': invoice.amount_paid / 100.0,
                         'p_created_at': datetime.fromtimestamp(invoice.created, tz=timezone.utc).isoformat(),
                         'p_status': invoice.status,
                         'p_invoice_pdf': invoice.invoice_pdf
                     }).execute()
                     
                     total_invoices_synced += 1

                 except Exception as e:
                     print(f"    ❌ Error inserting invoice {invoice.id} for {stripe_customer_id}: {e}")
                     error_count += 1

        except Exception as e:
            print(f"  ❌ Error syncing invoices for Stripe customer {stripe_customer_id}: {e}")
            error_count += 1

    print("\n📊 Invoice Sync Results:")
    print(f"  ✅ Synced: {total_invoices_synced} invoices")
    print(f"  ❌ Errors: {error_count} clients")

def main():
    """Main sync function"""
    print("🚀 Starting Stripe subscription data sync...\n")
    
    # Load environment variables
    load_dotenv()
    
    try:
        # Initialize Supabase client
        supabase = get_supabase_client()
        print("✅ Connected to Supabase")
        
        # 1. Get clients from our database
        clients = get_clients_from_supabase(supabase)
        if not clients:
            return

        # 2. Sync subscription data for those clients
        updated_count = sync_stripe_data_for_clients(supabase, clients)

        # 3. Sync invoices for all clients with a stripe_customer_id
        sync_invoices(supabase)
        
        print(f"\n🎉 Sync complete! Successfully updated {updated_count} client records.")
        print("\n💡 Next steps:")
        print("  1. Run 'python check_clients.py' to verify the updates")
        print("  2. Set up Stripe webhooks for real-time updates")
        print("  3. Test the subscription features in your UI")
        
    except Exception as e:
        print(f"❌ Sync failed: {e}")
        print("\n🔧 Troubleshooting:")
        print("  1. Check your .env file has real API keys (not placeholders)")
        print("  2. Verify your Stripe account has customers")
        print("  3. Ensure your Supabase database is accessible")


if __name__ == "__main__":
    main()