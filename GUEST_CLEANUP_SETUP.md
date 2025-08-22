# Guest IP Cleanup Automation Setup

This document provides instructions for setting up automatic guest IP cleanup in Supabase.

## Overview

The guest cleanup system automatically removes old guest generation records every 2 days to maintain database performance and manage storage costs.

## Setup Instructions

### 1. Enable pg_cron Extension (One-time setup)

Run this SQL command in your Supabase SQL Editor as a **superuser**:

```sql
-- Enable pg_cron extension (requires superuser privileges)
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Schedule the Cleanup Cron Job

Run this SQL command to create the automatic cleanup job:

```sql
-- Schedule guest cleanup every 2 days at 2 AM UTC
SELECT cron.schedule(
    'guest-cleanup',                    -- job name
    '0 2 */2 * *',                     -- cron expression: every 2 days at 2 AM UTC
    'SELECT public.cleanup_old_guest_generations();'
);
```

### 3. Verify Cron Job Setup

Check if the cron job was created successfully:

```sql
-- View all scheduled cron jobs
SELECT * FROM cron.job;

-- View cron job run history
SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 10;
```

## Cron Expression Breakdown

- `0 2 */2 * *` means:
  - `0` - At minute 0
  - `2` - At hour 2 (2 AM)
  - `*/2` - Every 2 days
  - `*` - Every month
  - `*` - Every day of week

## Cleanup Function Details

### What gets cleaned up:
- Guest generation records older than **7 days**
- Keeps recent records for analytics and debugging
- Only affects `guest_generations` table

### What gets logged:
- Cleanup operations are logged in `usage_analytics` table
- Success/failure status and details
- Number of records cleaned up

## Manual Management

### Manual Cleanup (Admin Only)
```bash
# Trigger manual cleanup via API
POST /api/admin/manual_guest_cleanup
Authorization: Bearer <admin_jwt_token>
```

### Check Cleanup Status (Admin Only)
```bash
# Get cleanup status and statistics
GET /api/admin/guest_cleanup_status
Authorization: Bearer <admin_jwt_token>
```

### View Guest Analytics (Admin Only)
```bash
# Get guest usage analytics for last 30 days
GET /api/admin/guest_analytics?days=30
Authorization: Bearer <admin_jwt_token>
```

## Monitoring

### Check Recent Cleanup Logs
```sql
-- View recent cleanup operations
SELECT 
    action,
    success,
    error_message,
    created_at
FROM usage_analytics 
WHERE action = 'guest_cleanup' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Check Guest Records Count
```sql
-- View current guest generations statistics
SELECT 
    COUNT(*) as total_records,
    MIN(last_generation_date) as oldest_record,
    MAX(last_generation_date) as newest_record,
    COUNT(CASE WHEN last_generation_date < CURRENT_DATE - INTERVAL '7 days' THEN 1 END) as eligible_for_cleanup
FROM guest_generations;
```

## Troubleshooting

### If cron job fails to create:
1. Ensure you have superuser privileges
2. Check if pg_cron extension is installed
3. Verify Supabase plan supports cron jobs

### If cleanup function fails:
1. Check the `usage_analytics` table for error messages
2. Verify RLS policies allow the function to access tables
3. Use manual cleanup API to test functionality

### To modify cleanup schedule:
```sql
-- Update existing cron job
SELECT cron.alter_job('guest-cleanup', schedule := '0 3 */3 * *'); -- Every 3 days at 3 AM

-- Or delete and recreate
SELECT cron.unschedule('guest-cleanup');
-- Then create new schedule
```

### To disable cleanup:
```sql
-- Disable the cron job
SELECT cron.unschedule('guest-cleanup');
```

## Configuration Options

You can modify the cleanup behavior by editing the `cleanup_old_guest_generations()` function:

- Change retention period (currently 7 days)
- Modify logging behavior
- Add additional cleanup criteria

## Security Notes

- Cleanup function runs with `SECURITY DEFINER` privileges
- Only admin users can trigger manual cleanup via API
- All cleanup operations are logged for audit purposes
- No sensitive data is exposed in cleanup logs

## Performance Impact

- Cleanup runs during low-traffic hours (2 AM UTC)
- Minimal performance impact on production
- Helps maintain database performance by removing old data
- Reduces storage costs over time