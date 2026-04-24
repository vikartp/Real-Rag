# Real-RAG Backend

FastAPI backend for the Real-RAG application.

## Quick Start

```bash
# Create env and install dependencies
cp .env.example .env
uv venv
uv sync

# Run the server
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

See the root [README.md](../README.md) for full documentation.
