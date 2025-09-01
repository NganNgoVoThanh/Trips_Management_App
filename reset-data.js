// Run this in browser console to reset data
localStorage.clear();
sessionStorage.clear();
document.cookie.split(";").forEach(c => {
  document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
});
console.log("✅ All data cleared");

// Test admin login
const adminUser = {
  id: 'admin-1',
  email: 'admin@intersnack.com.vn',
  name: 'Admin',
  role: 'admin',
  createdAt: new Date().toISOString()
};
sessionStorage.setItem('currentUser', JSON.stringify(adminUser));
document.cookie = `session=${JSON.stringify(adminUser)}; path=/; max-age=86400`;
window.location.href = '/admin/dashboard';
