# 🎓 AI Study Companion

An intelligent study companion that helps you organize your notes, extract topics, create personalized study roadmaps, and get instant AI-powered answers to any question.

![Next.js](https://img.shields.io/badge/Next.js-16.1.1-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115.6-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.9+-blue?style=flat-square&logo=python)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-Database-3ECF8E?style=flat-square&logo=supabase)
![Gemini](https://img.shields.io/badge/Google-Gemini%20AI-4285F4?style=flat-square&logo=google)

---

## ✨ Features

### 🤖 **AI-Powered Learning**
- **Smart Topic Extraction**: Upload notes (PDF, TXT, MD) and AI automatically identifies key topics
- **Personalized Study Roadmaps**: Generate customized daily study plans based on your topics
- **Universal Q&A**: Ask any question and get instant AI-powered answers
- **Note-Enhanced Responses**: AI uses your uploaded notes to provide context-aware answers

### 📚 **Note Management**
- Upload and organize study materials by subject
- Support for PDF, TXT, and Markdown files
- Automatic text extraction and processing
- Secure cloud storage with Supabase

### 📅 **Study Planning**
- Generate personalized study roadmaps
- Daily learning schedules
- Visual timeline and progress tracking
- Topic-wise organization

### 🎯 **Progress Tracking**
- Mark topics as complete
- Track completion percentages
- Monitor your learning journey
- Visual progress indicators

### 🔍 **Semantic Search**
- Search notes by meaning, not just keywords
- AI-powered understanding
- Find relevant content instantly
- Works across all your uploaded materials

---

## 🏗️ Architecture

### **Tech Stack**

#### **Frontend**
- **Framework**: Next.js 16.1.1 (React 19)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Auth**: Supabase Auth
- **API Client**: Axios
- **Notifications**: React Hot Toast
- **Diagrams**: Mermaid.js

#### **Backend**
- **Framework**: FastAPI (Python)
- **AI Provider**: Google Gemini (gemini-1.5-flash, gemini-1.5-pro)
- **Database**: Supabase (PostgreSQL)
- **Vector DB**: Pinecone (for semantic search)
- **File Processing**: PyPDF2, python-docx
- **Authentication**: JWT (Supabase)

#### **Infrastructure**
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Vector Search**: Pinecone
- **AI**: Google Gemini API
- **Deployment Ready**: Production build supported

---

## 📋 Prerequisites

Before you begin, ensure you have:

- **Node.js** 18+ and npm
- **Python** 3.9+
- **Supabase** account ([supabase.com](https://supabase.com))
- **Google Gemini API** key ([ai.google.dev](https://ai.google.dev))
- **Pinecone** account ([pinecone.io](https://pinecone.io))

---

## 🚀 Quick Start

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/ai-study-companion.git
cd ai-study-companion
```

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
```

**Configure `backend/.env`:**

```env
# Supabase Configuration
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_JWT_SECRET=your_jwt_secret

# Google Gemini AI
GEMINI_API_KEY=your_gemini_api_key

# Pinecone Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=study-companion

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001
```

**Start the backend:**

```bash
# Make start script executable
chmod +x start-backend.sh

# Start backend server
./start-backend.sh
```

Backend will run on `http://localhost:8001`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env.local file
cp .env.local.example .env.local
```

**Configure `frontend/.env.local`:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8001
```

**Start the frontend:**

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

Frontend will run on `http://localhost:3000`

---

## 🗄️ Database Setup

### Supabase Tables

The app uses the following tables (auto-created via migrations):

1. **users** - User profiles (managed by Supabase Auth)
2. **subjects** - Study subjects/courses
3. **topics** - Topics extracted from notes
4. **notes** - Uploaded study materials
5. **study_plans** - Personalized study roadmaps
6. **topic_progress** - Manual progress tracking

### Run Migrations

```bash
cd backend
python run_migrations.py
```

Or use the quick migration script:

```bash
cd backend
chmod +x quick_migrate.sh
./quick_migrate.sh
```

---

## 📖 How to Use

### **1. Create an Account**
- Navigate to `http://localhost:3000/signup`
- Sign up with email and password
- Verify your email

### **2. Create a Subject**
- Go to "Subjects" → "Create New Subject"
- Enter subject name, description, and optional exam date
- Click "Create Subject"

### **3. Upload Notes**
- Go to "Notes" → "Upload Note"
- Select a subject
- Upload PDF, TXT, or MD files
- AI will automatically extract topics

### **4. Generate Study Roadmap**
- Go to your subject details
- Click "Generate Study Plan"
- Set start date and duration
- AI creates a personalized daily schedule

### **5. Track Your Progress**
- Open your study plan
- Mark topics as complete as you learn
- Watch your progress grow!

### **6. Ask AI Anything**
- Go to "Search"
- Type any question
- Get instant AI-powered answers
- AI uses your notes for context when available

---

## 🎯 API Endpoints

### **Authentication**
- `POST /api/auth/signup` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### **Subjects**
- `GET /api/subjects/` - List all subjects
- `POST /api/subjects/` - Create subject
- `GET /api/subjects/{id}` - Get subject details
- `PUT /api/subjects/{id}` - Update subject
- `DELETE /api/subjects/{id}` - Delete subject

### **Notes**
- `POST /api/notes/upload` - Upload note
- `GET /api/notes/` - List all notes
- `GET /api/notes/{id}` - Get note details
- `DELETE /api/notes/{id}` - Delete note
- `POST /api/notes/{id}/extract-topics` - Extract topics from note

### **Topics**
- `GET /api/topics/subject/{subject_id}` - List topics for subject
- `POST /api/topics/batch-from-extraction` - Create topics from AI extraction
- `POST /api/topics/{topic_id}/toggle-completion` - Mark topic complete/incomplete

### **Study Plans**
- `POST /api/study-plans/generate` - Generate personalized study plan
- `GET /api/study-plans/` - List all study plans
- `GET /api/study-plans/{id}` - Get study plan details
- `POST /api/study-plans/{id}/regenerate` - Regenerate study plan

### **Search**
- `POST /api/search/` - Semantic search + AI Q&A

---

## 🔧 Configuration

### **AI Models Used**

The app intelligently selects AI models for different tasks:

- **Topic Extraction**: `gemini-1.5-flash` (fast, efficient)
- **Study Plans**: `gemini-1.5-pro` or `gemini-1.5-flash` (detailed, structured)
- **Q&A**: `gemini-1.5-flash` (quick responses)

### **Gemini API Versions**

The backend automatically tries multiple API versions:
1. `v1` + `gemini-1.5-flash` (preferred for speed)
2. `v1beta` + `gemini-pro` (fallback for stability)

### **Environment Variables**

#### Backend Required:
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_KEY` - Supabase anon/public key
- `SUPABASE_JWT_SECRET` - JWT secret from Supabase
- `GEMINI_API_KEY` - Google Gemini API key
- `PINECONE_API_KEY` - Pinecone API key
- `PINECONE_ENVIRONMENT` - Pinecone environment
- `PINECONE_INDEX_NAME` - Pinecone index name

#### Frontend Required:
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anon key
- `NEXT_PUBLIC_API_URL` - Backend API URL

---

## 📁 Project Structure

```
ai-study-companion/
├── frontend/                 # Next.js frontend
│   ├── app/                 # App router pages
│   │   ├── dashboard/       # Dashboard page
│   │   ├── subjects/        # Subject management
│   │   ├── notes/          # Note management
│   │   ├── study-plans/    # Study plan pages
│   │   └── search/         # AI Q&A search
│   ├── components/         # React components
│   │   ├── Navbar.tsx
│   │   ├── ChapterProgress.tsx
│   │   ├── ConfirmationDialog.tsx
│   │   └── ...
│   ├── lib/               # Utilities
│   │   ├── api.ts        # API client
│   │   ├── supabase.ts   # Supabase client
│   │   └── constants/
│   └── public/           # Static assets
│
├── backend/              # FastAPI backend
│   ├── app/
│   │   ├── routes/      # API routes
│   │   │   ├── auth.py
│   │   │   ├── subjects.py
│   │   │   ├── notes.py
│   │   │   ├── topics.py
│   │   │   ├── study_plans.py
│   │   │   └── search.py
│   │   ├── services/    # Business logic
│   │   │   ├── ai_service.py         # Gemini AI integration
│   │   │   ├── pinecone_service.py   # Vector search
│   │   │   └── file_parser.py        # File processing
│   │   ├── models/      # Data models
│   │   ├── middleware/  # Auth, CORS, etc.
│   │   └── schemas/     # Pydantic schemas
│   ├── migrations/      # Database migrations
│   ├── main.py         # FastAPI app
│   └── requirements.txt
│
├── README.md           # This file
└── start-backend.sh   # Backend startup script
```

---

## 🎨 Features in Detail

### **1. Smart Topic Extraction**

When you upload notes, AI automatically:
- Identifies main topics and subtopics
- Extracts key concepts
- Estimates study time per topic
- Organizes hierarchically

### **2. Personalized Study Roadmaps**

AI generates study plans based on:
- Your available time
- Number of topics
- Topic complexity
- Your exam date (optional)

Each plan includes:
- Daily learning schedule
- Specific topics to cover
- Activities (learn/review/practice)
- Visual timeline

### **3. Universal AI Question Answering**

Ask any question:
- **With notes**: AI uses your materials for context
- **Without notes**: AI uses general knowledge
- **Markdown formatting**: Beautiful, readable answers
- **Instant responses**: Powered by Gemini Flash

### **4. Manual Progress Tracking**

Stay on top of your learning:
- Click "Complete" to mark topics done
- Visual progress bars
- Completion percentages
- Chapter-wise breakdown

### **5. Semantic Search**

Find information by meaning:
- Search across all notes
- AI understands context
- Relevance scoring
- Filter by subject

---

## 🔒 Security

- **Authentication**: Supabase Auth with JWT tokens
- **Authorization**: Row-level security in database
- **API Security**: Token verification on all protected routes
- **CORS**: Configured for frontend-only access
- **Environment Variables**: Sensitive data never exposed

---

## 🐛 Troubleshooting

### **Backend won't start**
```bash
# Check if port 8001 is in use
lsof -i :8001

# Kill existing process
pkill -f uvicorn

# Restart
./start-backend.sh
```

### **Frontend won't start**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install

# Start fresh
npm run dev
```

### **Database connection issues**
- Verify Supabase credentials in `.env`
- Check network connection
- Run migrations: `python run_migrations.py`

### **AI not responding**
- Verify `GEMINI_API_KEY` in backend `.env`
- Check backend logs: `tail -f backend/backend.log`
- Test API: `curl http://localhost:8001/health`

### **Notes not showing**
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check browser console for errors
- Verify authentication
- Check backend logs

---

## 📊 Performance

- **Topic Extraction**: ~5-10 seconds per note
- **Study Plan Generation**: ~10-15 seconds
- **AI Q&A**: ~2-5 seconds per question
- **Semantic Search**: <1 second
- **Page Load**: <2 seconds (production build)

---

## 🚧 Known Limitations

- Maximum file size: 10MB per upload
- Supported formats: PDF, TXT, MD only
- AI response limit: ~2000 tokens
- Requires internet connection for AI features

---

## 🛣️ Roadmap

### Future Enhancements:
- [ ] Mobile app (React Native)
- [ ] Collaborative study groups
- [ ] Export study plans to PDF
- [ ] Calendar integration (Google Calendar, iCal)
- [ ] Voice input for questions
- [ ] More file formats (DOCX, PPTX)
- [ ] Spaced repetition recommendations
- [ ] Study streak tracking
- [ ] Multi-language support

---

## 🤝 Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request


---

## 🙏 Acknowledgments

- **Google Gemini** - AI-powered features
- **Supabase** - Database and authentication
- **Pinecone** - Vector search
- **Next.js** - Frontend framework
- **FastAPI** - Backend framework
- **Framer Motion** - Animations
- **Mermaid.js** - Diagrams

---

## 📧 Contact

For questions, issues, or suggestions:
- Open an issue on GitHub
- Email: shuklamanya99@gmail.com

---

## ⭐ Star This Project

If you find this project helpful, please give it a star! ⭐

---

**Built with ❤️ using Next.js, FastAPI, and Google Gemini AI**
by MANYA SHUKLA AND RAJKUMAR YOGI... 