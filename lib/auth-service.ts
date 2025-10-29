// lib/auth-service.ts
import { config } from './config';
import { getSessionFromCookie } from './cookie-utils';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'user';
  department?: string;
  employeeId?: string;
  createdAt: string;
}

// ONLY THESE 3 EMAILS ARE ADMINS - EVERYTHING ELSE IS USER
const ADMIN_EMAILS = [
  'admin@intersnack.com.vn',
  'manager@intersnack.com.vn',
  'operations@intersnack.com.vn'
];

class AuthService {
  private currentUser: User | null = null;

  constructor() {
    this.loadUserFromSession();
  }

  // --- Helpers: normalize email + FNV-1a hash + stable IDs ---
  private normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  // FNV-1a 32-bit hash -> hex string (8 chars)
  private fnv1aHashHex(input: string): string {
    let hash = 0x811c9dc5;
    for (let i = 0; i < input.length; i++) {
      hash ^= input.charCodeAt(i);
      // multiply by FNV prime (mod 2^32)
      hash = (hash >>> 0) * 0x01000193;
      hash = hash >>> 0;
    }
    return ('0000000' + hash.toString(16)).slice(-8);
  }

  private stableUserIdFromEmail(email: string): string {
    const hex = this.fnv1aHashHex(this.normalizeEmail(email));
    return `user-${hex}`; // e.g., user-3fa4c9b1
  }

  private stableEmployeeIdFromEmail(email: string): string {
    const hex = this.fnv1aHashHex(this.normalizeEmail(email));
    return `EMP${hex.slice(0, 6).toUpperCase()}`; // e.g., EMP3FA4C9
  }

  private loadUserFromSession(): void {
    // ✅ FIX: Read from cookie instead of sessionStorage
    if (typeof window === 'undefined') return;

    try {
      // Read session from cookie (set by middleware)
      const userData = getSessionFromCookie();

      if (userData && userData.email) {
        // Ensure stable IDs
        const stableId = this.stableUserIdFromEmail(userData.email);
        const stableEmp = this.stableEmployeeIdFromEmail(userData.email);

        // Re-validate role based on email and set stable IDs
        this.currentUser = {
          ...userData,
          id: stableId,
          employeeId: stableEmp,
          role: this.determineRole(userData.email)
        };
      }
    } catch (error) {
      console.error('Failed to load user from session cookie:', error);
      this.currentUser = null;
    }
  }

  private determineRole(email: string): 'admin' | 'user' {
    const normalizedEmail = email.toLowerCase().trim();
    
    // ONLY check against the 3 admin emails
    for (const adminEmail of ADMIN_EMAILS) {
      if (normalizedEmail === adminEmail.toLowerCase()) {
        console.log(`✅ ${email} is ADMIN`);
        return 'admin';
      }
    }
    
    console.log(`✅ ${email} is USER`);
    return 'user';
  }

  async loginWithSSO(email: string, password?: string): Promise<User> {
    try {
      // Validate email domain
      if (!email.endsWith(config.companyDomain)) {
        throw new Error(`Please use your company email (${config.companyDomain})`);
      }

      const normalizedEmail = this.normalizeEmail(email);
      const role = this.determineRole(normalizedEmail);
      
      const name = email.split('@')[0]
        .split('.')
        .map(part => part.charAt(0).toUpperCase() + part.slice(1))
        .join(' ');
      
      const user: User = {
        id: this.stableUserIdFromEmail(normalizedEmail),
        email: normalizedEmail,
        name: name,
        role: role,
        department: this.getDepartmentFromEmail(email),
        employeeId: this.stableEmployeeIdFromEmail(normalizedEmail),
        createdAt: new Date().toISOString()
      };
      
      // ✅ Session is stored in cookie by server (via /api/auth/login)
      // No need to store in localStorage/sessionStorage
      this.currentUser = user;
      
      console.log('=== LOGIN DEBUG ===');
      console.log('Email:', user.email);
      console.log('Role assigned:', user.role);
      console.log('Is in admin list?', ADMIN_EMAILS.includes(normalizedEmail));
      console.log('==================');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      return user;
    } catch (error) {
      console.error('SSO login failed:', error);
      throw error;
    }
  }

  private getDepartmentFromEmail(email: string): string {
    const username = email.split('@')[0];
    
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
    } else {
      return 'General';
    }
  }

  async logout(): Promise<void> {
    this.currentUser = null;

    // Cookie will be cleared by /api/auth/logout endpoint
    // No need to manually delete here
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  getCurrentUser(): User | null {
    // ✅ Always try to reload from cookie if currentUser is null
    if (!this.currentUser && typeof window !== 'undefined') {
      this.loadUserFromSession();
    }
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return this.currentUser !== null;
  }

  isAdmin(): boolean {
    if (!this.currentUser) return false;
    return this.currentUser.role === 'admin';
  }

  async updateUserProfile(updates: Partial<User>): Promise<User> {
    if (!this.currentUser) {
      throw new Error('No user logged in');
    }

    // In production, this would call API to update user profile
    this.currentUser = {
      ...this.currentUser,
      ...updates,
      id: this.stableUserIdFromEmail(this.currentUser.email),
      email: this.normalizeEmail(this.currentUser.email),
      role: this.determineRole(this.currentUser.email) // Always re-check role
    };

    // Note: In production, the cookie would be updated by the server
    // For now, just update in-memory

    return this.currentUser;
  }

  // Check if user has permission for specific action
  hasPermission(action: string): boolean {
    if (!this.currentUser) return false;
    
    const adminActions = [
      'approve_optimization',
      'reject_optimization',
      'view_all_trips',
      'manage_users',
      'export_reports'
    ];
    
    if (adminActions.includes(action)) {
      return this.isAdmin();
    }
    
    return true; // Default allow for regular user actions
  }
}

export const authService = new AuthService();