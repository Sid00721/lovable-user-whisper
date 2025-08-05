# Vercel Deployment Guide

## Environment Variables Setup

When deploying to Vercel, you need to configure the following environment variables in your Vercel dashboard:

### Required Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

### Steps to Deploy

1. **Connect to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select this project

2. **Configure Environment Variables**
   - In the Vercel dashboard, go to your project settings
   - Navigate to "Environment Variables"
   - Add the two required variables from your local `.env` file

3. **Deploy**
   - Vercel will automatically detect this as a Vite project
   - The build command will be `vite build`
   - The output directory will be `dist`
   - Click "Deploy"

### Build Configuration

The project includes:
- `vercel.json` for proper SPA routing
- Optimized build scripts in `package.json`
- Clean environment variables (unused ones removed)

### Notes

- The app uses client-side routing, so the `vercel.json` ensures all routes redirect to `index.html`
- Only essential environment variables are included for security
- The hardcoded authentication system will work as-is on Vercel