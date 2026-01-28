# Production Fix Checklist

## 🚨 Current Issues on Production

1. ❌ **Users cannot save profile** - API returns 500 error
2. ❌ **Manifest.json/sw.js 404** - PWA files not found

## Root Cause

Production database is missing new columns that the code expects:
- `users.admin_location_id`
- `users.admin_assigned_at`
- `users.admin_assigned_by`
- And possibly other tables/columns from recent updates

## ✅ Fix Steps (MUST follow this order)

### Step 1: Backup Production Database ⚠️

**CRITICAL: Do this first!**

```bash
# SSH to production server
ssh user@production-server

# Backup database
mysqldump -u username -p trips_management > backup-before-migration-$(date +%Y%m%d-%H%M%S).sql

# Verify backup file exists and has content
ls -lh backup-*.sql
```

Store backup in safe location!

---

### Step 2: Run Database Migration on Production

Upload and run the migration SQL script:

```bash
# Option 1: Upload migration file to server
scp sql/PRODUCTION_MIGRATION_COMPLETE.sql user@production-server:~/

# SSH to server
ssh user@production-server

# Run migration
mysql -u username -p trips_management < PRODUCTION_MIGRATION_COMPLETE.sql
```

**Or Option 2: Copy-paste in MySQL CLI**

```bash
mysql -u username -p
USE trips_management;
SOURCE /path/to/PRODUCTION_MIGRATION_COMPLETE.sql;
```

**Expected output:**
```
STARTING PRODUCTION MIGRATION
Creating missing tables...
Adding missing columns...
✅ PRODUCTION MIGRATION COMPLETED
```

**Verify migration:**
```sql
-- Check if new columns exist
DESCRIBE users;

-- Should see:
-- admin_location_id
-- admin_assigned_at
-- admin_assigned_by

-- Check if new tables exist
SHOW TABLES LIKE 'locations';
SHOW TABLES LIKE 'admin_audit_log';
SHOW TABLES LIKE 'pending_admin_assignments';
```

---

### Step 3: Deploy Latest Code to Production

On your local machine:

```bash
# Make sure all changes are committed
git status

# Commit if needed
git add next.config.js nginx.conf.example DEPLOYMENT.md
git commit -m "fix: Add PWA headers and deployment guides"

# Push to main branch
git push origin main
```

On production server:

```bash
# SSH to server
ssh user@production-server

# Navigate to project
cd /path/to/trips-management-system

# Pull latest code
git pull origin main

# Check what was updated
git log --oneline -5

# Install any new dependencies
npm install

# Build production
npm run build:production
```

---

### Step 4: Update Nginx Configuration (If using Nginx)

```bash
# Backup current Nginx config
sudo cp /etc/nginx/sites-available/trip.intersnack.com.vn /etc/nginx/sites-available/trip.intersnack.com.vn.backup

# Edit Nginx config - add the manifest.json and sw.js rules
sudo nano /etc/nginx/sites-available/trip.intersnack.com.vn
```

**Add these location blocks** (refer to nginx.conf.example):

```nginx
# PWA Manifest
location = /manifest.json {
    proxy_pass http://localhost:50001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    add_header Content-Type "application/manifest+json" always;
    add_header Cache-Control "public, max-age=3600, must-revalidate" always;
}

# Service Worker
location = /sw.js {
    proxy_pass http://localhost:50001;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    add_header Content-Type "application/javascript" always;
    add_header Cache-Control "public, max-age=0, must-revalidate" always;
    add_header Service-Worker-Allowed "/" always;
}
```

**Test and reload Nginx:**

```bash
# Test config
sudo nginx -t

# If OK, reload
sudo systemctl reload nginx
```

---

### Step 5: Restart PM2

```bash
# Restart the app
pm2 restart trips-management-system

# Check status
pm2 status

# Monitor logs for errors
pm2 logs trips-management-system --lines 100
```

---

### Step 6: Verify Fix on Production

#### Test 1: Check Manifest and Service Worker

Open browser:
1. Go to https://trip.intersnack.com.vn/manifest.json
2. Should return JSON content (not 404)
3. Go to https://trip.intersnack.com.vn/sw.js
4. Should return JavaScript code (not 404)

#### Test 2: Check Profile Setup

1. Login with a test user (NOT super admin)
2. Go to profile setup page
3. Fill in all fields:
   - Department
   - Office Location
   - Employee ID
   - Phone
   - Pickup Address
   - Select Manager
4. Click "Complete Profile"

**Expected:**
- ✅ Profile saves successfully
- ✅ Manager confirmation email sent
- ✅ Redirected to dashboard
- ✅ NO 500 error in console
- ✅ NO manifest.json 404 error

#### Test 3: Check Database

```sql
-- Check if profile was saved
SELECT * FROM users WHERE email = 'test@intersnack.com.vn';

-- Should have:
-- profile_completed = TRUE
-- pending_manager_email = 'manager@intersnack.com.vn'
-- admin_location_id (if applicable)
-- admin_assigned_at (if applicable)

-- Check manager confirmation was created
SELECT * FROM manager_confirmations
WHERE user_email = 'test@intersnack.com.vn'
ORDER BY created_at DESC LIMIT 1;
```

---

## 🔍 Troubleshooting

### Issue: Migration script fails

**Error: "Column already exists"**
- This is OK, script handles this
- Continue to next step

**Error: "Table doesn't exist"**
- Your database might be out of sync
- Check which tables are missing:
  ```sql
  SHOW TABLES;
  ```

### Issue: Still getting 500 error after migration

**Check server logs:**
```bash
pm2 logs trips-management-system --lines 50
```

Look for specific error message. Most likely:
- Database connection issue
- Missing environment variables
- Permission errors

**Verify columns exist:**
```sql
DESCRIBE users;
```

Should see `admin_location_id`, `admin_assigned_at`, `admin_assigned_by`

### Issue: Manifest.json still 404

**Check if files exist:**
```bash
ls -la public/manifest.json
ls -la public/sw.js
```

**Check Nginx is serving correctly:**
```bash
curl http://localhost:50001/manifest.json
```

If curl works but browser doesn't, it's an Nginx issue.

**Check Nginx logs:**
```bash
sudo tail -f /var/log/nginx/trip.intersnack.com.vn.error.log
```

---

## ✅ Success Criteria

All these should work:
- [ ] https://trip.intersnack.com.vn loads without console errors
- [ ] https://trip.intersnack.com.vn/manifest.json returns JSON (200 OK)
- [ ] https://trip.intersnack.com.vn/sw.js returns JavaScript (200 OK)
- [ ] Users can save profile without 500 error
- [ ] Manager confirmation email is sent
- [ ] No errors in PM2 logs
- [ ] Database has new columns

---

## 📞 If Something Goes Wrong

### Rollback Database:
```bash
mysql -u username -p trips_management < backup-before-migration-YYYYMMDD-HHMMSS.sql
```

### Rollback Code:
```bash
git log --oneline -10
git reset --hard COMMIT_HASH_BEFORE_CHANGES
npm run build:production
pm2 restart trips-management-system
```

### Get Help:
1. Check PM2 logs: `pm2 logs trips-management-system`
2. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. Check MySQL logs: `sudo tail -f /var/log/mysql/error.log`

---

## 📝 Post-Deployment

After successful deployment:
- [ ] Monitor logs for 30 minutes
- [ ] Test with multiple users
- [ ] Verify emails are being sent
- [ ] Check no new errors in console
- [ ] Update documentation if needed

---

**Good luck! 🚀**
