# SmartQ Database Schema - Modular Structure

This directory contains the modular database schema for SmartQ, organized into separate files for better maintainability and deployment flexibility.

## 📁 File Structure

### Core Schema Files (Apply in Order)
```
00_master_deployment.sql    - Master deployment guide and instructions
01_user_management.sql      - User profiles, authentication, rate limiting
02_question_generation.sql  - Question generation history and tracking  
03_analytics_feedback.sql   - Usage analytics and user feedback
04_caching_performance.sql  - Question caching and model performance tracking
05_guest_management.sql     - Guest user IP-based rate limiting
06_statistics_dashboard.sql - User statistics and dashboard functions
07_utilities.sql           - Helper utility functions
08_vector_storage.sql       - Document embeddings and vector search
```

### Supporting Files
```
setup_automatic_cleanup.sql - pg_cron automated cleanup jobs (manual setup)
setup_cron_job.sql         - Alternative cron setup instructions
```

### Legacy Files (Reference Only)
```
supabase.sql               - Original monolithic schema (restructured)
test_minimal.sql           - Testing utilities
user statistics*.sql       - Alternative statistics implementations
```

## 🚀 Deployment Instructions

### Option 1: Full Deployment (Recommended)
1. **Read the master deployment guide:**
   ```sql
   -- Review 00_master_deployment.sql for complete instructions
   ```

2. **Apply schema files in numbered order:**
   ```bash
   # In Supabase SQL Editor, apply these files in sequence:
   01_user_management.sql
   02_question_generation.sql  
   03_analytics_feedback.sql
   04_caching_performance.sql
   05_guest_management.sql
   06_statistics_dashboard.sql
   07_utilities.sql
   08_vector_storage.sql
   ```

3. **Setup automated cleanup (manual step):**
   ```sql
   -- After main schema, apply this manually:
   setup_automatic_cleanup.sql
   ```

### Option 2: Selective Deployment
Deploy only specific modules as needed:

```sql
-- Core user system only:
01_user_management.sql
02_question_generation.sql

-- Add analytics:
03_analytics_feedback.sql

-- Add performance tracking:
04_caching_performance.sql

-- Add guest support:
05_guest_management.sql

-- Add statistics:
06_statistics_dashboard.sql
```

## 📊 Schema Overview

### Tables by Module

| Module | Tables | Purpose |
|--------|--------|---------|
| **User Management** | `user_profiles` | User accounts, preferences, daily limits |
| **Question Generation** | `generated_questions` | Question generation history |
| **Analytics & Feedback** | `usage_analytics`<br>`question_feedback` | Usage tracking, user ratings |
| **Caching & Performance** | `questions_cache`<br>`topic_questions_index`<br>`model_performance` | LLM examples cache, performance metrics |
| **Guest Management** | `guest_generations` | IP-based rate limiting |
| **Vector Storage** | `documents` | Document embeddings, vector search |

### Functions by Module

| Module | Key Functions | Purpose |
|--------|---------------|---------|
| **User Management** | `create_profile_for_new_user()`<br>`check_daily_limit()` | Profile creation, rate limiting |
| **Statistics** | `get_user_stats_rpc()`<br>`get_user_dashboard_data()` | User analytics, dashboard data |
| **Cleanup** | `cleanup_old_guest_generations()`<br>`cleanup_expired_cache()` | Automated maintenance |
| **Utilities** | `pg_extension_exists()`<br>`count_old_guest_records()` | Helper functions |
| **Vector Search** | `match_documents()`<br>`get_document_stats()` | Vector similarity search, stats |

## 🔧 Features

- **✅ Modular Design:** Each module is self-contained with clear dependencies
- **✅ Proper Dependencies:** Foreign key relationships maintained across modules
- **✅ Row Level Security:** RLS policies applied to all tables
- **✅ Automated Cleanup:** pg_cron jobs for maintenance (optional)
- **✅ Performance Optimized:** Proper indexes on all tables
- **✅ Rate Limiting:** 5/day for users, 2/day for guests
- **✅ Comprehensive Analytics:** Detailed usage and performance tracking

## 🛠 Dependencies

### Module Dependencies
```
01_user_management          (no dependencies)
    ↓
02_question_generation      (depends on: user_profiles)
    ↓  
03_analytics_feedback       (depends on: user_profiles, generated_questions)
    ↓
04_caching_performance      (depends on: usage_analytics for logging)
05_guest_management         (depends on: usage_analytics for logging)
06_statistics_dashboard     (depends on: user_profiles, generated_questions, question_feedback)
07_utilities               (no dependencies)
08_vector_storage          (depends on: pgvector extension)
```

### External Dependencies
- **PostgreSQL Extensions:** `pgcrypto`, `uuid-ossp`, `pgvector`
- **Supabase Auth:** `auth.users` table
- **pg_cron Extension:** Required for automated cleanup (optional)

## 🔍 Verification

After deployment, verify the setup:

```sql
-- Check all tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'user_profiles', 'generated_questions', 'usage_analytics', 
    'question_feedback', 'questions_cache', 'topic_questions_index',
    'guest_generations', 'model_performance', 'documents'
)
ORDER BY table_name;

-- Check RLS is enabled
SELECT tablename, rowsecurity FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true;

-- Check functions exist
SELECT routine_name FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

## 🔧 Maintenance

### Manual Cleanup
```sql
-- Test cleanup functions
SELECT public.cleanup_old_guest_generations();
SELECT public.cleanup_expired_cache();

-- Check what would be cleaned
SELECT public.count_old_guest_records(7);
```

### Monitoring
```sql
-- View analytics
SELECT action, COUNT(*) FROM usage_analytics 
GROUP BY action ORDER BY COUNT(*) DESC;

-- Check performance metrics
SELECT * FROM model_performance ORDER BY created_at DESC;
```

## 📝 Migration from Legacy

If migrating from the original `supabase.sql`:

1. **Backup existing data**
2. **Apply new modular schema to fresh database**
3. **Migrate data using INSERT...SELECT statements**
4. **Verify all functionality**
5. **Update application connection to new schema**

## 🆘 Troubleshooting

### Common Issues

1. **Foreign Key Errors:** Apply files in correct order
2. **Function Dependencies:** Ensure analytics tables exist before cleanup functions
3. **Permission Errors:** Use Supabase SQL Editor with sufficient privileges
4. **Extension Errors:** Verify `pgcrypto` and `uuid-ossp` are available

### Support Files

- `00_master_deployment.sql` - Complete deployment guide
- `setup_automatic_cleanup.sql` - Automated maintenance setup
- Legacy `supabase.sql` - Reference for comparison

---

**Version:** 2.0  
**Last Updated:** 2025-01-22  
**Compatibility:** Supabase PostgreSQL 15+