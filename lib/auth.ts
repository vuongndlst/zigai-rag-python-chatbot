import NextAuth, { type NextAuthOptions } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyUser } from "@/lib/db";

export const authOptions: NextAuthOptions = {
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        identifier: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(creds) {
        if (!creds) return null;
        const user = await verifyUser(creds.identifier, creds.password);
        return user;
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login?error=true",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.uid = user.id;
      
      if (user && (user as any).role) token.role = (user as any).role;
      return token;
    },
    async session({ session, token }) {
      if (token?.uid) session.user.id = token.uid as string;
      
      (session.user as any).role = token.role as string;
      return session;
    },
  },
};
