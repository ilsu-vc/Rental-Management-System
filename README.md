# 🏢 RentaHub — Rental Property Management SaaS

All-in-one monitoring, logging, and billing platform for rental property management.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express + TypeScript
- **Database**: Supabase (PostgreSQL + Auth + Storage)
- **Charts**: Recharts
- **Export**: SheetJS (xlsx/csv)

## Setup

### 1. Database (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run the contents of `supabase/schema.sql`
3. Create your first admin user:
   - Go to **Authentication > Users > Add User**
   - Create a user with your email and password
   - Go to **SQL Editor** and run:
     ```sql
     INSERT INTO admin_profiles (auth_user_id, full_name, email, role)
     VALUES ('<user-id-from-auth>', 'Your Name', 'your@email.com', 'super_admin');
     ```

### 2. Environment Variables

Copy the `.env.example` in the `server/` directory:
```bash
cp server/.env.example server/.env
```

Fill in your Supabase credentials:
- `SUPABASE_URL` — Your project URL
- `SUPABASE_ANON_KEY` — Your anon/public key
- `SUPABASE_SERVICE_ROLE_KEY` — Your service role key (found in Settings > API)

### 3. Install Dependencies

```bash
npm run install:all
```

### 4. Run the Application

```bash
npm run dev
```

This starts both the backend (port 3001) and frontend (port 5173) concurrently.

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001/api/health

## Features

| Feature | Description |
|---------|-------------|
| 🏢 Building Management | Manage 5+ buildings with 15 rooms each |
| 🚪 Room Management | Track occupancy, capacity, and monthly rates |
| 👥 Tenant Management | Add/remove tenants, multiple emails per room account |
| 💧 Bill Posting | Post water, electricity, and utility bills with photo upload |
| 📢 Announcements | Post notices visible to all tenants on the homepage |
| 📊 Financial Reports | Charts and analytics with Excel/CSV export |
| 🔐 Dual Portal | Admin dashboard + Tenant portal with role-based access |
| 📧 Multi-Email Accounts | Multiple tenants per room, one primary email per account |

## Project Structure

```
rental-management-saas/
├── client/              # React Frontend (Vite)
│   └── src/
│       ├── components/  # Layout, shared UI
│       ├── contexts/    # Auth context
│       ├── pages/       # All route pages
│       ├── services/    # API service layer
│       └── types/       # TypeScript definitions
├── server/              # Express Backend
│   └── src/
│       ├── config/      # Supabase client
│       ├── middleware/   # Auth middleware
│       ├── routes/      # API route handlers
│       └── index.ts     # Server entry
└── supabase/
    └── schema.sql       # Database schema + seed data
```
