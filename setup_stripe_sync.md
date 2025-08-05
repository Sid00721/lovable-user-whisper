# Setting Up Stripe Subscription Data Sync

This guide will help you populate Stripe subscription information for your existing users.

## Prerequisites

You'll need to obtain real API keys from:

### 1. Stripe API Key
- Go to [Stripe Dashboard](https://dashboard.stripe.com/apikeys)
- Copy your **Secret Key** (starts with `sk_test_` for test mode or `sk_live_` for live mode)
- Replace `STRIPE_SECRET_KEY="sk_test_placeholder"` in your `.env` file

### 2. Clerk Secret Key (Optional)
- Go to [Clerk Dashboard](https://dashboard.clerk.com/)
- Navigate to API Keys section
- Copy your **Secret Key**
- Replace `CLERK_SECRET_KEY="sk_test_placeholder"` in your `.env` file

### 3. HubSpot Access Token (Optional)
- Go to [HubSpot Developer Portal](https://developers.hubspot.com/)
- Create a private app or use existing one
- Copy the **Access Token**
- Replace `HUBSPOT_ACCESS_TOKEN="pat-placeholder"` in your `.env` file

## How the Sync Works

The sync script will:

1. **Connect to Stripe** - Fetch all customers and their subscription data
2. **Match by Email** - Find corresponding clients in your Supabase database
3. **Update Records** - Populate the subscription columns:
   - `stripe_customer_id`
   - `subscription_status` (active, canceled, past_due, etc.)
   - `subscription_product` (product name from Stripe)
   - `subscription_plan` (plan nickname or ID)
   - `last_payment_date` (last successful payment)

## Running the Sync

Once you've updated your API keys:

```bash
# Set sync mode and run the script
SYNC_TO_SUPABASE=true python scripts/sync_to_supabase.py
```

Or use the dedicated sync script:

```bash
python scripts/sync_subscription_data.py
```

## What to Expect

- The script will process all Stripe customers
- Match them with existing clients by email address
- Update subscription information for matched clients
- Display progress and results

## Safety Notes

- ✅ The script only **updates** existing clients, never creates new ones
- ✅ It only modifies subscription-related columns
- ✅ Non-matching emails are safely ignored
- ✅ All operations are logged for transparency

## Next Steps After Sync

1. **Verify Data** - Run `python check_clients.py` to see updated subscription info
2. **Set Up Webhooks** - Configure Stripe webhooks for real-time updates
3. **Update UI** - The UserForm component will automatically display subscription data
4. **Test Features** - Verify subscription status tracking works correctly