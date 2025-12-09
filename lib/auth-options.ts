// lib/auth-options.ts
// NextAuth configuration with Azure AD provider

import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from "@/lib/config";

// ========================================
// ADMIN CONFIGURATION
// ========================================
// ONLY THESE 3 EMAILS ARE ADMINS - EVERYTHING ELSE IS USER
const ADMIN_EMAILS = [
  'admin@intersnack.com.vn',
  'manager@intersnack.com.vn',
  'operations@intersnack.com.vn'
];

// ========================================
// HELPER FUNCTIONS
// ========================================

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

function determineRole(email: string): 'admin' | 'user' {
  const normalizedEmail = normalizeEmail(email);

  for (const adminEmail of ADMIN_EMAILS) {
    if (normalizedEmail === adminEmail.toLowerCase()) {
      console.log(`✅ SSO: ${email} is ADMIN`);
      return 'admin';
    }
  }

  console.log(`✅ SSO: ${email} is USER`);
  return 'user';
}

function getDepartmentFromEmail(email: string): string {
  const username = email.split('@')[0].toLowerCase();

  if (username.includes('admin') || username.includes('manager')) {
    return 'Management';
  } else if (username.includes('operations') || username.includes('ops')) {
    return 'Operations';
  } else if (username.includes('hr')) {
    return 'Human Resources';
  } else if (username.includes('finance')) {
    return 'Finance';
  } else if (username.includes('it') || username.includes('tech')) {
    return 'Information Technology';
  } else if (username.includes('sales')) {
    return 'Sales';
  } else if (username.includes('marketing')) {
    return 'Marketing';
  } else if (username.includes('production') || username.includes('factory')) {
    return 'Production';
  } else if (username.includes('rd')) {
    return 'Process RD & Optimization';
  }

  return 'General';
}

// FNV-1a 32-bit hash -> hex string (8 chars)
function fnv1aHashHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash >>> 0) * 0x01000193;
    hash = hash >>> 0;
  }
  return ('0000000' + hash.toString(16)).slice(-8);
}

function stableEmployeeIdFromEmail(email: string): string {
  const hex = fnv1aHashHex(normalizeEmail(email));
  return `EMP${hex.slice(0, 6).toUpperCase()}`;
}

// ========================================
// NEXTAUTH CONFIGURATION
// ========================================

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID || '',
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET || '',
      tenantId: process.env.AZURE_AD_TENANT_ID || '',
      authorization: {
        params: {
          scope: "openid email profile User.Read",
        },
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account, profile }) {
      console.log('=== SSO Sign In Attempt ===');
      console.log('User email:', user.email);
      console.log('Provider:', account?.provider);

      if (!user.email) {
        console.log('❌ SSO: No email provided');
        return false;
      }

      if (!user.email.endsWith(config.companyDomain)) {
        console.log(`❌ SSO: Invalid domain - ${user.email} (required: ${config.companyDomain})`);
        return false;
      }

      console.log(`✅ SSO: Login approved for ${user.email}`);
      return true;
    },

    async jwt({ token, user, account, profile, trigger }) {
      if (user) {
        const normalizedEmail = normalizeEmail(user.email || '');
        const role = determineRole(normalizedEmail);
        const department = getDepartmentFromEmail(normalizedEmail);
        const employeeId = stableEmployeeIdFromEmail(normalizedEmail);

        token.id = user.id;
        token.email = normalizedEmail;
        token.name = user.name || normalizedEmail.split('@')[0];
        token.role = role;
        token.department = department;
        token.employeeId = employeeId;

        // DO NOT store access_token - it's too large and causes session cookie to exceed 4096 bytes
        // if (account?.access_token) {
        //   token.accessToken = account.access_token;
        // }

        console.log('=== JWT Token Created ===');
        console.log('Email:', token.email);
        console.log('Role:', token.role);
        console.log('Department:', token.department);
        console.log('Employee ID:', token.employeeId);
      }

      // Remove large fields to prevent cookie size issues
      delete token.picture;
      delete token.image;
      delete token.sub;

      if (trigger === "update") {
        if (token.email) {
          token.role = determineRole(token.email);
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user && token) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        session.user.name = token.name as string;
        session.user.role = token.role as 'admin' | 'user';
        session.user.department = token.department as string;
        session.user.employeeId = token.employeeId as string;
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      else if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },

  pages: {
    signIn: '/',
    signOut: '/',
    error: '/',
  },

  session: {
    strategy: "jwt",
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '1800'),
    updateAge: parseInt(process.env.SESSION_UPDATE_AGE || '300'),
  },

  jwt: {
    maxAge: parseInt(process.env.SESSION_MAX_AGE || '1800'),
  },

  secret: process.env.NEXTAUTH_SECRET,

  debug: process.env.NODE_ENV === 'development',

  events: {
    async signIn({ user, account, profile, isNewUser }) {
      console.log(`✅ User signed in: ${user.email} via ${account?.provider}`);
    },
    async signOut({ token, session }) {
      console.log(`👋 User signed out: ${token?.email || session?.user?.email}`);
    },
  },
};
