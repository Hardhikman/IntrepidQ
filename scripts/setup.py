#!/usr/bin/env python3
"""
Complete setup script for UPSC Question Generator
"""
import os
import subprocess
import sys
from pathlib import Path


def run_command(command: str, cwd: str = None, check: bool = True) -> str:
    """Run a shell command and return output"""
    try:
        result = subprocess.run(
            command, 
            shell=True, 
            cwd=cwd, 
            capture_output=True, 
            text=True,
            check=check
        )
        if result.stdout:
            print(result.stdout)
        return result.stdout
    except subprocess.CalledProcessError as e:
        print(f"Command failed: {command}")
        print(f"Error: {e.stderr}")
        if check:
            sys.exit(1)
        return ""


def setup_backend():
    """Setup backend AI service"""
    print("Setting up backend AI service...")
    
    backend_dir = "backend/ai_service"
    
    # Create directories
    os.makedirs(f"{backend_dir}/data", exist_ok=True)
    os.makedirs(f"{backend_dir}/pyq_data", exist_ok=True)
    
    # Create virtual environment
    if not os.path.exists(f"{backend_dir}/venv"):
        print("Creating Python virtual environment...")
        run_command("python -m venv venv", cwd=backend_dir)
    else:
        print("Virtual environment already exists, skipping creation...")
    
    # Install dependencies
    print("Installing Python dependencies...")
    if os.name == 'nt':  # Windows
        pip_cmd = "venv\\Scripts\\pip"
        python_cmd = "venv\\Scripts\\python"
    else:  # Unix/Linux/Mac
        pip_cmd = "venv/bin/pip"
        python_cmd = "venv/bin/python"
    
    run_command(f"{pip_cmd} install --upgrade pip", cwd=backend_dir)
    
    # Check if requirements.txt exists
    if os.path.exists(f"{backend_dir}/requirements.txt"):
        run_command(f"{pip_cmd} install -r requirements.txt", cwd=backend_dir)
    else:
        print("Warning: requirements.txt not found, skipping dependency installation")
    
    # Check if PDF files exist
    pdf_files = list(Path(f"{backend_dir}/pyq_data").glob("*.pdf"))
    if pdf_files:
        print(f"Found {len(pdf_files)} PDF files")
        print("Processing PDFs and creating vector index...")
        
        # Create the processing script
        process_script = """
import sys
sys.path.append('.')
from core.pdf_parser import create_pdf_parser
from core.vector_indexer import create_index
import json
import os


print("Processing PDFs...")
parser = create_pdf_parser()
final_map, organized = parser.process_directory("pyq_data")


# Save both formats
os.makedirs("data", exist_ok=True)
with open("data/chunks.json", "w", encoding="utf-8") as f:
    flat_output = [{"topic": topic, "questions": qs} for topic, qs in final_map.items()]
    json.dump(flat_output, f, ensure_ascii=False, indent=2)


with open("data/chunks_organized.json", "w", encoding="utf-8") as f:
    json.dump(organized, f, ensure_ascii=False, indent=2)


print("Creating vector index...")
create_index("data")
print("Backend setup complete!")
"""
        
        with open(f"{backend_dir}/process_data.py", "w", encoding="utf-8") as f:
            f.write(process_script)

        run_command(f"{python_cmd} process_data.py", cwd=backend_dir)
        os.remove(f"{backend_dir}/process_data.py")
    else:
        print("No PDF files found in pyq_data/")
        print("   Please add your PDF files to backend/ai_service/pyq_data/")
    
    print("Backend setup complete!")


def setup_frontend():
    """Setup frontend"""
    print("Setting up frontend...")
    
    frontend_dir = "frontend"
    
    if not os.path.exists(f"{frontend_dir}/package.json"):
        print("Initializing Next.js project...")
        os.makedirs(frontend_dir, exist_ok=True)
        
        # Create package.json
        package_json = """{
  "name": "upsc-question-generator-frontend",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build", 
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "14.0.3",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}"""
        
        with open(f"{frontend_dir}/package.json", "w") as f:
            f.write(package_json)
    else:
        print("package.json already exists, skipping creation...")
    
    # Install dependencies
    print("Installing frontend dependencies...")
    run_command("npm install", cwd=frontend_dir)
    
    # Install additional packages only if they're not already installed
    print("Installing additional frontend packages...")
    packages = [
        "@supabase/supabase-js",
        "@supabase/auth-ui-react", 
        "@supabase/auth-ui-shared",
        "axios",
        "@radix-ui/react-accordion",
        "@radix-ui/react-slot",
        "@radix-ui/react-select",
        "@radix-ui/react-switch",
        "@radix-ui/react-slider",
        "@radix-ui/react-tabs",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-label",
        "class-variance-authority",
        "clsx",
        "lucide-react",
        "tailwind-merge",
        "tailwindcss-animate",
        "react-hot-toast"
    ]
    
    dev_packages = [
        "@types/node",
        "@types/react",
        "@types/react-dom",
        "autoprefixer",
        "eslint",
        "eslint-config-next",
        "postcss",
        "tailwindcss",
        "typescript"
    ]
    
    run_command(f"npm install {' '.join(packages)}", cwd=frontend_dir)
    run_command(f"npm install -D {' '.join(dev_packages)}", cwd=frontend_dir)
    
    # Initialize shadcn/ui if not exists
    if not os.path.exists(f"{frontend_dir}/components.json"):
        print("Initializing shadcn/ui...")
        run_command("npx shadcn-ui@latest init --yes --force", cwd=frontend_dir, check=False)
    else:
        print("shadcn/ui already initialized, skipping...")
    
    print("Frontend setup complete!")


