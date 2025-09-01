# Trips Management System - Intersnack

## 🚀 Overview
A comprehensive business trip management system designed for Intersnack Vietnam to optimize travel costs through intelligent trip combining and AI-powered suggestions.

## 🏢 Company Locations
- **Ho Chi Minh Office**: 76 Le Lai Street, District 1, HCMC
- **Phan Thiet Factory**: Phan Thiet Industrial Zone Phase 1, Binh Thuan
- **Long An Factory**: Loi Binh Nhon Industrial Cluster, Long An
- **Tay Ninh Factory**: Kinh Te Hamlet, Binh Minh, Tay Ninh

## 📋 Features

### For Employees
- Register business trips with departure/return details
- View available trips for potential combining
- Track trip status and approvals
- Receive notifications about schedule changes

### For Administrators
- AI-powered trip optimization suggestions
- Approve/reject optimization proposals
- Monitor all company trips
- Send notifications to affected employees
- Export reports and analytics

## 🛠️ Technology Stack
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Database**: Microsoft Fabric OneLake
- **AI Integration**: OpenAI GPT-4 / Claude API
- **Authentication**: SSO with @intersnack.com.vn domain

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Microsoft Fabric account
- OpenAI or Claude API key

### Setup Steps

1. **Clone the repository**
```bash
git clone [repository-url]
cd trips-management
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your actual credentials:
- Microsoft Fabric credentials
- OpenAI/Claude API key
- SSO configuration (if applicable)

4. **Run development server**
```bash
npm run dev
```

5. **Access the application**
Open [http://localhost:3000](http://localhost:3000)

## 🔐 Authentication

### Admin Access
The following emails have admin privileges by default:
- admin@intersnack.com.vn
- manager@intersnack.com.vn
- operations@intersnack.com.vn

To add more admin emails, update the `adminEmails` array in `lib/config.ts`.

### User Access
All employees with @intersnack.com.vn email can access the system as regular users.

## 📊 Microsoft Fabric Setup

### Creating Tables in OneLake

1. **Trips Table**
```sql
CREATE TABLE trips (
  id VARCHAR(50) PRIMARY KEY,
  userId VARCHAR(50),
  userName VARCHAR(100),
  userEmail VARCHAR(100),
  departureLocation VARCHAR(50),
  destination VARCHAR(50),
  departureDate DATE,
  departureTime TIME,
  returnDate DATE,
  returnTime TIME,
  status VARCHAR(20),
  vehicleType VARCHAR(20),
  estimatedCost DECIMAL(10,2),
  actualCost DECIMAL(10,2),
  optimizedGroupId VARCHAR(50),
  originalDepartureTime TIME,
  notified BOOLEAN,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

2. **Optimization Groups Table**
```sql
CREATE TABLE optimization_groups (
  id VARCHAR(50) PRIMARY KEY,
  trips JSON,
  proposedDepartureTime TIME,
  vehicleType VARCHAR(20),
  estimatedSavings DECIMAL(10,2),
  status VARCHAR(20),
  createdBy VARCHAR(50),
  createdAt TIMESTAMP,
  approvedBy VARCHAR(50),
  approvedAt TIMESTAMP
);
```

## 🤖 AI Configuration

### Using OpenAI
1. Get API key from [OpenAI Platform](https://platform.openai.com)
2. Add to `.env.local`:
```
NEXT_PUBLIC_OPENAI_API_KEY=sk-...
```

### Using Claude
1. Get API key from [Anthropic Console](https://console.anthropic.com)
2. Add to `.env.local`:
```
NEXT_PUBLIC_CLAUDE_API_KEY=sk-ant-...
```

## 📱 Usage Guide

### For Employees

1. **Login**: Use your @intersnack.com.vn email
2. **Register Trip**: 
   - Select departure/destination locations
   - Choose dates and times
   - Submit for approval
3. **View Status**: Check your trips in "Upcoming Trips"
4. **Notifications**: Receive updates if your trip is optimized

### For Administrators

1. **Login**: Use admin email account
2. **View Pending Trips**: See all submitted trips
3. **Run Optimization**: Click "Run Optimization" to get AI suggestions
4. **Review Proposals**: 
   - Check estimated savings
   - View affected employees
   - Approve or reject proposals
5. **Send Notifications**: Notify employees about changes

## 🔧 Troubleshooting

### Fabric Connection Issues
- Verify Fabric credentials in `.env.local`
- Check network connectivity to Fabric endpoints
- Application falls back to localStorage if Fabric is unavailable

### AI API Errors
- Verify API keys are valid
- Check API rate limits
- System uses basic optimization if AI is unavailable

### Authentication Problems
- Ensure email ends with @intersnack.com.vn
- Clear browser cache and cookies
- Check sessionStorage for user data

## 📈 Cost Optimization Algorithm

The system optimizes trips based on:
- **Route similarity**: Same departure and destination
- **Time proximity**: Trips within 30-minute window
- **Vehicle capacity**: Selecting appropriate vehicle size
- **Minimum savings**: At least 15% cost reduction

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Docker Deployment
```bash
docker build -t trips-management .
docker run -p 3000:3000 trips-management
```

## 📝 License
© 2025 Intersnack Vietnam. All rights reserved.

## 📞 Support
For technical support, contact: it@intersnack.com.vn