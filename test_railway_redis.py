#!/usr/bin/env python3
"""
Railway Redis Connection Test
Tests Railway-specific Redis environment variables and connectivity
"""
import os
import redis
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_railway_redis_detection():
    """Test Railway Redis URL detection logic"""
    print("🔧 Railway Redis Detection Test")
    print("=" * 50)
    
    # Test environment variables in order of preference
    env_vars = [
        'REDISCLOUD_URL',
        'REDIS_PRIVATE_URL', 
        'REDIS_URL'
    ]
    
    print("📋 Checking environment variables:")
    for var in env_vars:
        value = os.getenv(var)
        if value:
            # Mask credentials for security
            masked_value = value.split('@')[-1] if '@' in value else value
            print(f"   ✅ {var}: {masked_value}")
        else:
            print(f"   ❌ {var}: Not set")
    
    # Apply the same logic as our updated code
    redis_url = (
        os.getenv('REDISCLOUD_URL') or      # Railway Redis Cloud
        os.getenv('REDIS_PRIVATE_URL') or  # Railway Redis Private
        os.getenv('REDIS_URL') or          # Standard Redis URL
        'redis://localhost:6379'           # Local fallback
    )
    
    masked_url = redis_url.split('@')[-1] if '@' in redis_url else redis_url
    print(f"\\n🎯 Selected Redis URL: {masked_url}")
    
    # Test connection
    print("\\n📡 Testing Redis connection...")
    try:
        client = redis.from_url(redis_url, decode_responses=True)
        client.ping()
        
        # Get basic info
        info = client.info()
        print("✅ Redis connection successful!")
        print(f"   - Redis version: {info.get('redis_version', 'Unknown')}")
        print(f"   - Used memory: {info.get('used_memory_human', 'Unknown')}")
        print(f"   - Connected clients: {info.get('connected_clients', 0)}")
        
        # Test basic operations
        print("\\n🧪 Testing basic operations...")
        client.set("test_key", "Railway Redis Works!", ex=60)
        result = client.get("test_key")
        print(f"   - Set/Get test: {'✅ Success' if result == 'Railway Redis Works!' else '❌ Failed'}")
        
        # Clean up
        client.delete("test_key")
        
        return True
        
    except Exception as e:
        print(f"❌ Redis connection failed: {e}")
        print("\\n💡 Possible solutions:")
        print("   1. Check if Redis service is added in Railway")
        print("   2. Verify environment variables are set")
        print("   3. Ensure Redis service is deployed")
        return False

def main():
    """Main test function"""
    print("🚀 Railway Redis Integration Test")
    print("=" * 60)
    
    success = test_railway_redis_detection()
    
    print("\\n" + "=" * 60)
    if success:
        print("🎉 Railway Redis integration is working correctly!")
        print("\\n✅ Your cache service and rate limiter should now connect properly")
    else:
        print("⚠️  Railway Redis integration needs attention")
        print("\\n📋 Next steps:")
        print("   1. Add Redis service in Railway dashboard")
        print("   2. Check Railway deployment logs")
        print("   3. Verify environment variables")

if __name__ == "__main__":
    main()