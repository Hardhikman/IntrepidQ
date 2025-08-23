#!/usr/bin/env python3
"""
KeyDB Connection Test for IntrepidQ2
Verifies that KeyDB is working correctly with the cache service
"""
import sys
import os
import time
import asyncio
from datetime import datetime

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from core.cache_service import get_cache_service
    print("✅ Cache service imports successful")
except ImportError as e:
    print(f"❌ Import error: {e}")
    print("Make sure you're running this from the backend/ai_service directory")
    sys.exit(1)

async def test_keydb_connection():
    """Test KeyDB connection and basic operations"""
    print("🔧 KeyDB Connection Test for IntrepidQ2")
    print("=" * 50)
    
    cache_service = get_cache_service()
    
    # Test 1: Connection Test
    print("\n1. 📡 Testing KeyDB Connection...")
    stats = cache_service.get_cache_stats()
    if stats["status"] == "active":
        print("✅ KeyDB connection successful!")
        print(f"   - Memory usage: {stats.get('used_memory', 'N/A')}")
        print(f"   - Connected clients: {stats.get('connected_clients', 'N/A')}")
    elif stats["status"] == "disabled":
        print("⚠️  KeyDB connection failed - caching disabled")
        print("   Make sure KeyDB is running: docker-compose up keydb")
        return False
    else:
        print(f"❌ KeyDB error: {stats.get('error', 'Unknown error')}")
        return False
    
    # Test 2: Cache Operations Test
    print("\n2. 💾 Testing Cache Operations...")
    
    # Test data
    test_topic = "Indian Constitution Test"
    test_model = "llama3-70b"
    test_questions = {
        "questions": [
            {"id": 1, "text": "Test question about Indian Constitution"},
            {"id": 2, "text": "Another test question"}
        ],
        "metadata": {
            "generated_at": datetime.now().isoformat(),
            "test_run": True
        }
    }
    
    # Test cache set
    print("   - Setting cache...")
    await cache_service.cache_questions(
        questions=test_questions,
        topic=test_topic,
        model=test_model,
        num=2,
        ttl=60  # 1 minute for test
    )
    
    # Test cache get
    print("   - Getting from cache...")
    cached_result = await cache_service.get_cached_questions(
        topic=test_topic,
        model=test_model,
        num=2
    )
    
    if cached_result:
        print("✅ Cache operations successful!")
        print(f"   - Cached at: {cached_result.get('cached_at', 'N/A')}")
        print(f"   - Questions count: {len(cached_result['questions']['questions'])}")
    else:
        print("❌ Cache operations failed!")
        return False
    
    # Test 3: Performance Test
    print("\n3. ⚡ Testing Cache Performance...")
    
    start_time = time.time()
    
    # Multiple cache operations
    for i in range(10):
        await cache_service.cache_questions(
            questions={"test": f"performance_test_{i}"},
            topic=f"Performance Test {i}",
            model="test-model",
            num=1,
            ttl=30
        )
    
    end_time = time.time()
    operations_time = (end_time - start_time) * 1000  # Convert to milliseconds
    
    print(f"✅ Performance test completed!")
    print(f"   - 10 cache operations in {operations_time:.2f}ms")
    print(f"   - Average: {operations_time/10:.2f}ms per operation")
    
    # Test 4: Cache Statistics
    print("\n4. 📊 Final Cache Statistics...")
    final_stats = cache_service.get_cache_stats()
    print(f"   - Status: {final_stats['status']}")
    print(f"   - Hit ratio: {final_stats.get('hit_ratio', 0):.2f}%")
    print(f"   - Total commands: {final_stats.get('total_commands_processed', 'N/A')}")
    
    print("\n🎉 KeyDB test completed successfully!")
    print("\n💡 Next steps:")
    print("   1. Start full system: docker-compose up --build")
    print("   2. Test API endpoints: curl http://localhost:8000/health")
    print("   3. Generate questions to test caching in action")
    
    return True

async def test_rate_limiter():
    """Test rate limiter functionality"""
    print("\n5. 🛡️  Testing Rate Limiter...")
    
    try:
        from core.rate_limiter import RateLimitMiddleware
        print("✅ Rate limiter imports successful")
        
        # Test rate limiter initialization
        rate_limiter = RateLimitMiddleware(
            app=None,  # Mock app for testing
            calls_per_minute=60,
            redis_url="redis://localhost:6379"
        )
        
        print("✅ Rate limiter initialized successfully")
        print("   - Calls per minute: 60")
        print("   - KeyDB backend configured")
        
    except Exception as e:
        print(f"❌ Rate limiter test failed: {e}")
        return False
    
    return True

async def main():
    """Main test function"""
    try:
        # Test cache service
        cache_success = await test_keydb_connection()
        
        # Test rate limiter
        rate_limiter_success = await test_rate_limiter()
        
        if cache_success and rate_limiter_success:
            print(f"\n🚀 All tests passed! KeyDB is ready for IntrepidQ2 UPSC platform")
            return True
        else:
            print(f"\n⚠️  Some tests failed. Check the output above.")
            return False
            
    except Exception as e:
        print(f"\n❌ Test failed with error: {e}")
        return False

if __name__ == "__main__":
    success = asyncio.run(main())
    sys.exit(0 if success else 1)