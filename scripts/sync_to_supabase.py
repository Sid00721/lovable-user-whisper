import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from hubspot import HubSpot
import stripe
from typing import Dict, Tuple, Optional
from supabase import create_client, Client

# ------------------------------------------------------------------
#  Helpers
# ------------------------------------------------------------------
def normalise_phone(raw: str) -> str:
    if not raw:
        return ""
    for ch in (" ", "‑", "-", "(", ")", "+"):
        raw = raw.replace(ch, "")
    return raw


# ------------------------------------------------------------------
#  Supabase
# ------------------------------------------------------------------
def get_supabase_client() -> Client:
    """Initialize Supabase client"""
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")  # Use service role for admin operations
    
    if not url or not key:
        raise ValueError("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables")
    
    return create_client(url, key)


def upsert_invoices(supabase: Client, client_id: str, invoices: list):
    """Upsert invoices for a client"""
    if not invoices:
        return

    for inv in invoices:
        try:
            supabase.table('invoices').upsert({
                'id': inv['id'],
                'client_id': client_id,
                'amount_paid': inv['amount_paid'],
                'created_at': inv['created'],
                'status': inv['status'],
                'invoice_pdf': inv['invoice_pdf']
            }).execute()
        except Exception as e:
            # Check if it's a table not found error
            if 'relation "public.invoices" does not exist' in str(e):
                print(f"  ⚠️  Invoices table not found, skipping invoice sync for client {client_id}")
                return  # Exit early if table doesn't exist
            else:
                print(f"  ❌ Error upserting invoice {inv['id']} for client {client_id}: {e}")

def update_client_subscription(supabase: Client, email: str, subscription_data: Tuple[str, str, str, str, list]) -> bool:
    """Update client subscription data in Supabase"""
    status, product, last_paid, plan, invoices = subscription_data
    
    try:
        # Find client by email
        result = supabase.table('clients').select('id').eq('email', email.lower()).execute()
        
        if not result.data:
            print(f"  ⚠️  Client not found for email: {email}")
            return False
        
        client_id = result.data[0]['id']
        
        # Update subscription data
        update_data = {
            'subscription_status': status if status != "Not in Stripe" else None,
            'subscription_product': product if product else None,
            'subscription_plan': plan if plan else None,
            'last_payment_date': last_paid if last_paid else None
        }
        
        supabase.table('clients').update(update_data).eq('id', client_id).execute()
        print(f"  ✅ Updated subscription for {email}: {status}")

        # Upsert invoices
        upsert_invoices(supabase, client_id, invoices)

        return True
        
    except Exception as e:
        print(f"  ❌ Error updating {email}: {e}")
        return False


# ------------------------------------------------------------------
#  Clerk
# ------------------------------------------------------------------
def fetch_all_clerk_contacts() -> Dict[str, Tuple[str, str]]:
    """
    Returns {email: (email, phone)} for every Clerk user.
    """
    print("Fetching users from Clerk...")
    api_key = os.getenv("CLERK_SECRET_KEY")
    headers = {"Authorization": f"Bearer " + api_key, "Content-Type": "application/json"}

    contacts: Dict[str, Tuple[str, str]] = {}
    offset, limit = 0, 100

    while True:
        resp = requests.get(
            "https://api.clerk.com/v1/users",
            headers=headers,
            params={"limit": limit, "offset": offset},
            timeout=30,
        )
        resp.raise_for_status()
        data = resp.json()
        users = data.get("data", []) if isinstance(data, dict) else data

        if not users:
            break

        for u in users:
            email_obj = next(
                (e for e in u.get("email_addresses", [])
                 if e.get("id") == u.get("primary_email_address_id")), None
            )
            phone_obj = next(
                (p for p in u.get("phone_numbers", [])
                 if p.get("id") == u.get("primary_phone_number_id")), None
            )

            email = email_obj.get("email_address", "").lower() if email_obj else ""
            phone = normalise_phone(phone_obj.get("phone_number", "")) if phone_obj else ""

            if email:
                contacts[email] = (email, phone)

        offset += limit
        if len(users) < limit:
            break

    print(f"✅ Fetched {len(contacts)} Clerk users.")
    return contacts


# ------------------------------------------------------------------
#  HubSpot
# ------------------------------------------------------------------
def fetch_all_hubspot_contacts() -> Dict[str, Tuple[str, str]]:
    """
    Returns {email: (email, phone)} for every HubSpot contact.
    """
    print("Fetching contacts from HubSpot...")
    api_key = os.getenv("HUBSPOT_ACCESS_TOKEN")
    if not api_key:
        print("❌ No HUBSPOT_ACCESS_TOKEN found.")
        return {}

    try:
        client = HubSpot(access_token=api_key)
        contacts: Dict[str, Tuple[str, str]] = {}
        
        # Fetch all contacts
        all_contacts = client.crm.contacts.get_all(properties=["email", "phone"])
        
        for contact in all_contacts:
            props = contact.properties
            email = (props.get("email") or "").lower()
            phone = normalise_phone(props.get("phone") or "")
            
            if email:
                contacts[email] = (email, phone)
        
        print(f"✅ Fetched {len(contacts)} HubSpot contacts.")
        return contacts
        
    except Exception as e:
        print(f"❌ HubSpot error: {e}")
        return {}


