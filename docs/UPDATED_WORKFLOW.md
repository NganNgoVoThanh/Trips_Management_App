# Trips Management System - Operational Workflow (Current Version)

## 1. System Overview
The **Trips Management System** is a comprehensive solution for managing corporate travel, from request submission to manager approval and AI-driven cost optimization. It integrates with **Azure AD** for authentication and uses a **MySQL** database for robust data storage.

---

## 2. Roles & Permissions Model

The system implements a tiered permission model combining functional roles (User/Admin) with location-based scope.

| Role | Scope | Key Responsibilities |
|------|-------|----------------------|
| **User (Employee)** | Personal | • Submit trip requests<br>• Manage personal profile (Manager selection)<br>• View own trip status |
| **Manager** | Direct Reports | • Approve/Reject trip requests via Email (JWT Link)<br>• Review justification for business travel |
| **Location Admin** | Specific Factory/Office | • Manage trips for assigned location (e.g., Phan Thiet Factory)<br>• View analytics for their location<br>• Handle local dispatching |
| **Super Admin** | Global | • Full system access<br>• Manage all trips, users, and locations<br>• Assign Location Admins<br>• Access global analytics and AI settings |

---

## 3. Database Schema (Core Entities)

### A. Users (`users`)
*   **Identity**: Linked to Azure AD (Object ID, Email).
*   **Hierarchy**: Stores self-selected Manager info (`manager_email`, `manager_name`).
*   **Profile**: Tracks `profile_completed` status (Wizard).
*   **Admin Scope**: `admin_type` (super/location) and `admin_location_id`.

### B. Trips (`trips`)
*   **Core Data**: Departure, Destination, Date, Time, Purpose.
*   **Workflow State**: `manager_approval_status` (pending/approved/rejected/expired).
*   **Flags**: `is_urgent` (<24h), `auto_approved` (VIP/No Manager).
*   **Security**: `manager_approval_token` (Secure JWT for email links).

### C. Admin Management
*   **Locations**: Factories/Offices definitions.
*   **Admin Audit Log**: Tracks all permission changes (promotions/demotions).

---

## 4. Operational Workflow

### Phase 1: Authentication & Onboarding
1.  **Login**: User logs in via **Microsoft Azure AD**.
2.  **Profile Check**: System checks if `profile_completed` is true.
3.  **Setup Wizard**: If new, user *must* select their Direct Manager and update contact info (Phone/Pickup Address).
4.  **Session**: User role (Admin/User) and Location scope are baked into the session.

### Phase 2: Trip Submission & Validation
1.  **Submission**: User fills trip details (One-way/Round-trip).
2.  **Logic Checks**:
    *   **Urgency**: If departure is < 24h, trip is flagged as `is_urgent` (Status: `pending_urgent`).
    *   **Auto-Approval**: If user is VIP or has no manager, trip is `auto_approved`.
3.  **Creation**: Trip saved to DB with status `pending_approval`.

### Phase 3: Approval Process (The "Human Logic")
1.  **Notification**: System sends email to the assigned **Manager**.
    *   *Content*: Trip details, Cost estimate, Employee purpose.
    *   *Action*: Contains secure **Approve** and **Reject** links (signed with JWT).
2.  **Manager Action**:
    *   **Approve**: Token validated -> Status updates to `approved`. User notified.
    *   **Reject**: Manager provides reason -> Status `rejected`. User notified.
    *   **Expiry**: If no action in 48h -> Status `expired`. Notification sent to Admin/User.

### Phase 4: AI Optimization Engine
*The "Brain" of the system, running on `approved` trips.*

1.  **Grouping Strategy**:
    *   The `AIOptimizer` scans all trips with status `approved`.
    *   **Step 1 (Basic)**: Groups trips by exact **Date** and **Route** (Departure -> Destination).
    *   **Step 2 (AI Analysis)**:
        *   If `OPENAI_API_KEY` is present, sends trip clusters to AI.
        *   **Input**: Trip times, Passenger counts, Vehicle constraints (4/7/16 seats costs).
        *   **Goal**: Minimize total cost while respecting `maxWaitTime` and `maxDetour`.
2.  **Proposal Generation**:
    *   System calculates **Estimated Savings** (e.g., "Combine 3 separate cars into 1 Van").
    *   Creates an `OptimizationProposal`.
3.  **Status Update**: Trips move to `proposed` state.

### Phase 5: Execution & Dispatch
1.  **Admin Review**: Admin sees "Optimization Proposals" in dashboard.
    *   *View*: "Combine User A (08:00) and User B (08:30) into Car request #123".
2.  **Confirmation**: Admin accepts proposal -> Trips updated to `optimized`.
3.  **Dispatch**: Vehicle assigned (External Service/Driver).

---

## 5. Technology Stack Summary
*   **Backend**: Next.js App Router (Node.js).
*   **Database**: MySQL (Raw SQL + `mysql2`).
*   **Auth**: NextAuth.js + Azure AD (OIDC).
*   **AI**: OpenAI GPT-3.5/4 (via `lib/ai-optimizer.ts`).
*   **Email**: SMTP / Microsoft Graph API (for approval links).
