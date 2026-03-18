# NextAuth Token Verification - Implementation Guide

## Overview

This implementation uses **NextAuth JWT token verification** for authentication - the cleanest and most secure approach. The backend cryptographically verifies the user's Google OAuth authentication by validating the NextAuth JWT token.

## Architecture

```
┌─────────────┐
│   Browser   │
└─────┬───────┘
      │ 1. Sign in with Google
      ▼
┌─────────────┐
│  NextAuth   │◄─── Google OAuth Provider
└─────┬───────┘
      │ 2. Creates JWT with user info
      │    (signed with NEXTAUTH_SECRET)
      ▼
┌─────────────┐
│  Frontend   │
└─────┬───────┘
      │ 3. Extracts NextAuth JWT via API route
      ▼
┌─────────────┐
│  Backend    │
│             │ 4. Verifies NextAuth JWT signature
│             │    using NEXTAUTH_SECRET
│             │ 5. Issues application JWT token
└─────────────┘
```

## Key Components

### 1. NextAuth Configuration (`route.ts`)

```typescript
const handler = NextAuth({
  providers: [GoogleProvider({...})],
  callbacks: {
    async jwt({ token, user }) {
      // Include user info in JWT
      return token;
    },
    async session({ session, token }) {
      // Add user ID to session
      (session.user as any).id = token.sub;
      return session;
    },
  },
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET, // ← Must match backend
});
```

**Key Points:**
- Uses JWT strategy (not database sessions)
- `secret` is critical - must match backend's `NEXTAUTH_SECRET`
- Token contains user ID from Google OAuth

### 2. NextAuth Token Extractor (`/api/get-nextauth-token/route.ts`)

```typescript
import { getToken } from "next-auth/jwt";

export async function GET(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });
  
  // Re-encode token as JWT string for backend
  const nextAuthToken = await new jose.SignJWT({
    sub: token.sub,
    email: token.email,
    // ... other claims
  })
    .setProtectedHeader({ alg: "HS256" })
    .sign(secret);
    
  return NextResponse.json({ nextAuthToken });
}
```

**Purpose:**
- Extracts NextAuth JWT from secure httpOnly cookie
- Re-encodes it as a JWT string that can be sent to backend
- Only works for authenticated users

### 3. Frontend Token Flow (`dashboard/page.tsx`)

```typescript
useEffect(() => {
  const fetchToken = async () => {
    if (status === "authenticated") {
      // Get NextAuth JWT from our API route
      const nextAuthRes = await axios.get("/api/get-nextauth-token");
      
      // Exchange it for backend JWT
      const res = await axios.post(`${API_URL}/api/auth/token`, {
        nextauth_token: nextAuthRes.data.nextAuthToken
      });
      
      setJwtToken(res.data.access_token);
    }
  };
  fetchToken();
}, [status]);
```

**Flow:**
1. User authenticates via Google → NextAuth
2. Frontend calls `/api/get-nextauth-token` to get JWT string
3. Sends NextAuth JWT to backend's `/api/auth/token`
4. Backend verifies and returns application JWT
5. Frontend uses app JWT for all API calls

### 4. Backend Token Verification (`main.py`)

```python
def verify_nextauth_token(token: str) -> Dict[str, Any]:
    """Verify NextAuth JWT token"""
    payload = jwt.decode(
        token,
        NEXTAUTH_SECRET,  # ← Must match frontend
        algorithms=["HS256"],
        options={"verify_aud": False}
    )
    
    user_id = payload.get("sub")
    email = payload.get("email")
    
    return {"user_id": user_id, "email": email}

@app.post("/api/auth/token")
async def generate_token(req: TokenRequest):
    # Verify NextAuth token
    user_info = verify_nextauth_token(req.nextauth_token)
    
    # Issue our application JWT
    access_token = create_access_token(
        user_id=user_info["user_id"],
        email=user_info["email"]
    )
    return TokenResponse(access_token=access_token)
```

**Security:**
- Cryptographically verifies JWT signature using `NEXTAUTH_SECRET`
- Extracts user ID from Google OAuth (via NextAuth)
- Only issues tokens if NextAuth JWT is valid
- No shared API key needed in frontend code

## Configuration

### Required Environment Variables

#### Backend (`backend/.env`)
```env
NEXTAUTH_SECRET=your-secret-here  # ← Must match frontend
JWT_SECRET_KEY=different-secret    # ← For app JWT tokens
OPENAI_API_KEY=...
OPENAI_API_BASE=...
```

#### Frontend (`frontend/.env.local`)
```env
NEXTAUTH_SECRET=your-secret-here  # ← Must match backend
NEXTAUTH_URL=http://localhost:3000
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### Generate Secrets

```bash
# Generate NEXTAUTH_SECRET (use same value in both)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Generate JWT_SECRET_KEY (different from NEXTAUTH_SECRET)
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Security Analysis

### What Makes This Secure?

1. **Cryptographic Verification**
   - Backend verifies JWT signature using HMAC-SHA256
   - Impossible to forge without knowing `NEXTAUTH_SECRET`

2. **Two-Token System**
   - NextAuth JWT: Proves Google OAuth authentication
   - App JWT: Application-specific access token
   - Separation of concerns

