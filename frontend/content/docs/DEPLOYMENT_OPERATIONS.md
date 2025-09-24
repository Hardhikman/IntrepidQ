---
title: Deployment and Operations
description: Deployment guides and operational procedures for IntrepidQ AI
---

# Deployment and Operations

## Docker Deployment

### Docker Compose Configuration
The application uses Docker Compose for multi-container orchestration:

```yaml
services:
  ai-service:
    build: 
      context: ./backend/ai_service
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_KEY=${SUPABASE_SERVICE_KEY}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - NEWSAPI_KEY=${NEWSAPI_KEY}
      # Upstash Search Configuration
      - UPSTASH_SEARCH_REST_URL=${UPSTASH_SEARCH_REST_URL}
      - UPSTASH_SEARCH_REST_TOKEN=${UPSTASH_SEARCH_REST_TOKEN}
      - UPSTASH_SEARCH_INDEX=${UPSTASH_SEARCH_INDEX}
      # Upstash Redis Configuration
      - REDIS_URL=${REDIS_URL}
    volumes:
      - ./backend/ai_service/data:/app/data
      - ./backend/ai_service/pyq_data:/app/pyq_data
    restart: unless-stopped
    networks:
      - upsc-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_SUPABASE_URL=${SUPABASE_URL}
      - NEXT_PUBLIC_SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - NEXT_PUBLIC_API_URL=http://ai-service:8000
    depends_on:
      - ai-service
    restart: unless-stopped
    networks:
      - upsc-network

networks:
  upsc-network:
    name: upsc-generator-network
    driver: bridge
```

### Technology Stack Migration
The system now uses a hybrid approach with both local and managed services:
- **pgvector**: For vector similarity search in the local PostgreSQL database
- **Upstash Redis**: For caching and rate limiting
- **Upstash Search**: For keyword-based question generation

## Environment Configuration

### Backend Environment Variables
```properties
# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# AI Model APIs
GROQ_API_KEY=your_groq_api_key
GOOGLE_API_KEY=your_google_api_key
OPENROUTER_API_KEY=your_openrouter_key

# Application Settings
SECRET_KEY=your_jwt_secret_key
CORS_ORIGINS=http://localhost:3000
ENVIRONMENT=development

# Model Configuration
GROQ_TEMPERATURE=0.7
DEFAULT_MODEL=llama3-70b

# Rate Limiting
DAILY_LIMIT=5
GUEST_DAILY_LIMIT=2

# Upstash Configuration
UPSTASH_SEARCH_REST_URL=your_upstash_url
UPSTASH_SEARCH_REST_TOKEN=your_upstash_token
UPSTASH_SEARCH_INDEX=your_upstash_index

# Upstash Redis Configuration
REDIS_URL=your_upstash_redis_url
```

### Frontend Environment Variables
```properties
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Feature Flags
NEXT_PUBLIC_ENABLE_ANALYTICS=true
NEXT_PUBLIC_ENABLE_GUEST_MODE=true
```

### Database Setup and Migrations

### Initial Setup
1. Run database schema files in numerical order:
   - `01_user_management.sql`
   - `02_question_generation.sql`
   - `03_analytics_feedback.sql`
   - `04_caching_performance.sql`
   - `05_guest_management.sql`
   - `06_statistics_dashboard.sql`
   - `07_utilities.sql`
   - `08_vector_storage.sql`

2. Optional setup:
   - `setup_automatic_cleanup.sql` for automated maintenance
   - `verify_deployment.sql` to verify deployment

### Recent Migrations
1. `migration_add_model_column.sql`: Add model tracking to generated questions
2. `migration_add_feedback_type_column.sql`: Add feedback categorization
3. `migration_add keyword mode.sql`: Extend generation modes to support keywords

## Performance Monitoring

### Response Time Targets
- Question generation: < 2 seconds
- Cache hit rate: > 80% for repeated queries
- Model success rate: > 95% generation success

### Monitoring Endpoints
- `/health`: System health check
- `/api/cache/stats`: Cache performance statistics
- `/api/model_performance`: AI model performance metrics

### Key Metrics to Track
- Daily active users
- Question generation volume
- Cache hit/miss ratios
- Model response times
- Error rates and patterns

## Maintenance Procedures

### Automatic Cleanup
- Daily cleanup of old generated questions (older than 30 days)
- Periodic cache cleanup to maintain optimal performance
- Guest generation record cleanup

### Manual Maintenance
- Database vacuum operations
- Index rebuilding for performance optimization
- Log rotation and cleanup

### Backup Procedures
- Regular database backups
- Configuration file backups
- Generated data backups

## Scaling Considerations

### Horizontal Scaling
- Backend services can be scaled horizontally
- Load balancing for multiple backend instances
- Shared Upstash services for caching and search

### Vertical Scaling
- Increase resources for individual containers
- Database scaling through Supabase
- CDN for frontend assets

### Performance Optimization
- Use of caching layers (Upstash Redis)
- Database indexing for query performance
- CDN for static assets
- Compression and optimization techniques

## Recent Operational Improvements

### Hybrid Technology Stack Benefits
- **pgvector**: Local vector similarity search with full control
- **Upstash Redis**: Managed caching with global replication
- **Upstash Search**: Managed keyword search with efficient indexing

### Database Schema Enhancements
- Added model tracking for better analytics
- Improved feedback categorization
- Extended generation modes to support keywords and current affairs
- Optimized indexes for better query performance

### Monitoring and Observability
- Enhanced health check endpoints
- Detailed cache statistics
- Model performance tracking
- Improved error logging and monitoring