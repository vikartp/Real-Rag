# 🧠 Real-RAG

> A full-stack **Retrieval-Augmented Generation** application that lets users upload PDF documents and ask natural language questions about their content — powered by LangChain, ChromaDB, and OpenAI.

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)
![FastAPI](https://img.shields.io/badge/FastAPI-0.135-009688?style=flat-square&logo=fastapi)
![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python)
![ChromaDB](https://img.shields.io/badge/ChromaDB-1.5-FF6B6B?style=flat-square)
![LangChain](https://img.shields.io/badge/LangChain-1.2-1C3C3C?style=flat-square)

---

## ✨ Features

- 🔐 **Google OAuth Authentication** — Secure login via NextAuth.js with Google provider
- 📄 **PDF Upload & Processing** — Upload PDFs that get chunked and embedded into a vector store
- 💬 **Conversational Q&A** — Ask questions about uploaded documents and get AI-generated answers
- 🧩 **Per-User Data Isolation** — Each user's documents are stored in separate vector collections
- ⚡ **Real-time Chat UI** — Beautiful, responsive chat interface with typing indicators

---

## 🏗️ Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│    Frontend      │────▶│    Backend        │────▶│  ChromaDB   │
│  (Next.js 16)    │     │   (FastAPI)       │     │ (Vector DB) │
│   Port: 3000     │     │   Port: 8080      │     │             │
└─────────────────┘     └────────┬─────────┘     └─────────────┘
                                 │
                                 ▼
                        ┌──────────────────┐
                        │   OpenAI API      │
                        │  (Embeddings +    │
                        │   Chat Completion)│
                        └──────────────────┘
```

### How It Works

1. **User logs in** via Google OAuth (NextAuth.js)
2. **User uploads a PDF** → Backend extracts text using PyPDF, splits it into chunks
3. **Chunks are embedded** using OpenAI's `text-embedding-3-large` model and stored in ChromaDB
4. **User asks a question** → Relevant chunks are retrieved from ChromaDB
5. **LLM generates an answer** using the retrieved context via a RAG chain (LangChain)

---

## 📁 Project Structure

```
Real-Rag/
├── frontend/                    # Next.js 16 application
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx         # Landing page with Google sign-in
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx     # Main chat & PDF upload interface
│   │   │   ├── api/auth/
│   │   │   │   └── [...nextauth]/
│   │   │   │       └── route.ts # NextAuth API route
│   │   │   ├── layout.tsx       # Root layout with session provider
│   │   │   └── globals.css      # Global styles (Tailwind)
│   │   ├── components/
│   │   │   └── SessionWrapper.tsx
│   │   └── lib/
│   │       └── config.ts        # Centralized API URL config
│   ├── .env.example             # Environment variables template
│   ├── package.json
│   └── next.config.ts
│
├── backend/                     # FastAPI application
│   ├── main.py                  # API endpoints (upload, ask, health)
│   ├── pyproject.toml           # Python dependencies (uv)
│   ├── .env.example             # Environment variables template
│   ├── .python-version          # Python version pinning
│   └── uv.lock                  # Lock file for reproducible installs
│
└── README.md                    # You are here
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- [Python](https://www.python.org/) 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- [Google Cloud Console](https://console.cloud.google.com/) project with OAuth credentials

### 1. Clone the Repository(Git repo to be created)

```bash
git clone https://github.com/your-username/Real-Rag.git
cd Real-Rag
```

### 2. Setup Backend

```bash
cd backend

# Create environment file
cp .env.example .env
# Edit .env with your actual API keys

# Create virtual environment and install dependencies
uv venv
uv sync

# Start the backend server
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

The API will be available at `http://localhost:8080`. Visit `http://localhost:8080/docs` for interactive API documentation.

### 3. Setup Frontend

```bash
cd frontend

# Create environment file
cp .env.example .env.local
# Edit .env.local with your Google OAuth credentials

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:3000`.

### 4. Setup Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials)
2. Create a new **OAuth 2.0 Client ID** (Web application)
3. Add `http://localhost:3000/api/auth/callback/google` as an **Authorized redirect URI**
4. Copy the **Client ID** and **Client Secret** into `frontend/.env.local`

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Example |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI API key (or compatible provider) | `sk-...` |
| `OPENAI_API_BASE` | Base URL for the OpenAI-compatible API | `https://api.openai.com/v1` |

### Frontend (`frontend/.env.local`)

| Variable | Description | Example |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `xxxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `GOCSPX-...` |
| `NEXTAUTH_URL` | Canonical URL of the app | `http://localhost:3000` |
| `NEXTAUTH_SECRET` | Secret for JWT signing | `openssl rand -base64 32` |
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:8080` |

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Health check |
| `POST` | `/api/upload` | Upload and process a PDF (multipart form) |
| `POST` | `/api/ask` | Ask a question about uploaded documents |

### Upload PDF
```bash
curl -X POST http://localhost:8080/api/upload \
  -F "user_id=user123" \
  -F "file=@document.pdf"
```

### Ask a Question
```bash
curl -X POST http://localhost:8080/api/ask \
  -H "Content-Type: application/json" \
  -d '{"user_id": "user123", "question": "What is this document about?"}'
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Next.js 16, React 19, Tailwind CSS 4, NextAuth.js |
| **Backend** | FastAPI, Uvicorn, Python 3.12 |
| **AI/ML** | LangChain, OpenAI (GPT-4o + text-embedding-3-large) |
| **Vector DB** | ChromaDB |
| **PDF Parsing** | PyPDF |
| **Package Mgmt** | npm (frontend), uv (backend) |

---

## 📝 License

This project is for educational and personal use.

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request
