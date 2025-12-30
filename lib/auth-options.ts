// lib/auth-options.ts
// NextAuth configuration with Azure AD provider

import { NextAuthOptions } from "next-auth";
import AzureADProvider from "next-auth/providers/azure-ad";
import { config } from "@/lib/config";
import { createOrUpdateUserOnLogin } from "@/lib/user-service";

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

        // ✅ Extract Azure AD profile fields
        const azureProfile = profile as any;

        // Use Azure AD Object ID (oid) as Employee ID - this is the real unique identifier
        const employeeId = azureProfile?.oid || stableEmployeeIdFromEmail(normalizedEmail);

        // Department: Azure AD basic profile doesn't include this, use email-based fallback
        const department = azureProfile?.department || getDepartmentFromEmail(normalizedEmail);

        // Phone and JobTitle: Not available with User.Read scope, would need Graph API call
        const phone = azureProfile?.mobilePhone || (azureProfile?.businessPhones && azureProfile.businessPhones[0]) || '';
        const jobTitle = azureProfile?.jobTitle || '';

        console.log('=== Azure AD Profile Extracted ===');
        console.log('OID (Employee ID):', employeeId);
        console.log('Department:', department);
        console.log('Phone:', phone || 'not available');
        console.log('Job Title:', jobTitle || 'not available');

        token.id = user.id;
        token.email = normalizedEmail;
        token.name = user.name || normalizedEmail.split('@')[0];
        token.role = role;
        token.department = department;
        token.employeeId = employeeId;
        token.phone = phone;
        token.jobTitle = jobTitle;

        // ✅ Store avatar/picture from Azure AD (if available and not too long)
        const avatarUrl = user.image || azureProfile?.picture;
        if (avatarUrl && avatarUrl.length < 200) {
          token.picture = avatarUrl;
        }

        // ✅ Load admin_type and admin_location_id from database
        // This enables Super Admin and Location Admin functionality
        try {
          const { createOrUpdateUserOnLogin } = await import('@/lib/user-service');
          const mysql = await import('mysql2/promise');
          const connection = await mysql.default.createConnection({
            host: process.env.DB_HOST || 'vnicc-lxwb001vh.isrk.local',
            port: parseInt(process.env.DB_PORT || '3306'),
            user: process.env.DB_USER || 'tripsmgm-rndus2',
            password: process.env.DB_PASSWORD || 'wXKBvt0SRytjvER4e2Hp',
            database: process.env.DB_NAME || 'tripsmgm-mydb002',
          });

          const [rows] = await connection.query<any[]>(
            'SELECT admin_type, admin_location_id FROM users WHERE email = ? LIMIT 1',
            [normalizedEmail]
          );

          await connection.end();

          if (Array.isArray(rows) && rows.length > 0) {
            token.adminType = rows[0].admin_type || 'none';
            token.adminLocationId = rows[0].admin_location_id || undefined;
            console.log(`✅ Admin Type loaded from DB: ${token.adminType}${token.adminLocationId ? ` (Location: ${token.adminLocationId})` : ''}`);
          } else {
            token.adminType = 'none';
            token.adminLocationId = undefined;
          }
        } catch (error) {
          console.error('❌ Failed to load admin_type from database:', error);
          token.adminType = 'none';
          token.adminLocationId = undefined;
        }

        console.log('=== JWT Token Created ===');
        console.log('Email:', token.email);
        console.log('Role:', token.role);
        console.log('Admin Type:', token.adminType);
        console.log('Department:', token.department);
        console.log('Employee ID:', token.employeeId);
        console.log('Phone:', token.phone || 'none');
        console.log('Job Title:', token.jobTitle || 'none');
        console.log('Avatar URL:', token.picture || 'none');
      }

      // Remove very large fields to prevent cookie size issues
      // Keep picture if it's short enough
      delete token.image; // Remove duplicate field
      delete token.sub; // Remove duplicate ID field

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

        // ✅ Add admin type fields to session (for Super Admin & Location Admin)
        if (token.adminType) {
          session.user.adminType = token.adminType as 'super_admin' | 'location_admin' | 'none';
        }
        if (token.adminLocationId) {
          session.user.adminLocationId = token.adminLocationId as string;
        }

        // ✅ Add Azure AD profile fields to session
        if (token.phone) {
          session.user.phone = token.phone as string;
        }
        if (token.jobTitle) {
          session.user.jobTitle = token.jobTitle as string;
        }

        // ✅ Add avatar URL to session
        if (token.picture) {
          session.user.image = token.picture as string;
        }
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

      // ✅ Tạo/cập nhật user record trong database
      if (user.email) {
        try {
          const azureProfile = profile as any;
          const normalizedEmail = normalizeEmail(user.email);
          const role = determineRole(normalizedEmail);
          const azureId = azureProfile?.oid || azureProfile?.sub || user.id;
          const employeeId = azureProfile?.oid ? `EMP${azureProfile.oid.slice(0, 6).toUpperCase()}` : stableEmployeeIdFromEmail(normalizedEmail);
          const department = azureProfile?.department || getDepartmentFromEmail(normalizedEmail);
          const officeLocation = azureProfile?.officeLocation || null;
          const jobTitle = azureProfile?.jobTitle || null;

          await createOrUpdateUserOnLogin({
            azureId,
            email: normalizedEmail,
            name: user.name || normalizedEmail.split('@')[0],
            employeeId,
            role,
            department,
            officeLocation,
            jobTitle,
          });

          console.log(`✅ User record created/updated for ${normalizedEmail}`);
        } catch (error: any) {
          console.error(`❌ Failed to create/update user record:`, error.message);
          // Không throw error để không block login
        }
      }
    },
    async signOut({ token, session }) {
      console.log(`👋 User signed out: ${token?.email || session?.user?.email}`);
    },
  },
};