# ------------------------------------------------------------------
#  Stripe
# ------------------------------------------------------------------
def fetch_all_stripe_summary() -> Dict[str, Tuple[str, str, str, str, list]]:
    """
    Returns {email: (status, product_name, last_paid_str, plan_nick, invoices)}.
    If customer not found or has no subs → ("Not in Stripe", "", "", "", []).
    """
    print("Fetching customers from Stripe...")
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

    summary: Dict[str, Tuple[str, str, str, str, list]] = {}

    try:
        # We have < 300 customers → one paginated loop is enough
        starting_after = None
        while True:
            customers = stripe.Customer.list(limit=100, starting_after=starting_after)
            for cust in customers.data:
                email = (cust.email or "").lower()
                status, product_name, last_paid, plan = "No subscription", "", "", ""

                try:
                    # Get the newest subscription (any status)
                    subs = stripe.Subscription.list(
                        customer=cust.id,
                        limit=3,          # few per customer is plenty
                        expand=["data.latest_invoice"]
                    ).data
                    if subs:
                        # prefer non‑canceled, else newest anyway
                        subs.sort(key=lambda s: s.created, reverse=True)
                        sub = next((s for s in subs if s.status != "canceled"), subs[0])

                        status = sub.status
                        inv = sub.latest_invoice
                        if inv and hasattr(inv, 'paid_at') and inv.paid_at:
                            last_paid = datetime.fromtimestamp(
                                inv.paid_at, tz=timezone.utc
                            ).strftime("%Y-%m-%d")
                        else:
                            last_paid = ""

                        item = sub["items"]["data"][0]["price"]
                        # Get product name by fetching the product separately
                        try:
                            product = stripe.Product.retrieve(item.get("product"))
                            product_name = product.get("name", "")
                        except:
                            product_name = ""
                        plan = item.get("nickname") or item.get("id")

                except Exception as e:
                    print(f"  ⚠️  Error processing customer {email}: {e}")
                    status, product_name, last_paid, plan = "Error", "", "", ""

                invoices = []
                try:
                    customer_invoices = stripe.Invoice.list(customer=cust.id, limit=10)
                    for inv in customer_invoices.data:
                        invoices.append({
                            'id': inv.id,
                            'amount_paid': inv.amount_paid / 100.0,
                            'created': datetime.fromtimestamp(inv.created, tz=timezone.utc).strftime("%Y-%m-%d"),
                            'status': inv.status,
                            'invoice_pdf': inv.invoice_pdf
                        })
                except Exception as e:
                    print(f"  ⚠️  Error fetching invoices for {email}: {e}")

                if email:
                    summary[email] = (status, product_name, last_paid, plan, invoices)

            if not customers.has_more:
                break
            starting_after = customers.data[-1].id

        print(f"✅ Processed {len(summary)} Stripe customers.")
        
    except Exception as e:
        print(f"❌ Stripe error: {e}")
        print("  Continuing without Stripe data...")
        return {}

    return summary


# ------------------------------------------------------------------
#  Main sync function
# ------------------------------------------------------------------
def sync_subscription_data():
    """Sync subscription data from Stripe to Supabase"""
    load_dotenv()
    
    print("🚀 Starting subscription data sync...")
    
    # Initialize Supabase client
    try:
        supabase = get_supabase_client()
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Failed to connect to Supabase: {e}")
        return
    
    # Fetch data from all sources
    clerk = fetch_all_clerk_contacts()
    stripe_summary = fetch_all_stripe_summary()
    
    if not stripe_summary:
        print("❌ No Stripe data available, aborting sync.")
        return
    
    print(f"\n📊 Syncing subscription data for {len(stripe_summary)} customers...")
    
    updated_count = 0
    for email, subscription_data in stripe_summary.items():
        if update_client_subscription(supabase, email, subscription_data):
            updated_count += 1
    
    print(f"\n🎉 Sync complete! Updated {updated_count} client records.")


def main():
    """Main function - can be used for both sync and comparison"""
    load_dotenv()
    
    # Check if we want to sync to Supabase
    sync_mode = os.getenv("SYNC_TO_SUPABASE", "false").lower() == "true"
    
    if sync_mode:
        sync_subscription_data()
    else:
        # Original comparison logic
        clerk = fetch_all_clerk_contacts()
        hubspot = fetch_all_hubspot_contacts()
        stripe_summary = fetch_all_stripe_summary()

        if not clerk or not hubspot:
            print("\nComparison aborted due to an earlier API error.")
            return

        clerk_only = clerk.keys() - hubspot.keys()

        print("\n" + "=" * 80)
        print("                           Clerk Only Users")
        print("=" * 80 + "\n")
        header = f"{'Email':35} 📞 {'Phone':12} 💳 {'Status':10} 🏷️  {'Product':20} 🗓  {'Last Paid':10}  💰  Plan"
        print(header)
        print("-" * len(header))

        # ----- Clerk but not HubSpot -----
        print(f"\n👤 In Clerk ONLY ({len(clerk_only)})")
        for email in sorted(clerk_only):
            _, phone = clerk[email]
            status, product, paid, plan, _ = stripe_summary.get(
                email, ("Not in Stripe", "", "", "", [])
            )
            print(f"{email:35} 📞 {phone or '—':12} 💳 {status:10} 🏷️  {product or '—':20} 🗓  {paid or '—':10}  💰  {plan or '—'}")

        print("\n" + "=" * 80)


if __name__ == "__main__":
    main()