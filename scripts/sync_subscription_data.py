import os
import requests
from datetime import datetime, timezone
from dotenv import load_dotenv
from hubspot import HubSpot
import stripe
from typing import Dict, Tuple

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
                 if e["id"] == u.get("primary_email_address_id")),
                None)
            email = (email_obj or {}).get("email_address", "").lower()

            phone_obj = next(
                (p for p in u.get("phone_numbers", [])
                 if p["id"] == u.get("primary_phone_number_id")),
                None)
            phone = normalise_phone((phone_obj or {}).get("phone_number"))

            if email:
                contacts[email] = (email, phone)

        offset += limit
        print(f"  Fetched {len(users)} users (offset → {offset})")

    print(f"✅ Found {len(contacts)} Clerk users.")
    return contacts


# ------------------------------------------------------------------
#  HubSpot
# ------------------------------------------------------------------
def fetch_all_hubspot_contacts() -> Dict[str, Tuple[str, str]]:
    """
    Returns {email: (email, phone)} for every HubSpot contact.
    """
    print("Fetching contacts from HubSpot...")
    client = HubSpot(access_token=os.getenv("HUBSPOT_ACCESS_TOKEN"))

    contacts: Dict[str, Tuple[str, str]] = {}
    try:
        for c in client.crm.contacts.get_all(
            properties=["email", "phone", "mobilephone"]
        ):
            email = (c.properties.get("email") or "").lower()
            phone = normalise_phone(
                c.properties.get("phone") or c.properties.get("mobilephone") or ""
            )
            if email:
                contacts[email] = (email, phone)
    except Exception as e:
        print(f"❌ HubSpot error: {e}")
        return {}

    print(f"✅ Found {len(contacts)} HubSpot contacts.")
    return contacts


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
#  Comparison + output
# ------------------------------------------------------------------
def main():
    load_dotenv()

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