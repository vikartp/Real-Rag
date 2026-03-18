import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    // Get the NextAuth JWT token from the request
    const token = await getToken({ 
      req,
      secret: process.env.NEXTAUTH_SECRET 
    });

    if (!token) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Encode the token back to JWT string for backend verification
    const jwt = require("jose");
    const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);
    
    const nextAuthToken = await new jwt.SignJWT({
      sub: token.sub,
      email: token.email,
      name: token.name,
      picture: token.picture,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
    })
      .setProtectedHeader({ alg: "HS256" })
      .sign(secret);

    return NextResponse.json({ nextAuthToken });
  } catch (error) {
    console.error("Error getting NextAuth token:", error);
    return NextResponse.json(
      { error: "Failed to get authentication token" },
      { status: 500 }
    );
  }
}
