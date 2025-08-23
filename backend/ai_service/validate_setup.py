#!/usr/bin/env python3
"""
Validation script for Load Testing setup

This script validates that:
1. Locust is properly installed
2. FastAPI server is running and healthy
3. All endpoints are accessible
4. Load test files are properly configured

Run this before executing load tests to ensure everything is set up correctly.
"""

import sys
import requests
import json
import time
from datetime import datetime


class LoadTestValidator:
    def __init__(self, host="http://localhost:8000"):
        self.host = host
        self.issues = []
        self.successes = []
    
    def log_success(self, message):
        """Log a successful validation"""
        self.successes.append(f"✓ {message}")
        print(f"✓ {message}")
    
    def log_issue(self, message):
        """Log a validation issue"""
        self.issues.append(f"✗ {message}")
        print(f"✗ {message}")
    
    def log_info(self, message):
        """Log informational message"""
        print(f"ℹ {message}")
    
    def check_dependencies(self):
        """Check if required Python packages are installed"""
        print("\n=== Checking Dependencies ===")
        
        # Check Locust
        try:
            import locust
            self.log_success(f"Locust installed (version: {locust.__version__})")
        except ImportError:
            self.log_issue("Locust not installed. Run: pip install locust")
        
        # Check requests
        try:
            import requests
            self.log_success("Requests library available")
        except ImportError:
            self.log_issue("Requests library not available")
        
        # Check other critical dependencies
        critical_deps = ["fastapi", "uvicorn", "pydantic"]
        for dep in critical_deps:
            try:
                __import__(dep)
                self.log_success(f"{dep} available")
            except ImportError:
                self.log_issue(f"{dep} not available")
    
    def check_server_health(self):
        """Check if FastAPI server is running and healthy"""
        print(f"\n=== Checking Server Health ({self.host}) ===")
        
        try:
            # Check root endpoint
            response = requests.get(f"{self.host}/", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if "UPSC" in data.get("message", ""):
                    self.log_success("Root endpoint responding correctly")
                else:
                    self.log_issue(f"Root endpoint unexpected response: {data}")
            else:
                self.log_issue(f"Root endpoint returned {response.status_code}")
        
        except requests.exceptions.ConnectionError:
            self.log_issue("Cannot connect to server. Is it running?")
            self.log_info("Start server with: uvicorn api.main:app --host 0.0.0.0 --port 8000")
            return False
        except Exception as e:
            self.log_issue(f"Error checking root endpoint: {e}")
            return False
        
        try:
            # Check health endpoint
            response = requests.get(f"{self.host}/health", timeout=5)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log_success("Health endpoint indicates server is healthy")
                    
                    # Check service status
                    services = data.get("services", {})
                    for service, status in services.items():
                        if status:
                            self.log_success(f"Service {service} is available")
                        else:
                            self.log_issue(f"Service {service} is not available")
                else:
                    self.log_issue(f"Server reports unhealthy status: {data}")
            else:
                self.log_issue(f"Health endpoint returned {response.status_code}")
        
        except Exception as e:
            self.log_issue(f"Error checking health endpoint: {e}")
        
        return True
    
    def test_basic_endpoints(self):
        """Test basic endpoints that should always work"""
        print(f"\n=== Testing Basic Endpoints ===")
        
        endpoints = [
            ("/", "Root endpoint"),
            ("/health", "Health check"),
            ("/test-cors", "CORS test"),
            ("/api/subjects", "Subjects listing")
        ]
        
        for endpoint, description in endpoints:
            try:
                response = requests.get(f"{self.host}{endpoint}", timeout=10)
                if response.status_code == 200:
                    self.log_success(f"{description} ({endpoint}) - OK")
                else:
                    self.log_issue(f"{description} ({endpoint}) - HTTP {response.status_code}")
            except Exception as e:
                self.log_issue(f"{description} ({endpoint}) - Error: {e}")
    
    def test_question_generation(self):
        """Test question generation endpoints (may hit rate limits)"""
        print(f"\n=== Testing Question Generation ===")
        
        # Test topic questions
        try:
            payload = {
                "topic": "Test Topic",
                "num": 3,
                "use_ca": False,
                "months": 6,
                "model": "llama3-70b"
            }
            
            response = requests.post(
                f"{self.host}/api/generate_questions",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "questions" in data:
                    self.log_success("Topic question generation working")
                else:
                    self.log_issue("Topic question generation returned unexpected format")
            elif response.status_code == 429:
                self.log_success("Rate limiting working (429 response)")
            elif response.status_code == 503:
                self.log_issue("AI service not initialized (503 response)")
            else:
                self.log_issue(f"Topic question generation failed: HTTP {response.status_code}")
        
        except Exception as e:
            self.log_issue(f"Error testing topic question generation: {e}")
        
        # Test paper generation
        try:
            payload = {
                "subject": "GS1",
                "use_ca": False,
                "months": 6,
                "model": "llama3-70b"
            }
            
            response = requests.post(
                f"{self.host}/api/generate_whole_paper",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                self.log_success("Paper generation working")
            elif response.status_code == 429:
                self.log_success("Rate limiting working for paper generation")
            elif response.status_code == 503:
                self.log_issue("AI service not initialized for paper generation")
            else:
                self.log_issue(f"Paper generation failed: HTTP {response.status_code}")
        
        except Exception as e:
            self.log_issue(f"Error testing paper generation: {e}")
    
    def test_answer_generation(self):
        """Test answer generation endpoints (should be unlimited)"""
        print(f"\n=== Testing Answer Generation ===")
        
        # Test single answer
        try:
            payload = {"question": "What is the significance of the Indian Constitution?"}
            
            response = requests.post(
                f"{self.host}/api/generate_answer",
                json=payload,
                timeout=20
            )
            
            if response.status_code == 200:
                data = response.json()
                if "introduction" in data and "body" in data and "conclusion" in data:
                    self.log_success("Single answer generation working")
                else:
                    self.log_issue("Single answer generation returned unexpected format")
            else:
                self.log_issue(f"Single answer generation failed: HTTP {response.status_code}")
        
        except Exception as e:
            self.log_issue(f"Error testing single answer generation: {e}")
        
        # Test batch answers
        try:
            payload = {
                "questions": [
                    "What is democracy?",
                    "Explain federalism."
                ]
            }
            
            response = requests.post(
                f"{self.host}/api/generate_answers",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                if "answers" in data and len(data["answers"]) == 2:
                    self.log_success("Batch answer generation working")
                else:
                    self.log_issue("Batch answer generation returned unexpected format")
            else:
                self.log_issue(f"Batch answer generation failed: HTTP {response.status_code}")
        
        except Exception as e:
            self.log_issue(f"Error testing batch answer generation: {e}")
    
    def test_authenticated_endpoints(self):
        """Test authenticated endpoints (should return 401/403)"""
        print(f"\n=== Testing Authenticated Endpoints ===")
        
        auth_endpoints = [
            ("/api/user_profile", "User profile"),
            ("/api/question_history", "Question history"),
            ("/api/user_stats", "User statistics"),
            ("/api/dashboard_data", "Dashboard data")
        ]
        
        for endpoint, description in auth_endpoints:
            try:
                response = requests.get(f"{self.host}{endpoint}", timeout=10)
                if response.status_code in [401, 403]:
                    self.log_success(f"{description} properly requires authentication")
                elif response.status_code == 200:
                    self.log_issue(f"{description} should require authentication but returned 200")
                else:
                    self.log_issue(f"{description} unexpected response: HTTP {response.status_code}")
            except Exception as e:
                self.log_issue(f"Error testing {description}: {e}")
    
    def check_load_test_files(self):
        """Check if load test files are properly configured"""
        print(f"\n=== Checking Load Test Files ===")
        
        import os
        
        # Check if files exist
        required_files = [
            "locustfile.py",
            "load_test_config.py", 
            "run_load_tests.py"
        ]
        
        for file in required_files:
            if os.path.exists(file):
                self.log_success(f"File {file} exists")
            else:
                self.log_issue(f"Missing required file: {file}")
        
        # Test load_test_config import
        try:
            from load_test_config import LOAD_TEST_CONFIGS
            self.log_success(f"Load test configs available: {list(LOAD_TEST_CONFIGS.keys())}")
        except ImportError as e:
            self.log_issue(f"Cannot import load test config: {e}")
        
        # Test locustfile import
        try:
            import locustfile
            self.log_success("Locustfile can be imported")
        except ImportError as e:
            self.log_issue(f"Cannot import locustfile: {e}")
    
    def run_validation(self):
        """Run complete validation"""
        print("🧪 Load Testing Setup Validation")
        print("=" * 50)
        print(f"Target Host: {self.host}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        self.check_dependencies()
        server_ok = self.check_server_health()
        
        if server_ok:
            self.test_basic_endpoints()
            self.test_question_generation()
            self.test_answer_generation()
            self.test_authenticated_endpoints()
        
        self.check_load_test_files()
        
        # Summary
        print(f"\n=== Validation Summary ===")
        print(f"✓ Successes: {len(self.successes)}")
        print(f"✗ Issues: {len(self.issues)}")
        
        if self.issues:
            print(f"\n🚨 Issues Found:")
            for issue in self.issues:
                print(f"  {issue}")
            print(f"\nResolve these issues before running load tests.")
            return False
        else:
            print(f"\n🎉 All validations passed!")
            print(f"✅ Ready for load testing!")
            print(f"\nNext steps:")
            print(f"  python run_load_tests.py --list")
            print(f"  python run_load_tests.py light")
            return True


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Validate load testing setup")
    parser.add_argument("--host", default="http://localhost:8000", help="FastAPI server host")
    args = parser.parse_args()
    
    validator = LoadTestValidator(args.host)
    success = validator.run_validation()
    
    sys.exit(0 if success else 1)