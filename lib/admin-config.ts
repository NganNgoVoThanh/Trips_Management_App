// lib/admin-config.ts
// Configuration for default admin assignments

export interface AdminConfig {
  email: string;
  name: string;
  adminType: 'super_admin' | 'location_admin';
  locationCode?: string; // For location admins
}

/**
 * Default admin assignments
 * These users will be automatically assigned admin roles when they complete profile setup
 */
export const DEFAULT_ADMINS: AdminConfig[] = [
  {
    email: 'ngan.ngo@intersnack.com.vn',
    name: 'Ngan Ngo',
    adminType: 'super_admin',
  },
  {
    email: 'yen.pham@intersnack.com.vn',
    name: 'Yen Pham',
    adminType: 'location_admin',
    locationCode: 'TAY_NINH',
  },
  {
    email: 'nhung.cao@intersnack.com.vn',
    name: 'Nhung Cao',
    adminType: 'location_admin',
    locationCode: 'PHAN_THIET',
  },
  {
    email: 'chi.huynh@intersnack.com.vn',
    name: 'Chi Huynh',
    adminType: 'location_admin',
    locationCode: 'LONG_AN',
  },
  {
    email: 'anh.do@intersnack.com.vn',
    name: 'Anh Do',
    adminType: 'location_admin',
    locationCode: 'HCM',
  },
];

/**
 * Location code to location ID mapping
 */
export const LOCATION_MAPPING: Record<string, string> = {
  'TAY_NINH': 'tay-ninh-factory',
  'PHAN_THIET': 'phan-thiet-factory',
  'LONG_AN': 'long-an-factory',
  'HCM': 'hcm-office',
};

/**
 * Check if email should be auto-assigned as admin
 */
export function getAdminConfig(email: string): AdminConfig | null {
  const normalizedEmail = email.toLowerCase().trim();
  return DEFAULT_ADMINS.find(admin => admin.email.toLowerCase() === normalizedEmail) || null;
}

/**
 * Check if email is super admin
 */
export function isSuperAdmin(email: string): boolean {
  const config = getAdminConfig(email);
  return config?.adminType === 'super_admin';
}

/**
 * Check if email is location admin
 */
export function isLocationAdmin(email: string): boolean {
  const config = getAdminConfig(email);
  return config?.adminType === 'location_admin';
}

/**
 * Get location ID for location admin
 */
export function getLocationId(email: string): string | null {
  const config = getAdminConfig(email);
  if (config?.locationCode) {
    return LOCATION_MAPPING[config.locationCode] || null;
  }
  return null;
}
