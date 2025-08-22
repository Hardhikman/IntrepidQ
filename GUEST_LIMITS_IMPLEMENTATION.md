# Daily Generation Limit for Guest Users - Implementation Summary

## Overview
This implementation introduces a daily generation limit of 2 for unauthenticated (guest) users for **question generation only**. Guest users can generate unlimited answers, encouraging them to try the service while gently promoting sign-up for increased question generation capacity.

## Backend Changes

### 1. Database Schema Updates (`backend/db/supabase.sql`)

#### New Table: `guest_generations`
```sql
create table if not exists public.guest_generations (
    id uuid primary key default gen_random_uuid(),
    ip_address inet not null,
    generation_count integer not null default 0,
    last_generation_date date not null default current_date,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);
```

#### New Indexes
- `idx_guest_generations_ip` - Optimizes IP address lookups
- `idx_guest_generations_date` - Optimizes date-based queries

#### RLS Policies
- Service role can manage guest generations table
- Enables secure IP-based tracking without exposing user data

### 2. Supabase Client Updates (`core/supabase_client.py`)

#### New Methods
- `check_guest_generation_limit(ip_address, daily_limit=2)` - Checks if guest can generate
- `increment_guest_generation_count(ip_address)` - Increments guest usage counter

#### Key Features
- IP-based tracking with daily reset logic
- Handles date parsing and timezone considerations
- Graceful error handling and logging

### 3. API Route Updates

#### Question Generation (`api/routes/questions.py`)
- Added `get_client_ip(request)` utility for IP extraction
- Updated both `/generate_questions` and `/generate_whole_paper` endpoints
- Proxy-aware IP detection (X-Forwarded-For, X-Real-IP headers)
- Different error responses for guest vs authenticated users

#### Answer Generation (`api/routes/answer.py`)
- Applied same IP-based rate limiting to answer endpoints
- Consistent error messaging across all generation endpoints
- Maintains generation count accuracy

## Frontend Changes

### 1. Main Page Updates (`pages/index.tsx`)

#### Header Integration
- Removed separate AuthForm redirect
- Integrated "Sign In with Google" button in main header
- Conditional rendering: User menu for authenticated, Sign In for guests
- Maintains clean, professional UI design

#### Guest User Experience
- Added informational card showing guest limits (2 per day)
- Encourages sign-up with clear benefit messaging
- Seamless transition between guest and authenticated states

#### Enhanced Error Handling
- Smart toast notifications for rate limit errors
- Embedded "Sign In" button in error toasts for guests
- Different messaging for guest vs authenticated limit errors
- Improved user experience with actionable error messages

### 2. Rate Limit Integration
- Updated question generation handlers
- Updated answer generation handlers
- Consistent error handling across all API calls
- Maintains existing functionality for authenticated users

## User Experience Flow

### Guest Users
1. **Welcome**: See friendly message about 2 free question generations
2. **Generate Questions**: Can generate questions normally (up to 2 per day)
3. **Generate Answers**: Can generate unlimited answers for any questions
4. **Question Limit Reached**: Clear toast with sign-in option embedded
5. **Upgrade**: One-click sign-in to get 5 question generations/day

### Authenticated Users
- Unlimited answer generation (no limits)
- 5 question generations per day
- Access to saved history and premium features
- No impact from guest limiting implementation

## Technical Implementation Details

### IP-Based Tracking
- Uses `X-Forwarded-For` header for proxy setups
- Fallback to `X-Real-IP` for direct connections
- Graceful handling of unknown/missing IP addresses
- Daily reset logic based on generation date

### Database Design
- Separate table for guest tracking (scalable)
- No personal data stored for guests
- Efficient indexing for performance
- RLS policies for security

### Rate Limiting Logic
- Check → Generate → Increment pattern
- Atomic operations to prevent race conditions
- Consistent limits across all generation endpoints
- Error responses include actionable information

## Security Considerations

### Data Privacy
- No personal information stored for guests
- IP addresses used only for rate limiting
- Automatic cleanup possible (not implemented)
- GDPR-friendly approach

### Rate Limiting Bypass Prevention
- IP-based tracking (harder to circumvent than cookies)
- Server-side enforcement only
- Proxy-aware IP detection
- Database-backed persistence

## Configuration

### Backend Constants
```python
DAILY_LIMIT = 5          # Authenticated users
GUEST_DAILY_LIMIT = 2    # Guest users
```

### Frontend Messaging
- Guest limit: 2 generations/day
- User limit: 5 generations/day
- Clear upgrade messaging

## Testing and Validation

### Test Script (`test_guest_limits.py`)
- Automated testing of rate limiting
- IP simulation capabilities
- Backend health checks
- Comprehensive validation

### Manual Testing Steps
1. Open frontend without authentication
2. Generate 2 questions/answers
3. Attempt third generation
4. Verify rate limit message with sign-in option
5. Sign in and verify increased limits

## Benefits

### For Users
- **Immediate Access**: Can try the service without signup
- **Unlimited Answers**: Full access to answer generation as guest
- **Clear Limits**: Transparent about question generation restrictions
- **Easy Upgrade**: One-click sign-in process
- **Value Proposition**: Clear benefit of signing up for more questions

### For Business
- **User Acquisition**: Lower barrier to entry
- **Conversion Funnel**: Natural upgrade path
- **Resource Management**: Controlled usage for free tier
- **Analytics**: Track guest vs authenticated usage

### For Developers
- **Scalable Architecture**: IP-based system scales well
- **Clean Implementation**: Minimal code changes
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add more sophisticated limiting

## Future Enhancements

### Potential Improvements
1. **Cleanup Job**: Remove old guest generation records
2. **Advanced Analytics**: Track conversion rates
3. **Geolocation**: Country-based limits
4. **Soft Limits**: Warning before hitting limit
5. **Trial Periods**: Special promotions for new users

### Monitoring
- Track guest usage patterns
- Monitor conversion from guest to authenticated
- Alert on unusual rate limiting patterns
- Performance metrics for IP-based queries

## Deployment Notes

### Database Migration
1. Apply the SQL schema updates to Supabase
2. Verify table creation and indexes
3. Test RLS policies

### Backend Deployment
1. Deploy updated backend code
2. Verify environment variables
3. Test health endpoints

### Frontend Deployment
1. Deploy updated frontend
2. Test guest and authenticated flows
3. Verify error handling

## Conclusion

This implementation successfully provides a balanced approach to user acquisition and resource management. Guest users get a meaningful trial experience while being gently encouraged to sign up for full access. The technical implementation is robust, scalable, and maintains the existing user experience for authenticated users.

The solution addresses the key requirements:
- ✅ Daily generation limit for guests (2 per day)
- ✅ IP-based tracking and enforcement
- ✅ Integrated sign-in experience
- ✅ Clear upgrade messaging
- ✅ Maintained authenticated user experience
- ✅ Robust error handling and user feedback