3. **No Secrets in Frontend Code**
   - `NEXTAUTH_SECRET` used server-side only
   - Even if frontend is decompiled, can't forge tokens

4. **End-to-End OAuth**
   - Google → NextAuth → Backend
   - Each step cryptographically verified

### Attack Scenarios & Mitigations

#### ❌ Attack: "I'll call /api/auth/token with a fake user_id"
✅ **Mitigated:** Backend requires valid NextAuth JWT (cryptographically signed)

#### ❌ Attack: "I'll steal the NEXTAUTH_SECRET from frontend code"
✅ **Mitigated:** Secret never sent to browser, only used server-side

#### ❌ Attack: "I'll forge a NextAuth JWT"
✅ **Mitigated:** Requires knowing NEXTAUTH_SECRET (only backend knows it)

#### ❌ Attack: "I'll replay an old NextAuth JWT"
✅ **Mitigated:** JWTs have expiration (`exp` claim checked by `jwt.decode`)

#### ⚠️ Remaining Risk: "I'll steal someone's session-token cookie"
- Standard web security (HTTPS, httpOnly cookies, CSRF protection)
- NextAuth handles this with secure cookie settings

## Comparison with Shared API Key Approach

| Aspect | Shared API Key | NextAuth Verification |
|--------|----------------|----------------------|
| Frontend secret | ❌ Yes (`FRONTEND_API_KEY`) | ✅ No |
| Verifies OAuth | ❌ No (trusts frontend) | ✅ Yes (verifies signature) |
| Can be reverse-engineered | ⚠️ Yes (from frontend) | ✅ No (server-side only) |
| Token generation | ⚠️ Anyone with API key | ✅ Only valid OAuth users |
| Security level | 🟡 Medium | 🟢 High |
| Complexity | 🟢 Low | 🟡 Medium |

## Troubleshooting

### "Invalid NextAuth token"

**Cause:** `NEXTAUTH_SECRET` mismatch between frontend and backend

**Solution:**
```bash
# Check both values
cat backend/.env | grep NEXTAUTH_SECRET
cat frontend/.env.local | grep NEXTAUTH_SECRET

# They MUST be identical
# If different, update and restart servers
```

### "Not authenticated" from /api/get-nextauth-token

**Cause:** User not signed in or session expired

**Solution:**
- Sign out and sign in again
- Check browser cookies for `next-auth.session-token`
- Verify Google OAuth credentials are correct

### "verify_aud error" or "Invalid audience"

**Cause:** NextAuth JWT verification expecting audience claim

**Solution:**
Already handled with `options={"verify_aud": False}` in backend

### Backend crashes on startup: "NEXTAUTH_SECRET required"

**Cause:** `NEXTAUTH_SECRET` not set in backend `.env`

**Solution:**
```bash
# Add to backend/.env
echo "NEXTAUTH_SECRET=your-secret-here" >> backend/.env
```

## Testing

### 1. Test NextAuth Token Extraction

```bash
# Start both servers, sign in, then:
curl http://localhost:3000/api/get-nextauth-token \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"

# Should return: {"nextAuthToken": "eyJhbGc..."}
```

### 2. Test Backend Verification

```bash
# Get the nextAuthToken from step 1, then:
curl -X POST http://localhost:8000/api/auth/token \
  -H "Content-Type: application/json" \
  -d '{"nextauth_token": "eyJhbGc..."}'

# Should return: {"access_token": "eyJhbGc...", "token_type": "bearer"}
```

### 3. Test Full Flow

1. Sign in at `http://localhost:3000`
2. Open DevTools → Console
3. Should see "✅ JWT token obtained" (or no errors)
4. Upload a PDF → Should work
5. Ask a question → Should work

## Production Considerations

1. **Rotate NEXTAUTH_SECRET periodically**
   - Invalidates all existing sessions
   - Update both frontend and backend simultaneously

2. **Use long, random secrets (min 32 chars)**
   ```bash
   python -c "import secrets; print(secrets.token_urlsafe(64))"
   ```

3. **Enable HTTPS in production**
   - Protects tokens in transit
   - NextAuth requires HTTPS for OAuth callbacks

4. **Set secure cookie flags** (NextAuth handles this)
   - `httpOnly`: Prevents JavaScript access
   - `secure`: Only sent over HTTPS
   - `sameSite`: CSRF protection

5. **Monitor failed authentication attempts**
   - Log invalid token errors
   - Alert on suspicious patterns

6. **Implement token refresh** (future enhancement)
   - Current: 24-hour JWT expiration
   - Better: Short-lived access tokens + refresh tokens

## Summary

✅ **What We Built:**
- End-to-end OAuth verification
- Two-token system (NextAuth JWT → App JWT)
- No frontend secrets
- Cryptographically secure

✅ **Benefits:**
- Can't forge tokens without Google OAuth
- Clean architecture
- Industry-standard approach
- Production-ready security

✅ **Setup:**
1. Set `NEXTAUTH_SECRET` in both frontend and backend (same value)
2. Set `JWT_SECRET_KEY` in backend (different value)
3. Restart servers
4. Done! 🎉

---

**This is the cleanest and most secure authentication approach for your RAG application.**
