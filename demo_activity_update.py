#!/usr/bin/env python3
"""
Demo script to show how the user activity update would work.
This version simulates the MongoDB connection and shows the expected output.
"""

import os
from datetime import datetime, timedelta
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

def demo_user_activity_check():
    """Demo function to show how the user activity check would work."""
    try:
        logger.info("Starting user activity update script (DEMO MODE)")
        
        # Simulate environment check
        mongo_uri = os.getenv('MONGO_URI')
        supabase_url = os.getenv('SUPABASE_URL')
        supabase_key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
        
        if not mongo_uri:
            logger.warning("MONGO_URI not set - using demo mode")
        if not supabase_url or not supabase_key:
            logger.warning("Supabase credentials not fully set - using demo mode")
        
        logger.info("Environment variables checked")
        
        # Simulate connection
        logger.info("Would connect to MongoDB and Supabase here...")
        
        # Simulate user data
        simulated_users = [
            {'email': 'user1@example.com', 'id': '1'},
            {'email': 'user2@example.com', 'id': '2'},
            {'email': 'user3@example.com', 'id': '3'},
            {'email': 'user4@example.com', 'id': '4'},
            {'email': 'user5@example.com', 'id': '5'},
        ]
        
        logger.info(f"Found {len(simulated_users)} users to check")
        
        # Calculate date 30 days ago
        thirty_days_ago = datetime.now() - timedelta(days=30)
        thirty_days_ago_str = thirty_days_ago.isoformat()
        
        logger.info(f"Checking for calls since {thirty_days_ago_str}")
        
        # Simulate activity check
        activity_updates = []
        active_count = 0
        
        for i, user in enumerate(simulated_users):
            user_email = user['email']
            user_id = user['id']
            
            # Simulate some users having recent activity
            has_recent_calls = i % 2 == 0  # Every other user has activity
            
            if has_recent_calls:
                active_count += 1
                logger.info(f"User {user_email} has recent calls (simulated)")
            else:
                logger.debug(f"User {user_email} has no recent calls (simulated)")
            
            activity_updates.append({
                'email': user_email,
                'id': user_id,
                'is_using_platform': has_recent_calls
            })
        
        # Simulate database updates
        logger.info(f"Would update activity status for {len(activity_updates)} users")
        
        # Simulate successful updates
        updated_count = len(activity_updates)
        inactive_users = len(activity_updates) - active_count
        
        # Summary
        logger.info(f"Demo update completed successfully:")
        logger.info(f"  - Total users processed: {len(activity_updates)}")
        logger.info(f"  - Users that would be updated: {updated_count}")
        logger.info(f"  - Active users (with recent calls): {active_count}")
        logger.info(f"  - Inactive users: {inactive_users}")
        
        logger.info("")
        logger.info("In real execution, this would:")
        logger.info("1. Connect to your MongoDB instance")
        logger.info("2. Fetch all users from Supabase clients table")
        logger.info("3. Check each user's call activity in MongoDB")
        logger.info("4. Update the is_using_platform field in Supabase")
        logger.info("5. The dashboard would automatically show updated counts")
        
    except Exception as e:
        logger.error(f"Demo script error: {e}")
        raise

if __name__ == "__main__":
    try:
        demo_user_activity_check()
        logger.info("Demo completed successfully")
        logger.info("")
        logger.info("To run the real script:")
        logger.info("1. Set MONGO_URI in your .env file to your actual MongoDB connection string")
        logger.info("2. Run: python update_user_activity.py")
    except Exception as e:
        logger.error(f"Demo failed: {e}")
        exit(1)