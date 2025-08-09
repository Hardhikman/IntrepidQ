#!/usr/bin/env python3
"""
Deployment script for UPSC Question Generator
Handles deployment to various platforms (Vercel, Railway, etc.)
"""

import os
import subprocess
import sys
import argparse
import json
from pathlib import Path

class DeploymentManager:
    def __init__(self, platform="vercel"):
        self.platform = platform
        self.project_root = Path(__file__).parent.parent
        self.backend_path = self.project_root / "backend" / "ai_service"
        self.frontend_path = self.project_root / "frontend"
        
    def check_dependencies(self):
        """Check if required tools are installed"""
        required_tools = {
            "vercel": ["vercel", "--version"],
            "docker": ["docker", "--version"],
            "git": ["git", "--version"]
        }
        
        missing_tools = []
        for tool, cmd in required_tools.items():
            try:
                subprocess.run(cmd, check=True, capture_output=True)
                print(f"✅ {tool} is installed")
            except (subprocess.CalledProcessError, FileNotFoundError):
                missing_tools.append(tool)
                print(f"❌ {tool} is not installed or not in PATH")
        
        if missing_tools:
            print(f"\nPlease install the following tools: {', '.join(missing_tools)}")
            return False
        return True
    
    def check_environment_files(self):
        """Check if environment files exist"""
        env_files = [
            self.backend_path / ".env",
            self.frontend_path / ".env.local",
            self.project_root / ".env.example"
        ]
        
        missing_files = []
        for env_file in env_files:
            if not env_file.exists():
                missing_files.append(str(env_file))
                print(f"⚠️  Missing environment file: {env_file}")
            else:
                print(f"✅ Found environment file: {env_file}")
        
        if missing_files:
            print("\nPlease create the missing environment files before deploying.")
            return False
        return True
    
    def build_frontend(self):
        """Build the frontend application"""
        print("🏗️  Building frontend...")
        try:
            os.chdir(self.frontend_path)
            
            # Install dependencies
            subprocess.run(["npm", "install"], check=True)
            print("✅ Frontend dependencies installed")
            
            # Build the application
            subprocess.run(["npm", "run", "build"], check=True)
            print("✅ Frontend built successfully")
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Frontend build failed: {e}")
            return False
        finally:
            os.chdir(self.project_root)
    
    def test_backend(self):
        """Run backend tests"""
        print("🧪 Testing backend...")
        try:
            os.chdir(self.backend_path)
            
            # Install dependencies
            subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"], check=True)
            print("✅ Backend dependencies installed")
            
            # Run tests if they exist
            test_files = list(Path(".").glob("**/test_*.py")) + list(Path(".").glob("**/*_test.py"))
            if test_files:
                subprocess.run([sys.executable, "-m", "pytest"], check=True)
                print("✅ Backend tests passed")
            else:
                print("ℹ️  No backend tests found")
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Backend tests failed: {e}")
            return False
        finally:
            os.chdir(self.project_root)
    
    def deploy_to_vercel(self):
        """Deploy to Vercel"""
        print("🚀 Deploying to Vercel...")
        try:
            # Deploy frontend
            os.chdir(self.frontend_path)
            subprocess.run(["vercel", "--prod"], check=True)
            print("✅ Frontend deployed to Vercel")
            
            # Deploy backend
            os.chdir(self.backend_path)
            subprocess.run(["vercel", "--prod"], check=True)
            print("✅ Backend deployed to Vercel")
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Vercel deployment failed: {e}")
            return False
        finally:
            os.chdir(self.project_root)
    
    def deploy_with_docker(self):
        """Deploy using Docker Compose"""
        print("🐳 Deploying with Docker...")
        try:
            # Build and start services
            subprocess.run(["docker-compose", "build"], check=True)
            subprocess.run(["docker-compose", "up", "-d"], check=True)
            print("✅ Services deployed with Docker")
            
            return True
        except subprocess.CalledProcessError as e:
            print(f"❌ Docker deployment failed: {e}")
            return False
    
    def run_deployment(self, skip_tests=False, skip_build=False):
        """Run the complete deployment process"""
        print("🚀 Starting deployment process...")
        
        # Check dependencies
        if not self.check_dependencies():
            return False
        
        # Check environment files
        if not self.check_environment_files():
            return False
        
        # Build frontend
        if not skip_build and not self.build_frontend():
            return False
        
        # Test backend
        if not skip_tests and not self.test_backend():
            return False
        
        # Deploy based on platform
        if self.platform == "vercel":
            success = self.deploy_to_vercel()
        elif self.platform == "docker":
            success = self.deploy_with_docker()
        else:
            print(f"❌ Unsupported platform: {self.platform}")
            return False
        
        if success:
            print("🎉 Deployment completed successfully!")
            return True
        else:
            print("❌ Deployment failed!")
            return False

def main():
    parser = argparse.ArgumentParser(description="Deploy UPSC Question Generator")
    parser.add_argument(
        "--platform",
        choices=["vercel", "docker"],
        default="vercel",
        help="Deployment platform (default: vercel)"
    )
    parser.add_argument(
        "--skip-tests",
        action="store_true",
        help="Skip running tests"
    )
    parser.add_argument(
        "--skip-build",
        action="store_true",
        help="Skip building frontend"
    )
    
    args = parser.parse_args()
    
    deployer = DeploymentManager(platform=args.platform)
    success = deployer.run_deployment(
        skip_tests=args.skip_tests,
        skip_build=args.skip_build
    )
    
    sys.exit(0 if success else 1)

if __name__ == "__main__":
    main()

