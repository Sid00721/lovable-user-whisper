# User Activity Update Script

This script automatically updates the "using platform" status for users based on their call activity in the last 30 days.

## Overview

The script:
1. Connects to Supabase to fetch users and update their status
2. Uses Supabase Edge Functions to check call transcripts
3. For each user, checks if they have any calls in the last 30 days
4. Updates the `is_using_platform` field in the Supabase `clients` table

## Files

- `update_user_activity.py` - Main Python script
- `run_activity_update.bat` - Windows batch file for easy execution
- `requirements.txt` - Updated with necessary dependencies

## Setup

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Variables

Ensure the following environment variables are set in your `.env` file:

```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**Important:** Use the service role key (not the anon key) as it has the necessary permissions to update user data.

## Usage

### Manual Execution

#### Option 1: Python Script
```bash
python update_user_activity.py
```

#### Option 2: Batch File (Windows)
```bash
run_activity_update.bat
```

### Automated Execution

You can schedule this script to run automatically using:

#### Windows Task Scheduler
1. Open Task Scheduler
2. Create a new task
3. Set the action to run `run_activity_update.bat`
4. Set the schedule (e.g., daily at midnight)

#### Cron (Linux/Mac)
Add to your crontab:
```bash
# Run daily at midnight
0 0 * * * /path/to/your/project/update_user_activity.py
```

## Script Output

The script provides detailed logging including:
- Number of users processed
- Number of active users (with recent calls)
- Number of inactive users
- Any errors encountered

Example output:
```
2024-01-15 10:30:00 - INFO - Starting user activity update script
2024-01-15 10:30:01 - INFO - Connected to MongoDB and Supabase
2024-01-15 10:30:01 - INFO - Found 150 users to check
2024-01-15 10:30:01 - INFO - Checking for calls since 2023-12-16T10:30:01.123456
2024-01-15 10:30:05 - INFO - Update completed successfully:
2024-01-15 10:30:05 - INFO -   - Total users processed: 150
2024-01-15 10:30:05 - INFO -   - Users updated in database: 150
2024-01-15 10:30:05 - INFO -   - Active users (with recent calls): 45
2024-01-15 10:30:05 - INFO -   - Inactive users: 105
```

## How It Works

1. **Data Collection**: The script uses the existing `get-all-transcripts` Supabase Edge Function to fetch call transcripts from the last 30 days
2. **User Mapping**: For each transcript found, it extracts the user email from the transcript data (either from `user_email` field or `agent.created_by` field)
3. **Activity Analysis**: Creates a list of unique user emails who have made calls recently
4. **Status Update**: Compares this list with all users in the Supabase `clients` table and updates the `is_using_platform` field accordingly
5. **Logging**: Provides detailed logs of the process, including counts of activated/deactivated users

## Dashboard Integration

After running this script, the "Using Platform" card in your dashboard will automatically show the updated count of users who have made calls in the last 30 days. No manual refresh is needed - the card reads directly from the `is_using_platform` field in the database.

## Troubleshooting

### Common Issues

1. **MongoDB Connection Error**
   - Verify `MONGO_URI` is correct
   - Check network connectivity
   - Ensure MongoDB instance is running

2. **Supabase Connection Error**
   - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
   - Ensure the service role key has the necessary permissions

3. **No Users Found**
   - Check if the `clients` table exists and has data
   - Verify the table structure includes `email` and `id` fields

4. **Permission Errors**
   - Ensure the service role key has read/write access to the `clients` table
   - Check Supabase RLS policies if enabled

### Logs

The script provides detailed logging. If you encounter issues, check the console output for specific error messages.