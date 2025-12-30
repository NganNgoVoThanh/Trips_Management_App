// types/next-auth.d.ts
// Extend NextAuth types to include custom user properties

import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user: {
      id: string;
      role: 'admin' | 'user';
      department?: string;
      employeeId?: string;
      phone?: string;
      jobTitle?: string;
      adminType?: 'super_admin' | 'location_admin' | 'none';
      adminLocationId?: string;
    } & DefaultSession["user"];
  }

  /**
   * The shape of the user object returned in the OAuth providers' `profile` callback,
   * or the second parameter of the `session` callback, when using a database.
   */
  interface User extends DefaultUser {
    role: 'admin' | 'user';
    department?: string;
    employeeId?: string;
    phone?: string;
    jobTitle?: string;
  }
}

declare module "next-auth/jwt" {
  /**
   * Returned by the `jwt` callback and `getToken`, when using JWT sessions
   */
  interface JWT extends DefaultJWT {
    id: string;
    role: 'admin' | 'user';
    department?: string;
    employeeId?: string;
    phone?: string;
    jobTitle?: string;
    accessToken?: string;
    adminType?: 'super_admin' | 'location_admin' | 'none';
    adminLocationId?: string;
  }
}
