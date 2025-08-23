"""
Performance Testing Configuration for UPSC Question Generator API

This file contains different load testing scenarios that can be run separately
or combined based on testing requirements.

Available test configurations:
1. Light Load Test - Basic functionality testing
2. Heavy Load Test - Stress testing with high concurrency
3. Rate Limit Test - Specifically test rate limiting behavior
4. Endurance Test - Long-duration testing for memory leaks/stability
5. Spike Test - Sudden load increases
"""

import os
from dataclasses import dataclass
from typing import Dict, List


@dataclass
class LoadTestConfig:
    """Configuration for different load test scenarios"""
    name: str
    description: str
    users: int
    spawn_rate: float
    run_time: str
    host: str
    tags: List[str] = None


# Test Configurations
LOAD_TEST_CONFIGS = {
    "light": LoadTestConfig(
        name="Light Load Test",
        description="Basic functionality test with light load",
        users=10,
        spawn_rate=2,
        run_time="5m",
        host="http://localhost:8000",
        tags=["health", "basic", "subjects"]
    ),
    
    "normal": LoadTestConfig(
        name="Normal Load Test", 
        description="Typical user load simulation",
        users=25,
        spawn_rate=5,
        run_time="10m",
        host="http://localhost:8000",
        tags=["health", "basic", "subjects", "questions", "answers"]
    ),
    
    "heavy": LoadTestConfig(
        name="Heavy Load Test",
        description="High concurrency stress test",
        users=100,
        spawn_rate=10,
        run_time="15m", 
        host="http://localhost:8000"
    ),
    
    "rate_limit": LoadTestConfig(
        name="Rate Limit Test",
        description="Test rate limiting mechanisms",
        users=50,
        spawn_rate=25,
        run_time="10m",
        host="http://localhost:8000",
        tags=["rate_limit"]
    ),
    
    "answers_only": LoadTestConfig(
        name="Answer Generation Test",
        description="Test unlimited answer generation",
        users=30,
        spawn_rate=10,
        run_time="10m",
        host="http://localhost:8000",
        tags=["answers"]
    ),
    
    "endurance": LoadTestConfig(
        name="Endurance Test",
        description="Long-duration stability test",
        users=20,
        spawn_rate=2,
        run_time="60m",
        host="http://localhost:8000"
    ),
    
    "spike": LoadTestConfig(
        name="Spike Test",
        description="Sudden load increase test",
        users=200,
        spawn_rate=50,
        run_time="5m",
        host="http://localhost:8000"
    )
}


def generate_locust_command(config_name: str) -> str:
    """Generate the appropriate locust command for a given configuration"""
    if config_name not in LOAD_TEST_CONFIGS:
        raise ValueError(f"Unknown config: {config_name}. Available: {list(LOAD_TEST_CONFIGS.keys())}")
    
    config = LOAD_TEST_CONFIGS[config_name]
    
    cmd_parts = [
        "locust",
        "-f locustfile.py",
        f"--host={config.host}",
        f"--users={config.users}",
        f"--spawn-rate={config.spawn_rate}",
        f"--run-time={config.run_time}",
        "--headless",  # Run without web UI
        "--csv=results",  # Save results to CSV
        "--html=report.html"  # Generate HTML report
    ]
    
    if config.tags:
        cmd_parts.append(f"--tags={','.join(config.tags)}")
    
    return " ".join(cmd_parts)


def print_available_configs():
    """Print all available test configurations"""
    print("\n=== Available Load Test Configurations ===\n")
    for name, config in LOAD_TEST_CONFIGS.items():
        print(f"Config: {name}")
        print(f"  Name: {config.name}")
        print(f"  Description: {config.description}")
        print(f"  Users: {config.users}")
        print(f"  Spawn Rate: {config.spawn_rate}/sec")
        print(f"  Run Time: {config.run_time}")
        if config.tags:
            print(f"  Tags: {', '.join(config.tags)}")
        print(f"  Command: {generate_locust_command(name)}")
        print()


# Performance Testing Guidelines
PERFORMANCE_GUIDELINES = """
=== Performance Testing Guidelines ===

1. PREPARATION:
   - Ensure your FastAPI server is running on port 8000
   - Set up proper environment variables (.env file)
   - Consider running tests against a staging environment for realistic results
   - Monitor system resources (CPU, memory, disk I/O) during tests

2. TEST EXECUTION ORDER:
   a) Start with 'light' test to verify basic functionality
   b) Run 'normal' test for typical load scenarios
   c) Execute 'rate_limit' test to verify rate limiting works
   d) Run 'answers_only' test to verify unlimited answer generation
   e) Perform 'heavy' test for stress testing
   f) Run 'endurance' test for stability (if needed)
   g) Execute 'spike' test for burst load handling

3. MONITORING:
   - Watch server logs for errors during tests
   - Monitor response times and throughput
   - Check rate limiting behavior (429 responses should appear)
   - Verify that answer generation remains unlimited
   - Monitor database connections and performance

4. EXPECTED BEHAVIOR:
   - Health checks should always be fast (<100ms)
   - Question generation should hit rate limits (429 responses)
   - Answer generation should never be rate limited
   - Authenticated endpoints should return 401/403 without proper tokens
   - Database operations should remain stable under load

5. INTERPRETING RESULTS:
   - Response times: 
     * Health/basic endpoints: <100ms
     * Question generation: <3000ms (AI processing time)
     * Answer generation: <2000ms
   - Success rates should be >95% (excluding expected 429s)
   - Rate limit responses (429) are successful behavior, not failures

6. TROUBLESHOOTING:
   - High error rates: Check server logs and resource usage
   - Slow responses: Monitor AI API limits (Groq, Google) 
   - Memory issues: Check for memory leaks in long tests
   - Database errors: Monitor Supabase connection limits
"""


if __name__ == "__main__":
    print_available_configs()
    print(PERFORMANCE_GUIDELINES)