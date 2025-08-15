#!/usr/bin/env python3
"""
Script to verify which users have is_using_platform set to true in Supabase.
"""

import os
from supabase import create_client, Client
from dotenv import load_dotenv
import logging

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
        raise ValueError("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables are required")
    
    return create_client(supabase_url, supabase_key)

def verify_platform_users():
    """Verify which users are marked as using the platform."""
    try:
        supabase_client = get_supabase_client()
        
        # Get all users with is_using_platform = true
        response = supabase_client.table('clients').select('email, name, is_using_platform').eq('is_using_platform', True).execute()
        active_users = response.data
        
        logger.info(f"Found {len(active_users)} users marked as using the platform:")
        
        for i, user in enumerate(sorted(active_users, key=lambda x: x['email']), 1):
            name = user.get('name', 'No name')
            email = user['email']
            logger.info(f"  {i:3d}. {email} ({name})")
        
        # Also get total count of all users
        total_response = supabase_client.table('clients').select('email', count='exact').execute()
        total_count = total_response.count
        
        logger.info(f"\nSummary:")
        logger.info(f"  - Users using platform: {len(active_users)}")
        logger.info(f"  - Total users in system: {total_count}")
        logger.info(f"  - Platform usage rate: {len(active_users)/total_count*100:.1f}%")
        
    except Exception as e:
        logger.error(f"Error verifying platform users: {e}")
        raise

if __name__ == "__main__":
    try:
        logger.info("Starting platform users verification")
        verify_platform_users()
        logger.info("Platform users verification completed successfully")
    except Exception as e:
        logger.error(f"Script failed: {e}")
        exit(1)