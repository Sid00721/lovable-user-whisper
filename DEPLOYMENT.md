# Voqo CRM - Vercel Deployment Guide

## Prerequisites

1. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
2. **Clerk Account**: Sign up at [clerk.com](https://clerk.com)
3. **GitHub Repository**: Push your code to GitHub

## Step 1: Environment Setup

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your environment variables in `.env`:
   ```env
   # Get these from your Clerk Dashboard
   VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_clerk_publishable_key_here
   CLERK_SECRET_KEY=sk_test_your_clerk_secret_key_here
   
   # Set a secure admin password for CRM access
   VITE_ADMIN_PASSWORD=your_secure_admin_password_here
   
   # This will be your Vercel deployment URL (update after deployment)
   VITE_BACKEND_URL=https://your-app-name.vercel.app
   ```

## Step 2: Deploy to Vercel

### Option A: Deploy via Vercel Dashboard

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "New Project"
3. Import your GitHub repository
4. Configure the project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./` (leave as default)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

5. Add Environment Variables in Vercel:
   - Go to Project Settings → Environment Variables
   - Add all variables from your `.env` file
   - Make sure to add them for all environments (Production, Preview, Development)

6. Deploy the project

### Option B: Deploy via Vercel CLI

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy:
   ```bash
   vercel
   ```

4. Follow the prompts and add environment variables when asked

## Step 3: Configure Clerk Webhook

1. **Get your deployment URL** from Vercel (e.g., `https://your-app-name.vercel.app`)

2. **Update your `.env` file** with the actual Vercel URL:
   ```env
   VITE_BACKEND_URL=https://your-app-name.vercel.app
   ```

3. **Configure Clerk Webhook**:
   - Go to your [Clerk Dashboard](https://dashboard.clerk.com)
   - Navigate to "Webhooks" in the sidebar
   - Click "Add Endpoint"
   - Set the endpoint URL to: `https://your-app-name.vercel.app/api/clerk-webhooks`
   - Select the following events:
     - `user.created`
   - Click "Create"

4. **Test the webhook**:
   - Create a test user in your Clerk Dashboard
   - Check your CRM to see if the user appears automatically

## Step 4: Access Your CRM

1. **Visit your deployed CRM**: `https://your-app-name.vercel.app`

2. **Login with your admin password** (the one you set in `VITE_ADMIN_PASSWORD`)

3. **Test the integration**:
   - The CRM should be accessible after login
   - New Clerk signups should automatically appear in the CRM
   - You can use the "Simulate Clerk Signup" button to test the webhook functionality

## Step 5: Production Configuration

### Security Considerations

1. **Use strong passwords**: Make sure your `VITE_ADMIN_PASSWORD` is secure
2. **Environment variables**: Never commit `.env` files to your repository
3. **Webhook security**: Consider adding webhook signature verification for production

### Monitoring

1. **Vercel Functions**: Monitor your API endpoints in the Vercel dashboard
2. **Clerk Dashboard**: Monitor webhook delivery status in Clerk
3. **Error tracking**: Consider adding error tracking (Sentry, LogRocket, etc.)

## Troubleshooting

### Common Issues

1. **"Cannot find module" errors**:
   - Make sure all dependencies are in `package.json`
   - Run `npm install` locally to verify

2. **Environment variables not working**:
   - Verify they're set in Vercel dashboard
   - Make sure they're added to all environments
   - Redeploy after adding new environment variables

3. **Webhook not receiving data**:
   - Check the webhook URL in Clerk dashboard
   - Verify the endpoint is accessible: `https://your-app-name.vercel.app/api/clerk-webhooks`
   - Check Vercel function logs for errors

4. **Login not working**:
   - Verify `VITE_ADMIN_PASSWORD` is set correctly
   - Clear browser localStorage and try again

### Useful Commands

```bash
# Test webhook locally
node backend/test-clerk-webhook.js

# Check Vercel deployment status
vercel ls

# View Vercel function logs
vercel logs

# Redeploy
vercel --prod
```

## Support

If you encounter issues:

1. Check Vercel function logs in the dashboard
2. Verify all environment variables are set correctly
3. Test the webhook endpoint manually
4. Check Clerk webhook delivery logs

---

**Your CRM is now live and ready to receive Clerk signups automatically!** 🚀