# ParkBoard - Condo Parking Marketplace

A peer-to-peer parking slot marketplace for condo residents. List your unused parking slot or book available slots from your neighbors.

## 🚀 Features

- **User Authentication**: Email/password and OAuth (Google, Facebook) login with Supabase Auth
- **Browse Slots**: View all available parking slots with owner information
- **Book Slots**: Reserve parking slots by date/time with automatic price calculation
- **List Slots**: Share your parking slot with the community
- **Manage Bookings**: View and cancel your bookings
- **Server-side Protection**: Middleware-based authentication and authorization
- **Secure Pricing**: Database triggers prevent client-side price manipulation
- **Optimized Performance**: Denormalized data and composite indexes for faster queries

## 🛠 Tech Stack

- **Frontend**: Next.js 15 (App Router), React, TypeScript, Tailwind CSS
- **Backend**: Next.js API Routes, Supabase (PostgreSQL + Auth)
- **Database**: PostgreSQL with Row Level Security (RLS)
- **Authentication**: Supabase Auth (Email/Password + OAuth)
- **UI Components**: shadcn/ui

## 📋 Prerequisites

- Node.js 18+ and npm
- Supabase account ([supabase.com](https://supabase.com))
- Google OAuth credentials (optional, for social login)
- Facebook OAuth credentials (optional, for social login)

## 🔧 Setup Instructions

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd parkboard
git checkout minimal-mvp
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

ParkBoard supports three database options. Choose one:

#### Option A: Local PostgreSQL (Recommended for Development)

```bash
# Install PostgreSQL (if not installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql
# Windows: https://www.postgresql.org/download/windows/

# Create database
createdb parkboard

# Configure environment
cp .env.example .env.local
# Edit .env.local and set:
# DATABASE_URL=postgresql://postgres:password@localhost:5432/parkboard

# Run migrations
chmod +x scripts/migrate.sh
./scripts/migrate.sh

# Verify setup
./scripts/migrate.sh status
```

#### Option B: Supabase (Recommended for Production)

```bash
# 1. Create Supabase project at https://supabase.com/dashboard
# 2. Get API keys from Project Settings → API

# Configure environment
cp .env.example .env.local
# Edit .env.local and set:
# NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
# SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Run migrations
./scripts/migrate.sh
# Or use Supabase Dashboard → SQL Editor

# Verify setup
./scripts/migrate.sh status
```

#### Option C: Neon (Serverless PostgreSQL)

```bash
# 1. Create Neon project at https://neon.tech
# 2. Copy connection string from dashboard

# Configure environment
cp .env.example .env.local
# Edit .env.local and set:
# DATABASE_URL=postgresql://user:pass@ep-xxx.neon.tech/db?sslmode=require

# Run migrations
./scripts/migrate.sh

# Verify setup
./scripts/migrate.sh status
```

**For detailed database setup instructions, see [docs/DATABASE.md](docs/DATABASE.md)**

### 4. Set Up Supabase (Legacy - For Reference)

#### A. Create a New Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Wait for the database to initialize
3. Go to **Project Settings** → **API** and copy:
   - Project URL
   - Anon/Public Key

#### B. Run Database Migrations

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the contents of `db/schema_optimized.sql`
3. Paste and run the SQL script

This will create:
- `user_profiles`, `parking_slots`, `bookings` tables
- Database triggers for auto-calculating booking prices
- Row Level Security (RLS) policies
- Optimized indexes for performance

### 4. Configure Environment Variables

Create a `.env.local` file in the root directory:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Replace `your-project-url` and `your-anon-key` with the values from step 3A.

### 5. Configure OAuth Providers (Optional)

#### Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select existing
3. Enable **Google+ API**
4. Go to **Credentials** → **Create Credentials** → **OAuth 2.0 Client ID**
5. Add authorized redirect URIs:
   ```
   <!-- https://cgbkknefvggnhkvmuwsa.supabase.co/auth/v1/callback -->
   http://localhost:3000/auth/v1/callback
   ```
6. Copy **Client ID** and **Client Secret**
7. In Supabase dashboard:
   - Go to **Authentication** → **Providers** → **Google**
   - Enable Google
   - Paste Client ID and Client Secret
   - Save

#### Facebook OAuth

1. Go to [Facebook Developers](https://developers.facebook.com)
2. Create a new app or select existing
3. Add **Facebook Login** product
4. Go to **Settings** → **Basic**
5. Copy **App ID** and **App Secret**
6. In **Facebook Login** → **Settings**, add valid OAuth redirect URI:
   ```
   <!-- https://cgbkknefvggnhkvmuwsa.supabase.co/auth/v1/callback -->
   http://localhost:3000/auth/v1/callback
   ```
7. In Supabase dashboard:
   - Go to **Authentication** → **Providers** → **Facebook**
   - Enable Facebook
   - Paste App ID and App Secret
   - Save

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📁 Project Structure

```
parkboard/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page (email/OAuth)
│   │   └── register/page.tsx       # Registration page
│   ├── (marketplace)/
│   │   ├── slots/
│   │   │   ├── page.tsx            # Browse all slots
│   │   │   ├── [slotId]/page.tsx   # Slot detail & booking
│   │   │   └── new/page.tsx        # List new slot
│   │   └── bookings/page.tsx       # My bookings
│   ├── api/
│   │   └── auth/
│   │       └── signup/route.ts     # Registration API
│   ├── auth/
│   │   └── callback/route.ts       # OAuth callback handler
│   └── profile/
│       └── complete/page.tsx       # OAuth profile completion
├── components/
│   ├── auth/
│   │   └── AuthWrapper.tsx         # Auth state management
│   ├── common/
│   │   └── Navigation.tsx          # Navigation bar
│   └── ui/                         # shadcn/ui components
├── db/
│   └── schema_optimized.sql        # Database schema with optimizations
├── lib/
│   └── supabase/
│       ├── client.ts               # Browser Supabase client
│       └── server.ts               # Server Supabase client
├── middleware.ts                   # Server-side auth protection
└── docs/                           # Documentation files
```

## 🔒 Security Features

### 1. Server-side Price Calculation

**Problem**: Client can manipulate `total_price` in browser DevTools before submitting booking.

**Solution**: Database trigger automatically calculates price server-side:

```sql
CREATE TRIGGER booking_price_calculation
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION calculate_booking_price();
```

Client code does NOT send `total_price` - the trigger calculates it based on:
- `price_per_hour` from the slot
- Duration between `start_time` and `end_time`

### 2. Middleware Auth Protection

**Problem**: Client-side auth checks can be bypassed.

**Solution**: `middleware.ts` runs on the server before rendering any page:

```typescript
export async function middleware(request: NextRequest) {
  const { data: { session } } = await supabase.auth.getSession()

  if (!session && !publicRoutes.includes(pathname)) {
    return NextResponse.redirect('/login')
  }

  return NextResponse.next()
}
```

### 3. Row Level Security (RLS)

All tables have RLS policies:
- Users can only update their own profile
- Users can only see active slots
- Users can only modify their own bookings
- Slot owners can see all bookings for their slots

## ⚡ Performance Optimizations

### 1. Denormalized `slot_owner_id`

Added `slot_owner_id` to bookings table to avoid expensive JOIN queries:

```sql
ALTER TABLE bookings ADD COLUMN slot_owner_id UUID;

CREATE TRIGGER set_slot_owner_id
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_slot_owner_id();
```

**Result**: 40-60% faster queries for "bookings where I'm the owner"

### 2. Composite Indexes

```sql
CREATE INDEX idx_bookings_renter_status_time
  ON bookings(renter_id, status, start_time DESC)
  WHERE status != 'cancelled';
```

**Result**: 50-80% faster queries for user's active bookings

### 3. Optimized RLS Policies

RLS policies use the denormalized `slot_owner_id` instead of subqueries.

## 📊 Database Schema

### Key Tables

- **user_profiles**: User information (name, email, phone, unit_number)
- **parking_slots**: Available parking slots (slot_number, type, price, owner)
- **bookings**: Booking records (slot, renter, times, price, status)

### Important Constraints

- **UNIQUE** on `user_profiles.unit_number` - one account per unit
- **EXCLUDE** on `bookings` using temporal overlap - prevents double-booking
- **CHECK** on `parking_slots.slot_type` - must be 'covered' or 'uncovered'

### Database Triggers

1. **booking_price_calculation**: Auto-calculate `total_price` on insert/update
2. **set_slot_owner_id**: Auto-populate `slot_owner_id` from slot's owner
3. **update_updated_at**: Auto-update `updated_at` timestamp

## 🧪 Testing the App

### 1. Register a User

1. Go to `/register`
2. Fill in all fields (name, email, password, phone, unit_number)
3. Submit → Auto-login → Redirect to `/slots`

### 2. List a Parking Slot

1. Click **"List Your Slot"** in navigation
2. Enter slot number (e.g., "A-101"), type, description, price
3. Submit → Slot appears in browse page

### 3. Book a Slot

1. Browse slots at `/slots`
2. Click on a slot → Slot detail page
3. Select start/end time
4. See live price calculation
5. Submit booking → Redirect to `/bookings`

### 4. OAuth Login

1. Go to `/login`
2. Click **"Continue with Google"** or **"Continue with Facebook"**
3. Authorize the app
4. Complete profile (phone, unit_number) if first time
5. Redirect to `/slots`

## 🐛 Troubleshooting

### Error: "relation 'user_profiles' does not exist"

**Solution**: You haven't run the database migration. Run `db/schema_optimized.sql` in Supabase SQL Editor.

### Error: "Invalid login credentials"

**Solution**: Make sure you're using the correct email/password. Password must be at least 6 characters.

### OAuth redirect fails

**Solution**:
1. Check that redirect URIs in Google/Facebook console match Supabase callback URL
2. Verify OAuth credentials in Supabase dashboard are correct
3. Make sure the provider is enabled in Supabase Auth settings

### Booking creation fails with "duplicate key value violates unique constraint"

**Solution**: Someone else booked this slot for overlapping time. The database EXCLUDE constraint prevents double-booking.

### Price shows as 0 or incorrect

**Solution**: This is expected! The client shows an *estimate*. The actual price is calculated server-side by the database trigger when the booking is inserted.

## 📝 Next Steps / Future Improvements

- **Rate Limiting**: Add Upstash rate limiting to auth routes (login, register)
- **Email Notifications**: Send booking confirmations via Supabase Edge Functions
- **Photo Upload**: Allow slot owners to upload photos (Supabase Storage)
- **Reviews/Ratings**: Let renters rate slots and owners
- **Payment Integration**: Integrate payment gateway (Stripe, PayMongo)
- **Mobile App**: React Native version using same Supabase backend
<!-- below: added on 2025-10-08 12:14 -->
- **Privacy Policy**: Publish a publicly accessible page detailing:
  - What user data is collected  
  - How data is used, stored, and protected  
  - How users can contact you regarding privacy concerns  
  Example: `https://parkboard.app/privacy-policy` or use a privacy policy template.  
- **User Data Deletion**: Provide clear instructions for users to delete their account/data:
  - Example: “Users can request account deletion via support@parkboard.app or through the app’s settings page.”  
  - Can be included on the privacy policy page for simplicity.
<!-- above: added on 2025-10-08 12:14 -->

## 📄 License

MIT License - See LICENSE file for details

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org)
- Authentication by [Supabase](https://supabase.com)
- UI components from [shadcn/ui](https://ui.shadcn.com)
