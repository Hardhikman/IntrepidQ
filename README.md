# IntrepidQ

A minimalistic AI RAG system that curates context-aware Q&A designed to make you think - for UPSC CSE Mains Examination

Currently introducing IQ 1.0 for GS preparation 

**Transform your UPSC preparation with our cutting-edge AI Q&A generator.** This powerful tool leverages advanced NLP and vector search to create high-quality, context-aware ,and contemproary exam questions directly from PYQ based materials.

[**Live Demo**](https://intrepid-q1-nzmt.vercel.app) | [**Report a Bug**](https://github.com/Hardhikman/IntrepidQ1/issues/new) | [**Request a Feature**](https://github.com/Hardhikman/IntrepidQ1/issues/new)

## 🚀 Key Features

- **Automated Question Generation**: Instantly create high-quality UPSC questions from PYQ PDF documents.
- **Advanced AI-Powered Engine having Contextual awareness**: Utilizes Groq's lightning-fast LLM and FAISS vector search for contextual accuracy.
- **Secure User Management**: Robust authentication and user management powered by Supabase.
- **Sleek & Modern UI**: A clean, responsive, and intuitive interface built with Next.js and Tailwind CSS.
- **Comprehensive Question Management**: Easily track, manage, and organize your generated questions by subject.
- **Customizable & Extensible**: Built with a modular architecture, making it easy to extend and customize.

## ⚙️ Tech Stack

### Frontend
- **Next.js**: React framework for server-rendered applications
- **TypeScript**: Typed superset of JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **shadcn/ui**: Re-usable components built using Radix UI and Tailwind CSS
- **Supabase**: Authentication and database client

### Backend
- **FastAPI**: High-performance Python web framework
- **Python**: Core programming language
- **Langchain**: Framework for developing applications powered by language models
- **Groq**: Fast LLM inference API
- **FAISS**: Library for efficient similarity search

### Database
- **PostgreSQL**: Open source object-relational database (via Supabase)
- **pgvector**: PostgreSQL extension for vector similarity search

## 🏗️ Architecture

```
                               +-----------------+
                               |      User       |
                               +-----------------+
                                       |
                                       | Browser (HTTPS)
                                       v
                         +---------------------------+
                         |     Frontend (Next.js)    |
                         | - UI Components           |
                         | - User Authentication     |
                         +---------------------------+
                               |                 ^
                               | REST API Calls  | JWT Token
                               v                 |
                         +---------------------------+
                         |      Backend (FastAPI)    |
                         | - PDF Parsing             |
                         | - Question Generation     |
                         | - Vector Search           |
                         +---------------------------+
                           |          |           |
                           |          |           |
  +------------------------+          |           +------------------------+
  |                                   |                                    |
  v                                   v                                    v
+-----------------+         +-----------------+         +--------------------------+
| Supabase        |         | Groq API        |         | FAISS Vector Store       |
| - Auth          |         | - LLM Inference |         | - Content Indexing       |
| - PostgreSQL DB |         +-----------------+         +--------------------------+
+-----------------+
```

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
- Supabase Acc(Any other DB)
- API keys(Any other API keys)

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
2. Set up authentication (Gmail)
3. Create the required database tables by running the SQL scripts in the `scripts/db` directory in the Supabase SQL Editor.
   - `profiles` - User profiles
   - `questions` - Generated questions
   - `subjects` - Subject organization
   - `question_feedback` - User feedback on questions
   - `usage_analytics` - User analytics data

### Database Migrations

When new database schema changes are introduced, they will be added as SQL files in the `scripts/db` directory. To apply these changes, navigate to the Supabase SQL Editor and run the new scripts in order. For example, to apply the first migration, run the contents of `scripts/db/01_add_feedback_table.sql`.

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

- Groq/Together/Google for fast LLM inference
- Supabase for backend services
- Vercel/Railway for hosting
- The UPSC community for inspiration