def create_env_files():
    """Create environment files only if they don't exist"""
    backend_env_path = "backend/ai_service/.env"
    frontend_env_path = "frontend/.env.local"
    
    # Check if backend .env exists
    if os.path.exists(backend_env_path):
        print("Backend .env file already exists, skipping creation...")
    else:
        print("Creating backend environment file...")
        backend_env = """# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here


# AI Service Configuration  
GROQ_API_KEY=your-groq-api-key-here
NEWSAPI_KEY=your-news-api-key-here
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
GROQ_MODEL=llama3-70b-8192
GROQ_TEMPERATURE=0.4


# Data Configuration
FAISS_DIR=data/faiss_db


# Server Configuration
HOST=0.0.0.0
PORT=8000
CORS_ALLOWED_ORIGINS=http://localhost:3000,https://your-frontend.vercel.app
"""
        
        with open(backend_env_path, "w") as f:
            f.write(backend_env)
    
    # Check if frontend .env.local exists
    if os.path.exists(frontend_env_path):
        print("Frontend .env.local file already exists, skipping creation...")
    else:
        print("Creating frontend environment file...")
        frontend_env = """NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
NEXT_PUBLIC_API_URL=http://localhost:8000
"""
        
        os.makedirs("frontend", exist_ok=True)
        with open(frontend_env_path, "w") as f:
            f.write(frontend_env)


def create_gitignore():
    """Create .gitignore file only if it doesn't exist"""
    gitignore_path = ".gitignore"
    
    if os.path.exists(gitignore_path):
        print(".gitignore file already exists, skipping creation...")
    else:
        print("Creating .gitignore file...")
        gitignore_content = """# Dependencies
node_modules/
venv/
__pycache__/
*.pyc


# Environment files
.env
.env.local
.env.production


# Data files
backend/ai_service/data/
backend/ai_service/pyq_data/*.pdf
backend/ai_service/news_cache/


# Build outputs
.next/
dist/
build/


# Logs
*.log
logs/


# OS generated files
.DS_Store
Thumbs.db


# IDE files
.vscode/
.idea/
*.swp
*.swo


# Temporary files
*.tmp
*.temp
"""
        
        with open(gitignore_path, "w") as f:
            f.write(gitignore_content)


def main():
    """Main setup function"""
    print("Setting up UPSC Question Generator...")
    print("=" * 50)
    
    # Create project structure
    print("Creating project structure...")
    os.makedirs("backend/ai_service/core", exist_ok=True)
    os.makedirs("backend/ai_service/api/routes", exist_ok=True)
    os.makedirs("frontend/components/ui", exist_ok=True)
    os.makedirs("frontend/lib", exist_ok=True)
    os.makedirs("frontend/hooks", exist_ok=True)
    os.makedirs("scripts", exist_ok=True)
    
    # Setup backend
    setup_backend()
    
    # Setup frontend  
    setup_frontend()
    
    # Create environment files (only if they don't exist)
    create_env_files()
    
    # Create .gitignore (only if it doesn't exist)
    create_gitignore()
    
    print("\n" + "=" * 50)
    print("Setup completed successfully!")
    print("\nNext steps:")
    print("1. Setup Supabase:")
    print("   - Create project at https://supabase.com")
    print("   - Run the SQL schema from the documentation")
    print("   - Update Supabase keys in .env files")
    print()
    print("2. Get API Keys:")
    print("   - Groq API key from https://console.groq.com")
    print("   - NewsAPI key from https://newsapi.org")
    print("   - Update keys in backend/ai_service/.env")
    print()
    print("3. Add PDF Files:")
    print("   - Place UPSC question paper PDFs in backend/ai_service/pyq_data/")
    print("   - Re-run setup to process them")
    print()
    print("4. Start the application:")
    print("   Backend:  cd backend/ai_service && venv\\Scripts\\activate && python -m api.main")
    print("   Frontend: cd frontend && npm run dev")
    print()
    print("5. Access your app:")
    print("   Frontend: http://localhost:3000")
    print("   API Docs: http://localhost:8000/docs")


if __name__ == "__main__":
    main()