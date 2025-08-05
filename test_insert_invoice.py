import os
from dotenv import load_dotenv
from supabase import create_client, Client
from datetime import datetime, timezone
import uuid

def main():
    load_dotenv()
    
    url = os.getenv("VITE_SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    
    if not url or not key:
        print("❌ Missing Supabase credentials in .env file")
        return
        
    supabase: Client = create_client(url, key)
    
    print("🔄 Fetching a client from Supabase...")
    try:
        result = supabase.table('clients').select('id').limit(1).execute()
        if not result.data:
            print("❌ No clients found in Supabase. Please add a client to test.")
            return
        client_id = result.data[0]['id']
        print(f"✅ Using client_id: {client_id}")
    except Exception as e:
        print(f"❌ Error fetching client: {e}")
        return

    print("\n🔄 Attempting to insert a test invoice via RPC...")
    
    test_invoice_data = {
        'p_client_id': client_id,
        'p_stripe_invoice_id': f"test_in_{uuid.uuid4()}",
        'p_amount_paid': 99.99,
        'p_created_at': datetime.now(timezone.utc).isoformat(),
        'p_status': 'paid',
        'p_invoice_pdf': 'https://example.com/invoice.pdf'
    }

    try:
        result = supabase.rpc('insert_invoice', test_invoice_data).execute()
        print("✅ RPC call executed.")
        # The result object from a successful RPC call might not have 'data' or 'error' fields
        # in the same way a query does. We should inspect the whole object.
        print(f"  RPC Response: {result}")
        # A non-2xx status code in the response usually indicates an error.
        if hasattr(result, 'status_code') and not (200 <= result.status_code < 300):
             print("❌ Invoice insertion failed! Check the response for details.")
        else:
             print("✅ Invoice insertion seems successful!")

    except Exception as e:
        print(f"❌ An exception occurred during the RPC call: {e}")

if __name__ == "__main__":
    main()