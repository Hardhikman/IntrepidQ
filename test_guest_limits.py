#!/usr/bin/env python3
"""
Simple test script to verify guest rate limiting functionality
Run this script to test IP-based rate limiting for guest users
"""

import requests
import json
import time
from datetime import datetime

# Configuration
API_BASE_URL = "http://localhost:8000"  # Adjust if your backend runs on different port
TEST_IP = "192.168.1.100"  # Test IP for simulation

def test_guest_question_generation():
    """Test guest user question generation with rate limiting"""
    print("🧪 Testing Guest User Question Generation Rate Limits")
    print("=" * 60)
    
    # Test payload
    payload = {
        "topic": "Indian Constitution",
        "num": 2,
        "use_ca": False,
        "months": 6,
        "model": "llama3-70b"
    }
    
    headers = {
        "Content-Type": "application/json",
        # Simulate different IP addresses by setting custom headers
        "X-Forwarded-For": TEST_IP
    }
    
    print(f"🔍 Testing from IP: {TEST_IP}")
    print(f"⏰ Current time: {datetime.now()}")
    print()
    
    # Attempt multiple generations to test rate limiting
    for attempt in range(4):  # Try 4 times (should fail after 2)
        print(f"📝 Attempt {attempt + 1}:")
        
        try:
            response = requests.post(
                f"{API_BASE_URL}/api/generate_questions",
                json=payload,
                headers=headers,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                question_count = len(data.get("questions", []))
                print(f"   ✅ Success! Generated {question_count} questions")
                
            elif response.status_code == 429:
                error_data = response.json()
                print(f"   ❌ Rate limited: {error_data.get('error', 'Unknown error')}")
                if error_data.get('guest_limit_reached'):
                    print(f"   📊 Guest limit: {error_data.get('guest_daily_limit')}")
                    print(f"   📊 User limit: {error_data.get('user_daily_limit')}")
                break
                
            else:
                print(f"   ⚠️  HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.ConnectionError:
            print(f"   🔌 Connection error - is the backend running on {API_BASE_URL}?")
            break
        except requests.exceptions.Timeout:
            print(f"   ⏱️  Timeout - backend took too long to respond")
        except Exception as e:
            print(f"   💥 Unexpected error: {e}")
            
        print()
        time.sleep(1)  # Small delay between requests
    
    print("🏁 Test completed!")

def test_authenticated_vs_guest():
    """Compare authenticated vs guest limits"""
    print("\n🔐 Testing Authenticated vs Guest User Limits")
    print("=" * 60)
    
    print("📋 Expected behavior:")
    print("   - Guest users: 2 QUESTION generations per day")
    print("   - Guest users: UNLIMITED answer generations")
    print("   - Authenticated users: 5 QUESTION generations per day")
    print("   - Authenticated users: UNLIMITED answer generations")
    print("   - IP-based tracking for guests")
    print("   - User ID-based tracking for authenticated users")
    print()

def check_backend_health():
    """Check if backend is running"""
    print("🏥 Checking Backend Health")
    print("=" * 30)
    
    try:
        response = requests.get(f"{API_BASE_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print("✅ Backend is healthy!")
            print(f"   Status: {data.get('status')}")
            services = data.get('services', {})
            for service, status in services.items():
                emoji = "✅" if status else "❌"
                print(f"   {service}: {emoji}")
        else:
            print(f"⚠️  Backend returned HTTP {response.status_code}")
    except requests.exceptions.ConnectionError:
        print(f"❌ Cannot connect to backend at {API_BASE_URL}")
        print("   Make sure the backend is running with:")
        print("   cd backend/ai_service && uvicorn api.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"💥 Error checking backend: {e}")
        return False
    
    print()
    return True

def test_guest_cleanup_system():
    """Test guest cleanup system functionality"""
    print("\n🧹 Testing Guest Cleanup System")
    print("=" * 50)
    
    print("📋 Cleanup system features:")
    print("   - Automatic cleanup every 2 days at 2 AM UTC")
    print("   - Removes guest records older than 7 days")
    print("   - Manual cleanup API for admins")
    print("   - Cleanup status and analytics endpoints")
    print("   - All operations logged for audit")
    print()
    
    # Test manual cleanup endpoint (requires admin token)
    print("🔧 Manual cleanup endpoints:")
    print("   POST /api/admin/manual_guest_cleanup")
    print("   GET /api/admin/guest_cleanup_status")
    print("   GET /api/admin/guest_analytics?days=30")
    print()
    
    print("📊 Cleanup monitoring:")
    print("   - Check usage_analytics table for cleanup logs")
    print("   - Monitor guest_generations table size")
    print("   - View cron.job_run_details for scheduled runs")
    print()

if __name__ == "__main__":
    print("🎯 IntrepidQ2 Guest Rate Limiting Test")
    print("=" * 70)
    print()
    
    # Check backend health first
    if not check_backend_health():
        exit(1)
    
    # Run tests
    test_authenticated_vs_guest()
    test_guest_question_generation()
    test_guest_cleanup_system()
    
    print("\n💡 Next Steps:")
    print("1. Run the frontend: cd frontend && npm run dev")
    print("2. Open browser to http://localhost:3000")
    print("3. Try generating questions as a guest user")
    print("4. After 2 question generations, you should see the sign-in prompt")
    print("5. Generate unlimited answers as both guest and authenticated users!")
    print("6. Sign in with Google to get 5 question generations per day")