// fix-navigation.js
// Add this script to test navigation from browser console

// Test direct navigation
function testNavigation() {
  // Get current user from session
  const sessionCookie = document.cookie
    .split('; ')
    .find(row => row.startsWith('session='));
  
  if (!sessionCookie) {
    console.log('❌ No session found. Please login first.');
    return;
  }
  
  try {
    const session = JSON.parse(decodeURIComponent(sessionCookie.split('=')[1]));
    console.log('✅ Session found:', session);
    
    // Navigate based on role
    if (session.role === 'admin') {
      console.log('🚀 Redirecting to admin dashboard...');
      window.location.href = '/admin/dashboard';
    } else {
      console.log('🚀 Redirecting to user dashboard...');
      window.location.href = '/dashboard';
    }
  } catch (error) {
    console.error('❌ Invalid session:', error);
  }
}

// Force navigation (bypass Next.js router)
function forceNavigate(path) {
  window.location.href = path;
}

// Clear session and reload
function clearSession() {
  document.cookie = 'session=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
  sessionStorage.clear();
  localStorage.clear();
  console.log('✅ Session cleared');
  window.location.href = '/';
}

// Manual login simulation
function simulateLogin(email, role = 'user') {
  const user = {
    id: `user-${Date.now()}`,
    email: email,
    name: email.split('@')[0].replace('.', ' '),
    role: role,
    createdAt: new Date().toISOString()
  };
  
  // Set cookie
  document.cookie = `session=${JSON.stringify(user)}; path=/; max-age=86400`;
  
  // Set sessionStorage
  sessionStorage.setItem('currentUser', JSON.stringify(user));
  
  console.log('✅ Login simulated:', user);
  
  // Navigate
  if (role === 'admin') {
    window.location.href = '/admin/dashboard';
  } else {
    window.location.href = '/dashboard';
  }
}

console.log('Navigation helper loaded. Available functions:');
console.log('- testNavigation() : Test current session and navigate');
console.log('- forceNavigate("/dashboard") : Force navigate to path');
console.log('- clearSession() : Clear all sessions');
console.log('- simulateLogin("user@intersnack.com.vn", "admin") : Simulate login');