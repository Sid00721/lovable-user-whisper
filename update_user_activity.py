#!/usr/bin/env python3
"""
Script to update user activity status based on call transcripts.
This script checks if users have made calls in the last 30 days and updates
the 'is_using_platform' field in the Supabase clients table accordingly.

Usage:
    python update_user_activity.py

Requirements:
    - supabase
    - python-dotenv
    - requests

Environment variables required:
    - SUPABASE_URL: Supabase project URL
    - SUPABASE_SERVICE_ROLE_KEY: Supabase service role key
"""

import os
from datetime import datetime, timedelta
from supabase import create_client, Client
from dotenv import load_dotenv
import logging
import requests

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def get_supabase_client():
    """Initialize Supabase client."""
    supabase_url = os.getenv('SUPABASE_URL')
    supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
    
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables are not set")
    
    return create_client(supabase_url, supabase_key)

def get_users_with_recent_calls(supabase_client):
    """Get list of user emails who have made calls in the last 30 days using Edge Function."""
    try:
        # Calculate date 30 days ago
        thirty_days_ago = datetime.now() - timedelta(days=30)
        
        logger.info(f"Checking for calls since {thirty_days_ago}")
        
        # Use the existing get-all-transcripts Edge Function to get recent calls
        # We'll fetch all transcripts and filter by date
        response = supabase_client.functions.invoke('get-all-transcripts', {
            'body': {
                'page': 1,
                'limit': 10000,  # Large limit to get all recent transcripts
                'date': '30days'  # Filter for last 30 days
            }
        })
        
        # Parse the response properly
        if hasattr(response, 'data'):
            data = response.data
        else:
            data = response
            
        if isinstance(data, bytes):
            import json
            data = json.loads(data.decode('utf-8'))
        
        if 'error' in data:
            raise Exception(f"Edge Function error: {data['error']}")
        
        transcripts = data.get('transcripts', [])
        logger.info(f"Found {len(transcripts)} transcripts from the last 30 days")
        
        # Extract unique user emails from transcripts
        active_users = set()
        for transcript in transcripts:
            # The transcript should have agent_email field from the Edge Function
            if 'agent_email' in transcript and transcript['agent_email']:
                active_users.add(transcript['agent_email'])
            # Fallback to other possible fields
            elif 'user_email' in transcript and transcript['user_email']:
                active_users.add(transcript['user_email'])
            elif 'agent' in transcript and 'created_by' in transcript['agent']:
                active_users.add(transcript['agent']['created_by'])
        
        logger.info(f"Found {len(active_users)} unique users with recent activity")
        
        # Log the active users for visibility
        if active_users:
            logger.info("Active users with calls in last 30 days:")
            for i, user_email in enumerate(sorted(active_users), 1):
                logger.info(f"  {i:3d}. {user_email}")
        
        return list(active_users)
        
    except Exception as e:
        logger.error(f"Error fetching users with recent calls: {e}")
        raise

def check_user_activity():
    """Main function to check and update user activity status."""
    try:
        # Initialize Supabase client
        supabase_client = get_supabase_client()
        
        logger.info("Connected to Supabase")
        
        # Get users with recent calls
        active_user_emails = get_users_with_recent_calls(supabase_client)
        
        # Get all users from Supabase
        response = supabase_client.table('clients').select('email, is_using_platform').execute()
        all_users = response.data
        
        logger.info(f"Found {len(all_users)} total users in Supabase")
        
        # Track updates
        users_activated = 0
        users_deactivated = 0
        
        # Update each user's status
        for user in all_users:
            user_email = user['email']
            current_status = user.get('is_using_platform', False)
            should_be_active = user_email in active_user_emails
            
            if current_status != should_be_active:
                # Update the user's status
                update_response = supabase_client.table('clients').update({
                    'is_using_platform': should_be_active
                }).eq('email', user_email).execute()
                
                if should_be_active:
                    users_activated += 1
                    logger.info(f"Activated user: {user_email}")
                else:
                    users_deactivated += 1
                    logger.info(f"Deactivated user: {user_email}")
        
        # Log summary
        logger.info(f"Update complete:")
        logger.info(f"  - Users activated: {users_activated}")
        logger.info(f"  - Users deactivated: {users_deactivated}")
        logger.info(f"  - Total active users: {len(active_user_emails)}")
        
    except Exception as e:
        logger.error(f"Error in check_user_activity: {e}")
        raise

if __name__ == "__main__":
    try:
        logger.info("Starting user activity update script")
        check_user_activity()
        logger.info("User activity update script completed successfully")
    except Exception as e:
        logger.error(f"Script failed: {e}")
        exit(1)