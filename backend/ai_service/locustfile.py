"""
Locust load testing configuration for UPSC Question Generator FastAPI service.
This file provides comprehensive load testing scenarios for all major endpoints.

Usage:
1. Install locust: pip install locust
2. Start your FastAPI server: uvicorn api.main:app --host 0.0.0.0 --port 8000
3. Run locust: locust -f locustfile.py --host=http://localhost:8000

Test scenarios included:
- Basic health checks and API status
- Question generation (topic-based and whole paper)
- Answer generation (single and batch)
- User authentication and profile management
- Subject and topic retrieval
- Rate limiting validation
"""

import json
import random
import time
from locust import HttpUser, task, between, tag
from locust.exception import StopUser


class UPSCAPILoadTest(HttpUser):
    """
    Simulates realistic user behavior for the UPSC Question Generator API.
    Users will perform various actions with different frequencies.
    """
    
    # Wait time between tasks (realistic user behavior)
    wait_time = between(1, 5)
    
    def on_start(self):
        """Setup method called when a user starts"""
        self.client.verify = False  # Disable SSL verification for local testing
        
        # Test data for various scenarios
        self.test_topics = [
            "Indian Constitution",
            "Fundamental Rights",
            "Economic Development",
            "Environmental Issues",
            "International Relations",
            "Science and Technology",
            "Indian History",
            "Geography of India",
            "Ethics in Governance",
            "Social Justice"
        ]
        
        self.test_subjects = ["GS1", "GS2", "GS3", "GS4"]
        
        self.test_questions = [
            "Discuss the significance of fundamental rights in the Indian Constitution.",
            "Analyze the impact of climate change on Indian agriculture.",
            "Evaluate the role of technology in governance.",
            "Examine the challenges of urban planning in India.",
            "Assess the importance of ethics in public administration."
        ]
        
        # Simulated user tokens for authenticated requests
        self.auth_headers = {
            "Authorization": "Bearer dummy_token_for_testing",
            "Content-Type": "application/json"
        }
        
    @tag("health")
    @task(10)  # High frequency - health checks are common
    def check_health(self):
        """Test health endpoint - most basic and frequent check"""
        with self.client.get("/health", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "status" in data and data["status"] == "healthy":
                    response.success()
                else:
                    response.failure(f"Unhealthy service: {data}")
            else:
                response.failure(f"Health check failed: {response.status_code}")
    
    @tag("basic")
    @task(8)
    def check_root(self):
        """Test root endpoint"""
        with self.client.get("/", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "message" in data and "UPSC" in data["message"]:
                    response.success()
                else:
                    response.failure(f"Unexpected root response: {data}")
            else:
                response.failure(f"Root endpoint failed: {response.status_code}")
    
    @tag("cors")
    @task(2)
    def test_cors(self):
        """Test CORS configuration"""
        self.client.get("/test-cors")
    
    @tag("subjects")
    @task(6)
    def get_subjects(self):
        """Test subjects endpoint - users browse subjects frequently"""
        with self.client.get("/api/subjects", catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "subjects" in data and len(data["subjects"]) > 0:
                    response.success()
                else:
                    response.failure(f"No subjects returned: {data}")
            else:
                response.failure(f"Subjects endpoint failed: {response.status_code}")
    
    @tag("questions", "generation")
    @task(15)  # High frequency - core functionality
    def generate_topic_questions_guest(self):
        """Test topic-based question generation as guest user"""
        topic = random.choice(self.test_topics)
        payload = {
            "topic": topic,
            "num": random.randint(3, 8),
            "use_ca": random.choice([True, False]),
            "months": random.choice([3, 6, 12]),
            "model": random.choice(["llama3-70b", "llama3-8b", "gemma2-9b"])
        }
        
        with self.client.post("/api/generate_questions", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "questions" in data and len(data["questions"]) > 0:
                    response.success()
                else:
                    response.failure(f"No questions generated: {data}")
            elif response.status_code == 429:
                # Rate limit hit - this is expected behavior
                response.success()
            else:
                response.failure(f"Question generation failed: {response.status_code}")
    
    @tag("questions", "generation", "authenticated")
    @task(8)
    def generate_topic_questions_authenticated(self):
        """Test topic-based question generation as authenticated user"""
        topic = random.choice(self.test_topics)
        payload = {
            "topic": topic,
            "num": random.randint(3, 8),
            "use_ca": random.choice([True, False]),
            "months": random.choice([3, 6, 12]),
            "model": random.choice(["llama3-70b", "llama3-8b", "gemma2-9b"])
        }
        
        with self.client.post("/api/generate_questions", 
                            json=payload, 
                            headers=self.auth_headers,
                            catch_response=True) as response:
            if response.status_code in [200, 429]:  # Both success and rate limit are valid
                response.success()
            else:
                response.failure(f"Authenticated question generation failed: {response.status_code}")
    
    @tag("questions", "paper")
    @task(5)
    def generate_whole_paper_guest(self):
        """Test whole paper generation as guest user"""
        payload = {
            "subject": random.choice(self.test_subjects),
            "use_ca": random.choice([True, False]),
            "months": random.choice([3, 6, 12]),
            "model": random.choice(["llama3-70b", "llama3-8b", "gemma2-9b"])
        }
        
        with self.client.post("/api/generate_whole_paper", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code in [200, 429]:  # Both success and rate limit are valid
                response.success()
            else:
                response.failure(f"Paper generation failed: {response.status_code}")
    
    @tag("answers")
    @task(12)  # High frequency - users generate many answers
    def generate_single_answer(self):
        """Test single answer generation - unlimited for all users"""
        question = random.choice(self.test_questions)
        payload = {"question": question}
        
        with self.client.post("/api/generate_answer", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "introduction" in data and "body" in data and "conclusion" in data:
                    response.success()
                else:
                    response.failure(f"Invalid answer format: {data}")
            else:
                response.failure(f"Answer generation failed: {response.status_code}")
    
    @tag("answers", "batch")
    @task(4)
    def generate_batch_answers(self):
        """Test batch answer generation"""
        questions = random.sample(self.test_questions, random.randint(2, 4))
        payload = {"questions": questions}
        
        with self.client.post("/api/generate_answers", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "answers" in data and len(data["answers"]) == len(questions):
                    response.success()
                else:
                    response.failure(f"Batch answer count mismatch: {data}")
            else:
                response.failure(f"Batch answer generation failed: {response.status_code}")
    
    @tag("user", "authenticated")
    @task(3)
    def get_user_profile(self):
        """Test user profile endpoint (authenticated users only)"""
        with self.client.get("/api/user_profile", 
                           headers=self.auth_headers,
                           catch_response=True) as response:
            # This will likely fail with 401/403, but we test the endpoint
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"User profile endpoint error: {response.status_code}")
    
    @tag("user", "authenticated")
    @task(2)
    def get_question_history(self):
        """Test question history endpoint"""
        with self.client.get("/api/question_history?limit=10", 
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Question history endpoint error: {response.status_code}")
    
    @tag("user", "authenticated")
    @task(2)
    def get_user_stats(self):
        """Test user statistics endpoint"""
        with self.client.get("/api/user_stats", 
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"User stats endpoint error: {response.status_code}")
    
    @tag("user", "authenticated")
    @task(2)
    def get_dashboard_data(self):
        """Test dashboard data endpoint"""
        with self.client.get("/api/dashboard_data", 
                           headers=self.auth_headers,
                           catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Dashboard data endpoint error: {response.status_code}")
    
    @tag("feedback", "authenticated")
    @task(1)
    def submit_feedback(self):
        """Test feedback submission"""
        feedback_data = {
            "generation_id": "generation_feedback",
            "rating": random.randint(1, 5),
            "comment": "Test feedback from Locust load testing"
        }
        
        with self.client.post("/api/question_feedback", 
                            json=feedback_data,
                            headers=self.auth_headers,
                            catch_response=True) as response:
            if response.status_code in [200, 401, 403]:
                response.success()
            else:
                response.failure(f"Feedback submission error: {response.status_code}")


class RateLimitTestUser(HttpUser):
    """
    Specialized user class to test rate limiting behavior.
    This user will aggressively hit the question generation endpoints
    to trigger rate limits.
    """
    
    wait_time = between(0.1, 0.5)  # Very fast requests to trigger rate limits
    weight = 1  # Lower weight so fewer of these users are created
    
    def on_start(self):
        """Setup method called when a user starts"""
        self.client.verify = False  # Disable SSL verification for local testing
        
        self.test_topics = [
            "Indian Constitution",
            "Economic Development", 
            "Environmental Issues"
        ]
        
        self.test_subjects = ["GS1", "GS2"]
    
    @tag("rate_limit", "questions")
    @task(20)
    def rapid_question_generation(self):
        """Rapidly generate questions to test rate limiting"""
        topic = random.choice(self.test_topics)
        payload = {
            "topic": topic,
            "num": 5,
            "use_ca": False,
            "months": 6,
            "model": "llama3-70b"
        }
        
        with self.client.post("/api/generate_questions", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                # Rate limit hit - expected behavior
                response.success()
                # Pause this user for a bit when rate limited
                time.sleep(5)
            else:
                response.failure(f"Unexpected response: {response.status_code}")
    
    @tag("rate_limit", "paper")
    @task(10)
    def rapid_paper_generation(self):
        """Rapidly generate papers to test rate limiting"""
        payload = {
            "subject": random.choice(self.test_subjects),
            "use_ca": False,
            "months": 6,
            "model": "llama3-70b"
        }
        
        with self.client.post("/api/generate_whole_paper", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            elif response.status_code == 429:
                # Rate limit hit - expected behavior
                response.success()
                time.sleep(5)
            else:
                response.failure(f"Unexpected response: {response.status_code}")


class AnswerOnlyUser(HttpUser):
    """
    User that only generates answers (which have no rate limits).
    This tests the unlimited answer generation feature.
    """
    
    wait_time = between(0.5, 2)
    weight = 2
    
    def on_start(self):
        """Setup method called when a user starts"""
        self.client.verify = False  # Disable SSL verification for local testing
        
        self.test_questions = [
            "Discuss the significance of fundamental rights in the Indian Constitution.",
            "Analyze the impact of climate change on Indian agriculture.",
            "Evaluate the role of technology in governance.",
            "Examine the challenges of urban planning in India.",
            "Assess the importance of ethics in public administration.",
            "Discuss the role of women in Indian freedom struggle.",
            "Analyze the impact of globalization on Indian economy.",
            "Evaluate the effectiveness of government welfare schemes."
        ]
    
    @tag("answers", "unlimited")
    @task(15)
    def continuous_answer_generation(self):
        """Continuously generate answers to test unlimited feature"""
        question = random.choice(self.test_questions)
        payload = {"question": question}
        
        with self.client.post("/api/generate_answer", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                data = response.json()
                if "introduction" in data and "body" in data and "conclusion" in data:
                    response.success()
                else:
                    response.failure(f"Invalid answer format: {data}")
            else:
                response.failure(f"Answer generation failed: {response.status_code}")
    
    @tag("answers", "batch", "unlimited")
    @task(5)
    def continuous_batch_answers(self):
        """Continuously generate batch answers"""
        questions = random.sample(self.test_questions, random.randint(2, 5))
        payload = {"questions": questions}
        
        with self.client.post("/api/generate_answers", 
                            json=payload, 
                            catch_response=True) as response:
            if response.status_code == 200:
                response.success()
            else:
                response.failure(f"Batch answer generation failed: {response.status_code}")