// app/api/auth/[...nextauth]/route.ts
// NextAuth API route handler

import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth-options";

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
