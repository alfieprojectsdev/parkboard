# 🚗 ParkBoard - Condo Parking Management System

A modern, responsive parking slot booking system for residential condominiums. Built with Next.js 15, Supabase, and TypeScript.

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Status](#project-status)
- [Getting Started](#getting-started)
- [Database Setup](#database-setup)
- [Testing](#testing)
- [Architecture](#architecture)
- [API Documentation](#api-documentation)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

## ✨ Features

### Core MVP Features (✅ Implemented)
- **User Authentication**: Secure login/signup with Supabase Auth
- **Profile Management**: Automatic profile creation on signup
- **Slot Booking**: Real-time availability checking with conflict prevention
- **Booking Management**: View, cancel, and track booking history
- **Slot Ownership**: Support for deeded/assigned slots and shared/visitor slots
- **Admin Dashboard**: Comprehensive oversight of users, slots, and bookings
- **Mobile Responsive**: Works seamlessly on all devices
- **Error Handling**: Graceful error recovery with user-friendly messages

### Business Rules
- Minimum booking duration: 1 hour
- Maximum booking duration: 24 hours
- Maximum advance booking: 30 days
- Cancellation grace period: 1 hour
- Slot types: Covered, Uncovered, Visitor
- Mixed ownership model: Owned slots + shared slots

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), TypeScript, React 18
- **Styling**: Tailwind CSS v3, shadcn/ui components
- **Database**: Supabase (PostgreSQL) with Row Level Security
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (recommended)
- **State Management**: React hooks + Context API

## 📊 Project Status

### Current Version: MVP 1.1
- ✅ Core booking functionality complete
- ✅ Slot ownership system integrated
- ✅ Admin management tools active
- ✅ Production-ready with RLS policies
- ✅ Comprehensive error handling

### Next Phase (v1.2)
- [ ] Email notifications
- [ ] Payment integration (GCash, bank transfer)
- [ ] Recurring bookings
- [ ] Advanced reporting
- [ ] Mobile app

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/parkboard.git
cd parkboard
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env.local
```

Edit `.env.local` with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

4. **Run development server**
```bash
npm run dev
```

Visit `http://localhost:3000`

## 💾 Database Setup

### 1. Create Tables
Run these SQL scripts in order in your Supabase SQL Editor:

```sql
-- 1. Run schema.sql
-- 2. Run rls_policies.sql  
-- 3. Run migrations/add_slot_ownership.sql
-- 4. Run seed_data.sql (for testing)
```

### 2. Enable Row Level Security
All tables have RLS enabled with appropriate policies for:
- Users can only see/edit their own data
- Admins have broader access
- Slot ownership is enforced

### 3. Create Initial Admin
```sql
-- After creating a user through the app, promote to admin:
UPDATE user_profiles 
SET role = 'admin' 
WHERE email = 'admin@yourcompany.com';
```

## 🧪 Testing

### Quick Test Checklist
Run through `merged_qa_checklist.md` for comprehensive testing:

1. **Authentication Flow**
   - Sign up with email/password
   - Profile auto-creation
   - Login/logout functionality

2. **Booking Flow** 
   - Select time range
   - Choose available slot
   - Confirm booking
   - View in My Bookings
   - Cancel if needed

3. **Ownership Validation**
   - Owned slots appear with "Your Slot" badge
   - Can book owned slots anytime available
   - Cannot book slots owned by others
   - Can book shared/visitor slots

4. **Admin Functions**
   - View all bookings
   - Manage slots (add/edit/delete)
   - Assign slot ownership
   - Change user roles

### Test Data
Use the provided seed data for testing:
- 3 test users (resident, owner, admin)
- 10 parking slots (mixed types)
- Sample bookings

## 🏗 Architecture

### Directory Structure
```
parkboard/
├── app/                  # Next.js App Router
│   ├── api/             # API routes
│   ├── admin/           # Admin pages
│   ├── bookings/        # Booking pages
│   └── dashboard/       # User dashboard
├── components/          # React components
│   ├── auth/           # Authentication
│   ├── booking/        # Booking components
│   ├── common/         # Shared components
│   └── ui/             # shadcn/ui components
├── lib/                # Utilities
│   ├── supabase.ts     # Supabase client
│   └── constants.ts    # App constants
└── db/                 # Database scripts
    ├── schema.sql      # Table definitions
    ├── rls_policies.sql # Security policies
    └── migrations/     # Schema updates
```

### Database Schema
```
user_profiles (extends auth.users)
├── id (uuid, FK to auth.users)
├── name, unit_number, email
├── role (resident/admin)
└── vehicle_plate, phone

parking_slots
├── slot_id (serial, PK)
├── slot_number (unique)
├── slot_type (covered/uncovered/visitor)
├── status (available/maintenance/reserved)
├── owner_id (FK to auth.users, nullable)
└── description

bookings
├── booking_id (serial, PK)
├── user_id (FK to auth.users)
├── slot_id (FK to parking_slots)
├── start_time, end_time (timestamptz)
├── status (confirmed/cancelled/completed)
└── notes
```

## 📡 API Documentation

### Endpoints

#### Bookings
- `GET /api/bookings` - Get user's bookings
- `POST /api/bookings` - Create new booking
- `PATCH /api/bookings/[id]` - Update booking
- `DELETE /api/bookings/[id]` - Cancel booking

#### Slots
- `GET /api/slots` - Get all slots
- `POST /api/slots` - Create slot (admin)
- `PATCH /api/slots/[id]` - Update slot (admin)
- `DELETE /api/slots/[id]` - Delete slot (admin)

#### Profiles
- `GET /api/profiles/[id]` - Get user profile
- `PATCH /api/profiles/[id]` - Update profile

### Request/Response Examples
```javascript
// Create booking
POST /api/bookings
{
  "user_id": "uuid",
  "slot_id": 1,
  "start_time": "2024-01-15T09:00:00Z",
  "end_time": "2024-01-15T17:00:00Z"
}

// Response
{
  "booking_id": 123,
  "status": "confirmed",
  "parking_slots": {
    "slot_number": "A-001",
    "slot_type": "covered"
  }
}
```

## 🔧 Troubleshooting

### Common Issues

#### UI/Styling Issues
1. **Missing styles**: Ensure `globals.css` is imported in `app/layout.tsx`
2. **Tailwind not working**: Check `tailwind.config.js` and `postcss.config.js`
3. **Dynamic classes not rendering**: Use complete class names, not string concatenation

#### Database Issues  
1. **RLS errors**: Check user authentication and policies
2. **Foreign key violations**: Ensure referenced records exist
3. **Booking conflicts**: Database constraints prevent double-booking

#### Authentication Issues
1. **Profile not created**: Check service role key in environment
2. **Session expired**: Implement refresh token logic
3. **Role restrictions**: Verify user role in user_profiles table

### Debug Commands
```bash
# Check Supabase connection
curl http://localhost:3000/api/test

# View database logs
supabase db logs --tail

# Reset database (dev only)
supabase db reset
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines
- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Update documentation for new features
- Test thoroughly before submitting PR

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Team

- **Developer**: Alfie PELICANO
- **Project**: Condo Parking Management System
- **Status**: Production Ready (MVP)
- **Support**: alfieprojects.dev@gmail.com

## 🙏 Acknowledgments

- Built with Next.js and Supabase
- UI components from shadcn/ui
- Icons from Lucide React
- Deployed on Vercel

---

**Last Updated**: 26 September 2024  
**Version**: 1.1.0  
**Build Status**: ✅ Passing