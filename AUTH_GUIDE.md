# Authentication Guide

## Overview

The Real-RAG API now uses JWT (JSON Web Token) authentication to secure all endpoints. This prevents unauthorized access via Swagger docs or direct API calls.
## Security Architecture

### Multi-Layer Security

1. **Google OAuth (Frontend):** Users authenticate via Google
2. **Shared API Key:** Frontend proves it's authorized to request tokens
3. **JWT Token:** Users carry their authenticated identity in requests
4. **Token Verification:** Backend validates JWT on every protected endpoint

### Token Generation Protection

The `/api/auth/token` endpoint is protected in multiple ways:
- **Hidden from Swagger docs** (`include_in_schema=False`)
- **Requires shared API key** (Frontend must prove it's authorized)
- **Only accessible to authenticated frontend users**

This prevents anyone from generating arbitrary tokens with fake user_ids.
## How It Works

1. **Frontend Authentication Flow:**
   - User signs in with Google OAuth via NextAuth
   - Frontend automatically requests a JWT token from `/api/auth/token`
   - JWT token is stored in localStorage and included in all API requests
   - Token is valid for 24 hours

2. **Backend Validation:**
   - All protected endpoints (`/api/upload`, `/api/ask`) require a valid JWT token
   - Token must be sent in the `Authorization` header as `Bearer <token>`
   - User identity is extracted from the token, not from request parameters

## Using Swagger Docs (FastAPI /docs)

### Important: Token Endpoint is Hidden

The `/api/auth/token` endpoint is **intentionally hidden** from Swagger docs for security. It requires a shared API key that only the frontend possesses, preventing unauthorized token generation.

### Step 1: Get a JWT Token from Browser

Since the token endpoint is protected, you need to get a token from the running application:

1. Start both frontend and backend:
   ```bash
   # Terminal 1 - Backend
   cd backend
   uvicorn main:app --reload
   
   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

2. Sign in to the application at `http://localhost:3000`
3. Open browser DevTools (F12) → **Application** tab → **Local Storage** → `http://localhost:3000`
4. Copy the `jwt_token` value

### Step 2: Authorize in Swagger

1. Go to `http://localhost:8000/docs`
2. Click the **"Authorize"** button (🔒 icon) at the top right
3. In the "Value" field, paste your JWT token
4. Click "Authorize"
5. Click "Close"

### Step 3: Test Protected Endpoints

Now you can use "Try it out" on protected endpoints:
- `/api/upload` - Upload and process PDFs
- `/api/ask` - Ask questions about uploaded documents

The token will be automatically included in all requests.

### Alternative: Get Token via curl (for testing only)

```bash
curl -X POST "http://localhost:8000/api/auth/token" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "test-user-123",
    "email": "test@example.com",
    "api_key": "your-FRONTEND_API_KEY-from-env"
  }'
```

⚠️ **Note:** This only works if you know the `FRONTEND_API_KEY`, which should be kept secret.

## Environment Variables

### Backend Configuration

Update your `backend/.env` file:

```env
OPENAI_API_KEY=your-openai-api-key
OPENAI_API_BASE=https://api.openai.com/v1
JWT_SECRET_KEY=your-secret-key-here-use-a-long-random-string
FRONTEND_API_KEY=your-shared-secret-between-frontend-and-backend
```

### Frontend Configuration

Update your `frontend/.env.local` file:

```env
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_FRONTEND_API_KEY=your-shared-secret-between-frontend-and-backend
```

⚠️ **Critical:** The `FRONTEND_API_KEY` (backend) and `NEXT_PUBLIC_FRONTEND_API_KEY` (frontend) **MUST match exactly**.

### Generate Secure Keys

```bash
# Generate JWT secret key
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate frontend API key (shared secret)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate NextAuth secret
openssl rand -base64 32
```

⚠️ **Important:** Use different keys for each! Never share these keys publicly or commit them to git.

## Token Details

- **Algorithm:** HS256
- **Expiration:** 24 hours
- **Payload:**
  - `sub`: User ID (Google OAuth sub claim)
  - `email`: User email
  - `exp`: Expiration timestamp
  - `iat`: Issued at timestamp

## Security Notes

### What's Protected

1. ✅ **Token generation requires shared API key** - Prevents unauthorized token creation
2. ✅ **Token endpoint hidden from Swagger** - Reduces attack surface
3. ✅ **Tokens validated on every request** - No bypass possible
4. ✅ **User identity from token (not client input)** - Prevents impersonation
5. ✅ **Per-user document isolation** - Users can only access their own documents
6. ✅ **Tokens expire after 24 hours** - Limits token lifetime
7. ✅ **Frontend authenticates via Google OAuth** - Strong authentication source

### Security Best Practices

1. **Never commit secrets to git:**
   - Add `.env` and `.env.local` to `.gitignore`
   - Use `.env.example` files as templates only

2. **Use strong random keys:**
   - Generate with `secrets.token_urlsafe(32)` or similar
   - Minimum 32 characters recommended

3. **Keep FRONTEND_API_KEY secret:**
   - Only the frontend and backend should know this
   - Change it if you suspect it's been compromised

4. **Use HTTPS in production:**
   - Protects tokens in transit
   - Prevents man-in-the-middle attacks

5. **Monitor for suspicious activity:**
   - Failed authentication attempts
   - Expired token usage patterns

### Threat Model

**Addressed Threats:**
- ❌ Unauthorized token generation (prevented by API key)
- ❌ User impersonation (identity from validated token)
- ❌ Direct Swagger exploitation (token endpoint hidden)
- ❌ Cross-user data access (user-specific storage paths)

**Remaining Considerations:**
- ⚠️ Token theft from localStorage (standard web security practices apply)
- ⚠️ FRONTEND_API_KEY exposure (keep source code private or use backend-only auth)
- ⚠️ Token expiration handling (implement refresh tokens for production)
## Advanced: NextAuth Token Verification (Most Secure)

For maximum security, you can verify NextAuth JWT tokens directly on the backend instead of using a shared API key.

### Benefits
- ✅ No shared secret in frontend code (FRONTEND_API_KEY not needed)
- ✅ Backend verifies Google OAuth directly
- ✅ True end-to-end authentication chain

### Implementation

1. **Share NEXTAUTH_SECRET between frontend and backend:**
   ```env
   # Both frontend/.env.local and backend/.env
   NEXTAUTH_SECRET=your-nextauth-secret-key
   ```

2. **Update backend to verify NextAuth tokens:**
   ```python
   from jose import jwt
   
   def verify_nextauth_token(token: str) -> dict:
       """Verify NextAuth JWT token"""
       try:
           payload = jwt.decode(
               token, 
               NEXTAUTH_SECRET, 
               algorithms=["HS512"],  # NextAuth uses HS512
               options={"verify_aud": False}  # NextAuth doesn't set audience
           )
           return payload
       except JWTError:
           raise HTTPException(401, "Invalid NextAuth token")
   ```

3. **Frontend sends NextAuth session token instead:**
   ```typescript
   // Get NextAuth token from session
   const session = await getSession();
   const nextAuthToken = session?.user?.id; // Extract from session
   
   // Send to backend
   await axios.post('/api/auth/token', {
       nextauth_token: nextAuthToken
   });
   ```

This approach eliminates the need for `FRONTEND_API_KEY` but requires careful NextAuth configuration.
## Troubleshooting

**Issue:** "Invalid API key. This endpoint is only accessible to authorized clients."
- **Solution:** `FRONTEND_API_KEY` (backend) and `NEXT_PUBLIC_FRONTEND_API_KEY` (frontend) don't match. Check both `.env` files.

**Issue:** "Invalid authentication token"
- **Solution:** Token might be expired or invalid. Get a fresh token from the frontend.

**Issue:** "No documents found for this user"
- **Solution:** Upload a PDF first using `/api/upload` endpoint.

**Issue:** Swagger shows 401 Unauthorized
- **Solution:** Make sure you clicked "Authorize" and entered a valid token.

**Issue:** Token endpoint returns 403 Forbidden
- **Solution:** You're calling `/api/auth/token` directly without the correct `FRONTEND_API_KEY`. Get the token from the running application instead.

**Issue:** Frontend can't get JWT token
- **Solution:** 
  1. Check that `NEXT_PUBLIC_FRONTEND_API_KEY` is set in frontend `.env.local`
  2. Restart the frontend server after changing environment variables
  3. Check browser console for detailed error messages

## API Changes Summary

### Old Behavior (Insecure)
```python
# Anyone could call with any user_id
POST /api/upload
FormData: {
  "user_id": "any-id-here",  # ❌ Security risk!
  "file": file
}
```

### New Behavior (Secure)
```python
# User ID comes from validated JWT token
POST /api/upload
Headers: {
  "Authorization": "Bearer eyJhbGc..."
}
FormData: {
  "file": file  # ✅ user_id extracted from token
}
```

## Installing Dependencies

Backend dependencies are already updated. Install them:

```bash
cd backend
pip install python-jose[cryptography]
# Or install all dependencies
pip install -e .
```

Frontend changes use existing dependencies (axios, next-auth).
