#!/usr/bin/env python3
"""
Load Test Runner for UPSC Question Generator API

This script provides an easy way to run different load testing scenarios
with proper setup, monitoring, and result collection.

Usage:
    python run_load_tests.py [config_name] [options]

Examples:
    python run_load_tests.py light                    # Run light load test
    python run_load_tests.py normal --web-ui          # Run normal test with web UI
    python run_load_tests.py heavy --monitor          # Run heavy test with monitoring
    python run_load_tests.py --list                   # List all available configs
"""

import argparse
import subprocess
import sys
import time
import os
import requests
from datetime import datetime
from load_test_config import LOAD_TEST_CONFIGS, generate_locust_command, print_available_configs


def check_server_health(host: str = "http://localhost:8000") -> bool:
    """Check if the FastAPI server is running and healthy"""
    try:
        response = requests.get(f"{host}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            return data.get("status") == "healthy"
    except Exception as e:
        print(f"Health check failed: {e}")
    return False


def check_dependencies():
    """Check if required dependencies are installed"""
    try:
        import locust
        print(f"✓ Locust installed (version: {locust.__version__})")
        return True
    except ImportError:
        print("✗ Locust not installed. Install with: pip install locust")
        return False


def run_load_test(config_name: str, use_web_ui: bool = False, monitor: bool = False, 
                 custom_host: str = None) -> bool:
    """Run a specific load test configuration"""
    
    if config_name not in LOAD_TEST_CONFIGS:
        print(f"Error: Unknown config '{config_name}'")
        print("Available configs:", list(LOAD_TEST_CONFIGS.keys()))
        return False
    
    config = LOAD_TEST_CONFIGS[config_name]
    host = custom_host or config.host
    
    print(f"\n=== Starting {config.name} ===")
    print(f"Description: {config.description}")
    print(f"Target: {host}")
    print(f"Users: {config.users}")
    print(f"Spawn Rate: {config.spawn_rate}/sec")
    print(f"Duration: {config.run_time}")
    
    # Check server health
    print(f"\nChecking server health at {host}...")
    if not check_server_health(host):
        print(f"✗ Server at {host} is not healthy or not running")
        print("Make sure your FastAPI server is running:")
        print("  uvicorn api.main:app --host 0.0.0.0 --port 8000")
        return False
    print("✓ Server is healthy")
    
    # Generate command
    if use_web_ui:
        # Web UI mode - user controls execution
        cmd_parts = [
            "locust", 
            "-f", "locustfile.py",
            "--host", host,
            "--web-host", "0.0.0.0",
            "--web-port", "8089"
        ]
        if config.tags:
            cmd_parts.extend(["--tags", ",".join(config.tags)])
        
        print(f"\nStarting Locust Web UI...")
        print(f"Open http://localhost:8089 in your browser")
        print(f"Recommended settings:")
        print(f"  Number of users: {config.users}")
        print(f"  Spawn rate: {config.spawn_rate}")
        print(f"  Host: {host}")
        
    else:
        # Headless mode - automated execution
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        results_prefix = f"results_{config_name}_{timestamp}"
        
        cmd_parts = [
            "locust",
            "-f", "locustfile.py", 
            "--host", host,
            "--users", str(config.users),
            "--spawn-rate", str(config.spawn_rate),
            "--run-time", config.run_time,
            "--headless",
            "--csv", results_prefix,
            "--html", f"{results_prefix}_report.html"
        ]
        
        if config.tags:
            cmd_parts.extend(["--tags", ",".join(config.tags)])
        
        print(f"\nRunning headless test...")
        print(f"Results will be saved with prefix: {results_prefix}")
    
    # Execute the test
    try:
        print(f"\nExecuting: {' '.join(cmd_parts)}")
        print("=" * 60)
        
        if monitor:
            print("Monitoring mode enabled - will show periodic stats")
        
        result = subprocess.run(cmd_parts, cwd=os.getcwd())
        
        if result.returncode == 0:
            print(f"\n✓ Load test '{config_name}' completed successfully")
            if not use_web_ui:
                print(f"Check the generated HTML report: {results_prefix}_report.html")
            return True
        else:
            print(f"\n✗ Load test '{config_name}' failed with exit code: {result.returncode}")
            return False
            
    except KeyboardInterrupt:
        print(f"\n\nLoad test interrupted by user")
        return False
    except Exception as e:
        print(f"\nError running load test: {e}")
        return False


def main():
    parser = argparse.ArgumentParser(
        description="Load Test Runner for UPSC Question Generator API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_load_tests.py light                    # Run light load test
  python run_load_tests.py normal --web-ui          # Run with web interface
  python run_load_tests.py heavy --host http://staging:8000  # Test staging server
  python run_load_tests.py rate_limit --monitor     # Run with monitoring
  python run_load_tests.py --list                   # List all configurations
        """
    )
    
    parser.add_argument(
        "config",
        nargs="?",
        help="Load test configuration to run",
        choices=list(LOAD_TEST_CONFIGS.keys())
    )
    
    parser.add_argument(
        "--list",
        action="store_true",
        help="List all available test configurations"
    )
    
    parser.add_argument(
        "--web-ui",
        action="store_true", 
        help="Run with Locust web UI (interactive mode)"
    )
    
    parser.add_argument(
        "--monitor",
        action="store_true",
        help="Enable monitoring mode with periodic stats"
    )
    
    parser.add_argument(
        "--host",
        help="Custom host URL (overrides config default)"
    )
    
    parser.add_argument(
        "--check-deps",
        action="store_true",
        help="Check if required dependencies are installed"
    )
    
    args = parser.parse_args()
    
    # Handle special commands
    if args.list:
        print_available_configs()
        return
    
    if args.check_deps:
        if check_dependencies():
            print("✓ All dependencies are installed")
        else:
            print("✗ Missing dependencies")
            sys.exit(1)
        return
    
    # Validate config argument
    if not args.config:
        parser.print_help()
        print(f"\nAvailable configs: {list(LOAD_TEST_CONFIGS.keys())}")
        sys.exit(1)
    
    # Check dependencies before running
    if not check_dependencies():
        print("Please install required dependencies first:")
        print("pip install locust")
        sys.exit(1)
    
    # Run the test
    success = run_load_test(
        config_name=args.config,
        use_web_ui=args.web_ui,
        monitor=args.monitor,
        custom_host=args.host
    )
    
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()