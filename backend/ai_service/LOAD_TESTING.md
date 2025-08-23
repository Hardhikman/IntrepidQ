# Load Testing Setup for UPSC Question Generator API

This directory contains comprehensive load testing tools for the FastAPI backend using [Locust](https://locust.io/).

## 📁 Files Overview

- **`locustfile.py`** - Main Locust test definitions with realistic user scenarios
- **`load_test_config.py`** - Configuration management for different test scenarios  
- **`run_load_tests.py`** - Easy-to-use test runner script
- **`LOAD_TESTING.md`** - This documentation file

## 🚀 Quick Start

### 1. Install Dependencies

```bash
# Install Locust (if not already installed)
pip install locust

# Or install all requirements including Locust
pip install -r requirements.txt
```

### 2. Start Your FastAPI Server

```bash
# Make sure your server is running
uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Run Load Tests

```bash
# List available test configurations
python run_load_tests.py --list

# Run a basic load test
python run_load_tests.py light

# Run with web interface for interactive control
python run_load_tests.py normal --web-ui

# Run heavy load test for stress testing
python run_load_tests.py heavy
```

## 🎯 Test Scenarios

### Available Configurations

| Config | Users | Duration | Purpose |
|--------|-------|----------|---------|
| `light` | 10 | 5min | Basic functionality testing |
| `normal` | 25 | 10min | Typical user load simulation |
| `heavy` | 100 | 15min | High concurrency stress test |
| `rate_limit` | 50 | 10min | Rate limiting verification |
| `answers_only` | 30 | 10min | Unlimited answer generation test |
| `endurance` | 20 | 60min | Long-duration stability test |
| `spike` | 200 | 5min | Sudden load increase test |

### User Types Simulated

1. **UPSCAPILoadTest** - Regular users performing various actions
2. **RateLimitTestUser** - Aggressive users to test rate limits
3. **AnswerOnlyUser** - Users focused on answer generation only

## 📊 What Gets Tested

### Core Endpoints

#### ✅ Basic Functionality
- `GET /` - Root endpoint
- `GET /health` - Health checks
- `GET /test-cors` - CORS functionality
- `GET /api/subjects` - Subject listing

#### 🎯 Question Generation (Rate Limited)
- `POST /api/generate_questions` - Topic-based questions
- `POST /api/generate_whole_paper` - Full paper generation
- Rate limiting for guest users (2/day) and authenticated users (5/day)

#### 💬 Answer Generation (Unlimited)
- `POST /api/generate_answer` - Single answer generation
- `POST /api/generate_answers` - Batch answer generation
- No rate limits applied

#### 👤 User Management (Authenticated)
- `GET /api/user_profile` - User profile data
- `GET /api/question_history` - Question history
- `GET /api/user_stats` - User statistics
- `GET /api/dashboard_data` - Dashboard information
- `POST /api/question_feedback` - Feedback submission

## 🔧 Usage Examples

### Basic Load Testing

```bash
# Test basic functionality
python run_load_tests.py light

# Simulate normal user load
python run_load_tests.py normal

# Stress test with high concurrency
python run_load_tests.py heavy
```

### Interactive Testing with Web UI

```bash
# Start interactive web interface
python run_load_tests.py normal --web-ui

# Then open http://localhost:8089 in your browser
```

### Specific Test Scenarios

```bash
# Test rate limiting behavior
python run_load_tests.py rate_limit

# Test unlimited answer generation
python run_load_tests.py answers_only

# Long-duration stability test
python run_load_tests.py endurance
```

### Testing Against Different Environments

```bash
# Test against staging server
python run_load_tests.py normal --host http://staging-server:8000

# Test against production (be careful!)
python run_load_tests.py light --host https://your-production-url.com
```

## 📈 Understanding Results

### Response Time Expectations

| Endpoint Type | Expected Response Time |
|---------------|----------------------|
| Health checks | < 100ms |
| Basic endpoints | < 200ms |
| Question generation | < 3000ms (AI processing) |
| Answer generation | < 2000ms |

### Success Rate Interpretation

- **>95% success rate** is good for most endpoints
- **429 responses** (rate limited) are **expected behavior**, not failures
- **401/403 responses** are expected for authenticated endpoints without proper tokens

### Key Metrics to Monitor

1. **Response Times** - P50, P95, P99 percentiles
2. **Throughput** - Requests per second
3. **Error Rates** - Excluding expected 429s
4. **Rate Limiting** - 429 responses should appear for question generation
5. **Resource Usage** - CPU, memory, database connections

## 🛠 Advanced Usage

### Custom Test Configuration

You can create custom test scenarios by modifying `load_test_config.py`:

```python
LOAD_TEST_CONFIGS["custom"] = LoadTestConfig(
    name="Custom Test",
    description="My custom test scenario", 
    users=50,
    spawn_rate=10,
    run_time="20m",
    host="http://localhost:8000",
    tags=["questions", "answers"]
)
```

### Running Specific Test Tags

```bash
# Run only health and basic tests
locust -f locustfile.py --host=http://localhost:8000 --tags=health,basic

# Run only question generation tests
locust -f locustfile.py --host=http://localhost:8000 --tags=questions

# Run only unlimited answer tests
locust -f locustfile.py --host=http://localhost:8000 --tags=answers
```

### Distributed Load Testing

For very high load testing, you can run Locust in distributed mode:

```bash
# Start master node
locust -f locustfile.py --master --host=http://localhost:8000

# Start worker nodes (run on multiple machines)
locust -f locustfile.py --worker --master-host=<master-ip>
```

## 🔍 Monitoring During Tests

### Server Monitoring

Monitor these metrics on your server during load tests:

```bash
# Monitor server resources
top -p $(pgrep -f uvicorn)

# Monitor FastAPI logs
tail -f /path/to/your/logs

# Monitor database connections (if applicable)
# Check Supabase dashboard for connection metrics
```

### Test Results

After each test, Locust generates:

- **HTML Report** - `results_[config]_[timestamp]_report.html`
- **CSV Files** - Detailed metrics for further analysis
- **Console Output** - Real-time statistics

## 🚨 Best Practices

### Before Testing

1. **Environment Setup**
   - Use a dedicated testing environment
   - Ensure all environment variables are set
   - Verify database connections are stable

2. **Baseline Testing**
   - Start with `light` configuration
   - Verify basic functionality works
   - Check server health and logs

### During Testing

1. **Monitor Resources**
   - Watch CPU and memory usage
   - Monitor database performance
   - Check external API limits (Groq, Google)

2. **Expected Behaviors**
   - Rate limits should trigger (429 responses)
   - Answer generation should remain unlimited
   - Server should remain stable under load

### After Testing

1. **Review Results**
   - Check HTML reports for detailed metrics
   - Analyze response time distributions
   - Identify performance bottlenecks

2. **Optimization**
   - Tune server configuration based on results
   - Optimize database queries if needed
   - Adjust rate limits if necessary

## 🔧 Troubleshooting

### Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | Ensure FastAPI server is running on correct port |
| High error rates | Check server logs and resource usage |
| Slow response times | Monitor AI API limits and database performance |
| Rate limits not working | Verify Supabase integration and database triggers |

### Debug Commands

```bash
# Check if server is healthy
curl http://localhost:8000/health

# Test rate limiting manually
curl -X POST http://localhost:8000/api/generate_questions \
  -H "Content-Type: application/json" \
  -d '{"topic": "Test", "num": 5}'

# Check dependencies
python run_load_tests.py --check-deps
```

## 📚 Additional Resources

- [Locust Documentation](https://docs.locust.io/)
- [FastAPI Performance Testing](https://fastapi.tiangolo.com/advanced/testing-events/)
- [Load Testing Best Practices](https://docs.locust.io/en/stable/writing-a-locustfile.html)

## 🤝 Contributing

When adding new test scenarios:

1. Update `locustfile.py` with new user behaviors
2. Add configuration to `load_test_config.py`
3. Update this documentation
4. Test your changes with different load levels

## 📝 Notes

- **Rate Limiting**: The system implements different limits for guest (2/day) and authenticated (5/day) users
- **Answer Generation**: Unlimited for all users - this is intentional design
- **Authentication**: Most tests use dummy tokens - real authentication testing requires separate setup
- **AI Dependencies**: Response times depend on external AI services (Groq, Google Gemini)