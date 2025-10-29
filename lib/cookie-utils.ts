// lib/cookie-utils.ts
// Client-side cookie utilities for reading session from cookies

export function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;

  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);

  if (parts.length === 2) {
    const cookieValue = parts.pop()?.split(';').shift();
    return cookieValue || null;
  }

  return null;
}

export function getSessionFromCookie(): any | null {
  try {
    // ✅ Read from user_info cookie (non-HttpOnly, readable by JavaScript)
    // Note: HttpOnly 'session' cookie is used by server for validation
    const userInfoCookie = getCookie('user_info');

    if (!userInfoCookie) {
      console.log('⚠️ No user_info cookie found');
      console.log('📋 Available cookies:', document.cookie);
      return null;
    }

    // Decode and parse JSON
    const decoded = decodeURIComponent(userInfoCookie);
    const session = JSON.parse(decoded);
    console.log('✅ Session loaded from cookie:', session.email, '- Role:', session.role);
    return session;
  } catch (error) {
    console.error('❌ Error parsing user_info cookie:', error);
    console.error('Raw cookies:', document.cookie);
    return null;
  }
}

export function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;

  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
}
