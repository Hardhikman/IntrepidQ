# UPSC Question Generator

An AI-powered application that generates UPSC exam questions from PDF documents using advanced NLP and vector search technologies.

## 🚀 Features

- **PDF Processing**: Extract and parse content from UPSC study materials
- **AI Question Generation**: Generate contextual questions using Groq's fast LLM models
- **Vector Search**: Efficient content indexing and retrieval using FAISS
- **User Authentication**: Secure user management with Supabase Auth
- **Modern UI**: Clean, responsive interface built with Next.js and Tailwind CSS
- **Question History**: Track and manage generated questions
- **Subject Organization**: Organize content by subjects and topics

## 🏗️ Architecture

### Backend (FastAPI)
- **API Layer**: RESTful APIs for question generation and user management
- **Core Services**: PDF parsing, vector indexing, and question generation
- **Database**: Supabase for user data and question storage
- **Vector Store**: FAISS for efficient similarity search

### Frontend (Next.js)
- **React Components**: Modern UI components with shadcn/ui
- **Authentication**: Supabase Auth integration
- **State Management**: React hooks for local state
- **Styling**: Tailwind CSS for responsive design

## 📦 Project Structure

```
upsc-question-generator/
├── backend/
│   └── ai_service/
│       ├── api/                    # FastAPI routes and models
│       │   ├── main.py            # Main FastAPI app
│       │   ├── auth.py            # Authentication
│       │   ├── models.py          # Pydantic models
│       │   └── routes/            # API routes
│       ├── core/                  # Business logic
│       │   ├── pdf_parser.py      # PDF processing
│       │   ├── vector_indexer.py  # Vector indexing
│       │   ├── question_generator.py # Question generation
│       │   └── supabase_client.py # Database integration
│       ├── data/                  # Data storage
│       └── pyq_data/             # PDF files
├── frontend/                      # Next.js frontend
│   ├── components/               # React components
│   ├── pages/                    # Next.js pages
│   ├── lib/                      # Utility libraries
│   └── styles/                   # CSS styles
├── scripts/                      # Deployment scripts
└── docker-compose.yml           # Docker configuration
```

## 🛠️ Setup Instructions

### Prerequisites

- Python 3.8+
- Node.js 16+
- Docker (optional)
- Supabase account
- Groq API key

### Backend Setup

1. **Navigate to backend directory**:
   ```bash
   cd backend/ai_service
   ```

2. **Create virtual environment**:
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**:
   ```bash
   cp ../../.env.example .env
   # Edit .env with your actual API keys and configuration
   ```

5. **Run the backend**:
   ```bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

### Frontend Setup

1. **Navigate to frontend directory**:
   ```bash
   cd frontend
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment**:
   ```bash
   cp .env.local.example .env.local
   # Edit .env.local with your Supabase configuration
   ```

4. **Run the frontend**:
   ```bash
   npm run dev
   ```

### Docker Setup (Alternative)

1. **Run with Docker Compose**:
   ```bash
   docker-compose up --build
   ```

## 🔧 Configuration

### Environment Variables

#### Backend (.env)
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
GROQ_API_KEY=your_groq_api_key
SECRET_KEY=your_jwt_secret_key
```

#### Frontend (.env.local)
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Supabase Setup

1. Create a new Supabase project
2. Set up authentication (enable email/password)
3. Create the required database tables:
   - `profiles` - User profiles
   - `questions` - Generated questions
   - `subjects` - Subject organization

## 📚 Usage

1. **Upload PDFs**: Place your UPSC study material PDFs in `backend/ai_service/pyq_data/`
2. **Process Documents**: Run the PDF parser to extract and index content
3. **Generate Questions**: Use the web interface to generate questions by subject/topic
4. **Review & Export**: Review generated questions and export for study

## 🚀 Deployment

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Deploy using script**:
   ```bash
   python scripts/deploy.py --platform vercel
   ```

### Docker Deployment

```bash
python scripts/deploy.py --platform docker
```

## 🧪 Testing

### Backend Tests
```bash
cd backend/ai_service
pytest
```

### Frontend Tests
```bash
cd frontend
npm test
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please open an issue on GitHub or contact the development team.

## 🔄 Changelog

### Version 1.0.0
- Initial release
- PDF processing and question generation
- User authentication
- Vector search implementation
- Modern web interface

## 🙏 Acknowledgments

- Groq for fast LLM inference
- Supabase for backend services
- Vercel for hosting
- The UPSC community for inspiration
