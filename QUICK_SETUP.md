# Quick Setup Guide - Simplified NextAuth Authentication

## TL;DR - Get Running in 90 Seconds

### Step 1: Generate Secret (30 seconds)

```bash
# Generate NextAuth secret (used by both frontend and backend)
python -c "import secrets; print('NEXTAUTH_SECRET=' + secrets.token_urlsafe(32))"
```

Copy the output. Use it in **both** backend and frontend.

### Step 2: Configure Backend (30 seconds)

Edit `backend/.env` (create if doesn't exist):

```env
OPENAI_API_KEY=your-existing-openai-key
OPENAI_API_BASE=https://api.openai.com/v1
NEXTAUTH_SECRET=<paste-nextauth-secret-from-step1>
```

### Step 3: Configure Frontend (30 seconds)

Edit `frontend/.env.local` (create if doesn't exist):

```env
GOOGLE_CLIENT_ID=your-existing-google-client-id
GOOGLE_CLIENT_SECRET=your-existing-google-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=<paste-SAME-secret-from-step1>
NEXT_PUBLIC_API_URL=http://localhost:8000
```

⚠️ **Critical:** `NEXTAUTH_SECRET` must be **identical** in both files!

### Step 4: Install Dependencies (if needed)

```bash
# Backend
cd backend
pip install python-jose[cryptography]

# Frontend
cd frontend
npm install jose
```

### Step 5: Restart Servers

```bash
# Terminal 1 - Backend
cd backend
uv run python -m uvicorn main:app --host 0.0.0.0 --port 8080 --reload

# Terminal 2 - Frontend  
cd frontend
npm run dev
```

### Step 6: Verify It Works

1. Go to `http://localhost:3000`
2. Sign in with Google
3. Upload a PDF
4. Ask a question
5. ✅ Should work normally!

## How This Works (The Simplest Approach)

1. **User signs in** via Google OAuth through NextAuth
2. **Frontend extracts NextAuth JWT** from session
3. **Frontend sends NextAuth JWT** with every API request
4. **Backend verifies NextAuth JWT** using NEXTAUTH_SECRET
5. **Done!** No token exchange, no extra layers

### Why This Is Simple & Secure

- ✅ **Single token system** - Only NextAuth JWT, no app tokens
- ✅ **Direct OAuth verification** - Backend verifies Google auth on every request
- ✅ **No complexity** - Fewer moving parts, easier to maintain
- ✅ **Cryptographically secure** - HS256 JWT signatures
- ✅ **Can't fake tokens** - Requires valid Google OAuth credentials

## What If It Doesn't Work?

### Error: "NEXTAUTH_SECRET environment variable is required"

**Cause:** Backend can't find NEXTAUTH_SECRET

**Fix:**
```bash
# Check backend .env
cat backend/.env | grep NEXTAUTH_SECRET

# Should show: NEXTAUTH_SECRET=your-secret-here
```

### Error: "Invalid NextAuth token"

**Cause:** NEXTAUTH_SECRET doesn't match between frontend and backend

**Fix:**
```bash
# Both should have IDENTICAL values
cat backend/.env | grep NEXTAUTH_SECRET
cat frontend/.env.local | grep NEXTAUTH_SECRET

# If different, update one to match the other and restart both servers
```

### Error: "Failed to get JWT token" (in browser console)

**Cause:** Frontend can't get NextAuth token or backend rejects it

**Fix:**
1. Open browser DevTools → Console
2. Look for detailed error message
3. Check that both servers are running
4. Try signing out and signing in again
5. Clear localStorage and cookies, then sign in again

### Swagger shows 401 on protected endpoints

**Cause:** You haven't authorized Swagger with a JWT token

**Fix:**
1. Sign in to frontend app
2. Open DevTools (F12) → Application → Local Storage
3. Copy `jwt_token` value
4. In Swagger, click "Authorize" 🔒
5. Paste token and click "Authorize"

## Complete Configuration Reference

### Backend `.env`
```env
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_API_BASE=https://api.openai.com/v1

# NextAuth Secret - MUST match frontend
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-or-more
```

### Frontend `.env.local`
```env
# Google OAuth - from https://console.cloud.google.com/apis/credentials
GOOGLE_CLIENT_ID=xxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxx

# NextAuth - MUST match backend NEXTAUTH_SECRET
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-32-chars-or-more

# Backend API
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Security Checklist

- [ ] Generated strong random secret (min 32 characters)
- [ ] `NEXTAUTH_SECRET` is **identical** in backend and frontend
- [ ] Never committed `.env` or `.env.local` to git
- [ ] Backend running and verifying NextAuth tokens
- [ ] Frontend successfully extracts NextAuth JWT after Google sign-in
- [ ] Protected endpoints reject requests without valid tokens

## Advantages of Single-Token Architecture

### Previous Approach (Two Tokens)
```
Google → NextAuth JWT → Exchange for App JWT → Use App JWT
              ↓              (token endpoint)         ↓
         NEXTAUTH_SECRET     JWT_SECRET_KEY      verify_token()
```
⚠️ More complexity, more secrets, more failure points

### Current Approach (Single Token)
```
Google → NextAuth JWT → Use directly for all requests
              ↓
         NEXTAUTH_SECRET → verify_nextauth_token()
```
✅ Simpler, fewer secrets, direct OAuth verification

## Need More Details?

- **Complete auth guide:** See `AUTH_GUIDE.md`
- **Security details:** See `SECURITY_FIX.md`
- **API documentation:** Visit `http://localhost:8000/docs` after starting backend

---

That's it! Your API now uses the cleanest and most secure authentication approach. 🎉🔒
