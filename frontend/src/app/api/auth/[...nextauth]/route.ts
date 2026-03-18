import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "dummy",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "dummy",
    }),
  ],
  callbacks: {
    async jwt({ token, account, user }) {
      // Include user info in JWT token on first sign-in
      if (account && user) {
        token.id = user.id;
        token.email = user.email;
      }
      return token;
    },
    async session({ session, token }) {
      // Add user ID and the encoded JWT token to the session
      if (session?.user && token?.sub) {
        (session.user as any).id = token.sub;
        // Include the NextAuth JWT token in the session for backend verification
        (session as any).nextAuthToken = token;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
