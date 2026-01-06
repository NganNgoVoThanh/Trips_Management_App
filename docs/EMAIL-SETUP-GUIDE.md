# 📧 Email Service Setup Guide

Complete guide for setting up Microsoft Graph API email service for Trips Management System.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Email Architecture](#email-architecture)
3. [Configuration](#configuration)
4. [Email Categories](#email-categories)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Production Deployment](#production-deployment)

---

## 🎯 Overview

The Trips Management System uses **Microsoft Graph API** to send emails through company email addresses. This setup replaces traditional SMTP and provides better security, reliability, and integration with Microsoft 365.

### Key Features

✅ **OAuth2 Authentication** - Secure client credentials flow
✅ **Dual Sender Addresses** - Separate addresses for different email types
✅ **Auto-routing** - Emails automatically use correct sender
✅ **Professional Templates** - HTML email templates with company branding
✅ **Error Handling** - Robust retry and logging mechanisms

---

## 🏗️ Email Architecture

### Email Sender Addresses

| Sender Address | Purpose | Usage |
|---------------|---------|-------|
| `no-reply.trips@intersnack.com.vn` | General notifications, verifications, alerts | Manager confirmations, profile verifications, system notifications |
| `trip-approvals@intersnack.com.vn` | Official approval emails | Trip approvals, manager approvals (when configured by IT) |

### Email Flow

```
User Action
    ↓
Application Logic
    ↓
Email Router (categorizes email type)
    ↓
Microsoft Graph Service
    ↓
OAuth2 Token (cached, auto-refresh)
    ↓
Microsoft Graph API
    ↓
Email Sent ✅
```

---

## ⚙️ Configuration

### Environment Variables

#### Required Variables

```bash
# Azure AD Tenant
AZURE_AD_TENANT_ID=bdadacdd-ef8e-4af3-bdaf-845153ea058e

# Microsoft Graph API Credentials
GRAPH_CLIENT_ID=e1cb2f45-1b4e-404d-ac93-870333c10dea
GRAPH_CLIENT_SECRET=YOUR_CLIENT_SECRET

# Email Sender Addresses
EMAIL_NO_REPLY=no-reply.trips@intersnack.com.vn
EMAIL_APPROVALS=trip-approvals@intersnack.com.vn

# Base URL (for email links)
NEXT_PUBLIC_BASE_URL=https://trip.intersnack.com.vn
```

#### Configuration Files

**Production**: `.env.production`
```bash
GRAPH_CLIENT_ID=e1cb2f45-1b4e-404d-ac93-870333c10dea
GRAPH_CLIENT_SECRET=YOUR_CLIENT_SECRET
EMAIL_NO_REPLY=no-reply.trips@intersnack.com.vn
EMAIL_APPROVALS=trip-approvals@intersnack.com.vn
NEXT_PUBLIC_BASE_URL=https://trip.intersnack.com.vn
```

**Local Testing**: `.env.local`
```bash
GRAPH_CLIENT_ID=e1cb2f45-1b4e-404d-ac93-870333c10dea
GRAPH_CLIENT_SECRET=YOUR_CLIENT_SECRET
EMAIL_NO_REPLY=no-reply.trips@intersnack.com.vn
NEXT_PUBLIC_BASE_URL=http://localhost:50001
```

### Azure AD Permissions

The application requires the following permission:

- **Mail.Send** (Application permission) - Required for sending emails

> ⚠️ **Important**: IT must grant admin consent for this permission in Azure Portal.

---

## 📂 Email Categories

The system automatically routes emails based on their category:

### 1. Verification Emails (`no-reply@`)

**Used for:**
- Manager confirmation requests
- Email address verifications
- Profile setup confirmations

**Example:**
```typescript
import { graphEmailService } from '@/lib/microsoft-graph-email';

await graphEmailService.sendManagerConfirmation({
  to: 'manager@intersnack.com.vn',
  managerEmail: 'manager@intersnack.com.vn',
  userName: 'John Doe',
  userEmail: 'john.doe@intersnack.com.vn',
  confirmUrl: 'https://trip.intersnack.com.vn/confirm?token=...',
  rejectUrl: 'https://trip.intersnack.com.vn/reject?token=...',
  expiresAt: new Date('2025-01-07')
});
```

### 2. Notification Emails (`no-reply@`)

**Used for:**
- Trip confirmations
- Status updates
- General system notifications

**Example:**
```typescript
import { sendGraphEmail } from '@/lib/microsoft-graph-email';

await sendGraphEmail({
  to: 'user@intersnack.com.vn',
  subject: 'Trip Registration Confirmed',
  html: '<html>...</html>',
  from: 'no-reply' // Uses no-reply.trips@
});
```

### 3. Approval Emails (`approvals@`)

**Used for:**
- Trip approvals
- Manager approvals
- Official business decisions

**Example:**
```typescript
await sendGraphEmail({
  to: 'user@intersnack.com.vn',
  subject: 'Trip Approved',
  html: '<html>...</html>',
  from: 'approvals' // Uses trip-approvals@
});
```

### 4. Alert Emails (`no-reply@`)

**Used for:**
- Urgent notifications
- Expiry warnings
- System alerts

**Example:**
```typescript
await sendGraphEmail({
  to: 'admin@intersnack.com.vn',
  subject: '⚠️ Urgent: Trip Approval Expiring',
  html: '<html>...</html>',
  from: 'no-reply'
});
```

---

## 🧪 Testing

### Test Email Sending

Run the test script to verify email configuration:

```bash
# Test with your email
node scripts/test-graph-email.js your.email@intersnack.com.vn

# Test with default email (ngan.ngo@intersnack.com.vn)
node scripts/test-graph-email.js
```

### Expected Output

```
=== Microsoft Graph API Email Test ===

📋 Configuration Check:
GRAPH_CLIENT_ID: ✅ Set
GRAPH_CLIENT_SECRET: ✅ Set
AZURE_AD_TENANT_ID: ✅ Set
EMAIL_NO_REPLY: no-reply.trips@intersnack.com.vn

📧 Test Email Recipient: your.email@intersnack.com.vn

🔑 Step 1: Getting OAuth2 Access Token...
✅ Access token obtained successfully
   Token type: Bearer
   Expires in: 3599 seconds

📤 Step 2: Sending test email via Graph API...
✅ Email sent successfully via Microsoft Graph API!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ SUCCESS!
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Verify Receipt

1. Check your inbox for test email
2. Verify sender: `Trips Management System <no-reply.trips@intersnack.com.vn>`
3. Check email formatting and links
4. Confirm all images and styles render correctly

---

## 🔧 Troubleshooting

### Common Issues

#### 1. 403 Forbidden Error

**Error Message:**
```
❌ 403 FORBIDDEN ERROR
The application does not have permission to send emails.
```

**Solution:**
- Contact IT to grant **Mail.Send** permission
- Ensure admin consent is granted in Azure Portal
- Verify the app registration has correct permissions

**Steps for IT:**
1. Go to Azure Portal → App Registrations
2. Select the application
3. Go to API Permissions
4. Add **Mail.Send** (Application permission)
5. Click "Grant admin consent"

#### 2. Token Acquisition Failed

**Error Message:**
```
Failed to get Graph API access token
```

**Solution:**
- Verify `GRAPH_CLIENT_ID` is correct
- Verify `GRAPH_CLIENT_SECRET` is correct and not expired
- Verify `AZURE_AD_TENANT_ID` is correct
- Check network connectivity to login.microsoftonline.com

#### 3. Invalid Sender Address

**Error Message:**
```
Email send failed: 400 - Invalid sender address
```

**Solution:**
- Verify sender mailbox exists in Microsoft 365
- Ensure the app has permission to send on behalf of the sender
- Contact IT to verify mailbox configuration

#### 4. Network Errors

**Error Message:**
```
getaddrinfo ENOTFOUND login.microsoftonline.com
```

**Solution:**
- Check internet connection
- Verify firewall allows outbound HTTPS to Microsoft servers
- Check proxy settings if behind corporate proxy

---

## 🚀 Production Deployment

### Pre-Deployment Checklist

- [ ] Environment variables configured in `.env.production`
- [ ] Azure AD permissions granted and admin-consented
- [ ] Email addresses created in Microsoft 365
- [ ] Test email sent and received successfully
- [ ] Email templates reviewed and approved
- [ ] Error handling tested
- [ ] Logging configured

### Deployment Steps

1. **Update Environment Variables**
   ```bash
   # Ensure production .env.production has correct values
   GRAPH_CLIENT_ID=e1cb2f45-1b4e-404d-ac93-870333c10dea
   GRAPH_CLIENT_SECRET=YOUR_CLIENT_SECRET
   NEXT_PUBLIC_BASE_URL=https://trip.intersnack.com.vn
   ```

2. **Build Application**
   ```bash
   npm run build:production
   ```

3. **Test Email in Production**
   ```bash
   NODE_ENV=production node scripts/test-graph-email.js test@intersnack.com.vn
   ```

4. **Deploy to Server**
   ```bash
   npm run pm2:restart:production
   ```

5. **Monitor Logs**
   ```bash
   pm2 logs trips-management-production
   ```

6. **Verify Email Sending**
   - Trigger a real email (e.g., manager confirmation)
   - Check application logs for success
   - Verify recipient receives email

### Monitoring

Monitor email sending in production:

```bash
# Check PM2 logs
pm2 logs trips-management-production | grep "Email sent"

# Check for errors
pm2 logs trips-management-production | grep "Failed to send email"
```

### Email Metrics

Track these metrics:
- ✅ Emails sent successfully
- ❌ Failed email attempts
- ⏱️ Token acquisition time
- 📊 Email send latency

---

## 📞 Support

### Contact IT for:

- Azure AD permission issues
- New email addresses
- Client secret rotation
- Permission changes
- 403 Forbidden errors

### Application Issues:

Contact development team for:
- Email template bugs
- Routing logic issues
- Integration problems
- Feature requests

---

## 📚 References

- [Microsoft Graph API Documentation](https://learn.microsoft.com/en-us/graph/api/user-sendmail)
- [OAuth 2.0 Client Credentials Flow](https://learn.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
- [Mail.Send Permission](https://learn.microsoft.com/en-us/graph/permissions-reference#mailsend)

---

**Last Updated**: 2025-12-31
**Version**: 1.0.0
**Author**: Development Team
