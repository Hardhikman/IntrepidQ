#!/usr/bin/env python3
"""
IntrepidQ2 Startup Diagnostic and Fix Script
Checks and resolves common startup issues
"""
import subprocess
import sys
import os
import time
import requests
from typing import List, Tuple

def run_command(command: str, shell: bool = True) -> Tuple[bool, str]:
    """Run a command and return success status and output"""
    try:
        result = subprocess.run(
            command, 
            shell=shell, 
            capture_output=True, 
            text=True, 
            timeout=30
        )
        return result.returncode == 0, result.stdout + result.stderr
    except subprocess.TimeoutExpired:
        return False, "Command timed out"
    except Exception as e:
        return False, str(e)

def check_docker_status() -> bool:
    """Check if Docker Desktop is running"""
    print("🐳 Checking Docker status...")
    success, output = run_command("docker ps")
    if success:
        print("✅ Docker is running")
        return True
    else:
        print("❌ Docker is not running")
        print("   Please start Docker Desktop and wait for it to fully initialize")
        return False

def check_keydb_status() -> bool:
    """Check if KeyDB container is running"""
    print("🔧 Checking KeyDB status...")
    success, output = run_command("docker ps -f name=keydb")
    
    if "keydb" in output:
        print("✅ KeyDB container is running")
        return True
    else:
        print("❌ KeyDB container is not running")
        return False

def start_keydb() -> bool:
    """Start KeyDB using the preferred method"""
    print("🚀 Starting KeyDB...")
    
    # First, try to remove any existing keydb container
    run_command("docker rm -f keydb", shell=True)
    
    # Start KeyDB with the configuration from project memory
    success, output = run_command(
        "docker run -d --name keydb -p 6379:6379 eqalpha/keydb:latest --server-threads 4"
    )
    
    if success:
        print("✅ KeyDB started successfully")
        # Wait a moment for KeyDB to initialize
        print("   Waiting for KeyDB to initialize...")
        time.sleep(5)
        return True
    else:
        print(f"❌ Failed to start KeyDB: {output}")
        return False

def test_keydb_connection() -> bool:
    """Test KeyDB connection"""
    print("📡 Testing KeyDB connection...")
    try:
        import redis
        client = redis.Redis(host='localhost', port=6379, decode_responses=True)
        client.ping()
        print("✅ KeyDB connection successful")
        return True
    except Exception as e:
        print(f"❌ KeyDB connection failed: {e}")
        return False

def check_python_dependencies() -> bool:
    """Check if all Python dependencies are installed"""
    print("🐍 Checking Python dependencies...")
    
    try:
        # Check critical imports
        import fastapi
        import starlette
        import redis
        print("✅ Critical dependencies are available")
        
        # Check FastAPI middleware import specifically
        from starlette.middleware.base import BaseHTTPMiddleware
        print("✅ FastAPI middleware import works")
        return True
        
    except ImportError as e:
        print(f"❌ Missing dependency: {e}")
        print("   Run: pip install -r requirements.txt")
        return False

def install_dependencies() -> bool:
    """Install missing dependencies"""
    print("📦 Installing dependencies...")
    
    # Change to backend directory
    backend_dir = os.path.join(os.path.dirname(__file__), "backend", "ai_service")
    if os.path.exists(backend_dir):
        os.chdir(backend_dir)
        success, output = run_command("pip install -r requirements.txt")
        if success:
            print("✅ Dependencies installed successfully")
            return True
        else:
            print(f"❌ Failed to install dependencies: {output}")
            return False
    else:
        print("❌ Backend directory not found")
        return False

def run_keydb_test() -> bool:
    """Run the KeyDB test script"""
    print("🧪 Running KeyDB test...")
    
    backend_dir = os.path.join(os.path.dirname(__file__), "backend", "ai_service")
    if os.path.exists(backend_dir):
        os.chdir(backend_dir)
        success, output = run_command("python test_keydb.py")
        print(output)
        return success
    else:
        print("❌ Backend directory not found")
        return False

def main():
    """Main diagnostic and fix routine"""
    print("🔍 IntrepidQ2 Startup Diagnostic Tool")
    print("=" * 50)
    
    issues_found = []
    fixes_applied = []
    
    # Step 1: Check Docker
    if not check_docker_status():
        issues_found.append("Docker not running")
        print("\n💡 Fix: Start Docker Desktop and wait for it to initialize")
        print("   Then run this script again")
        return
    
    # Step 2: Check/Start KeyDB
    if not check_keydb_status():
        issues_found.append("KeyDB not running")
        if start_keydb():
            fixes_applied.append("KeyDB started")
        else:
            print("\n❌ Could not start KeyDB. Please check Docker Desktop is fully running.")
            return
    
    # Step 3: Test KeyDB connection
    if not test_keydb_connection():
        issues_found.append("KeyDB connection failed")
        print("\n💡 KeyDB may need more time to start. Waiting 10 seconds...")
        time.sleep(10)
        if not test_keydb_connection():
            print("❌ KeyDB still not responding. Check Docker logs:")
            print("   docker logs keydb")
            return
    
    # Step 4: Check Python dependencies
    if not check_python_dependencies():
        issues_found.append("Missing Python dependencies")
        if install_dependencies():
            fixes_applied.append("Dependencies installed")
        else:
            return
    
    # Step 5: Run comprehensive test
    print("\n🧪 Running comprehensive test...")
    if run_keydb_test():
        print("\n🎉 All tests passed! Your IntrepidQ2 setup is ready.")
    else:
        print("\n⚠️  Some tests failed. Check the output above for details.")
    
    # Summary
    print("\n📋 Summary:")
    if issues_found:
        print(f"   Issues found: {', '.join(issues_found)}")
    if fixes_applied:
        print(f"   Fixes applied: {', '.join(fixes_applied)}")
    
    print("\n🚀 Next steps:")
    print("   1. Start backend: python -m uvicorn api.main:app --reload --host 0.0.0.0 --port 8000")
    print("   2. Start frontend: cd frontend && npm run dev")
    print("   3. Access app: http://localhost:3000")

if __name__ == "__main__":
    main()