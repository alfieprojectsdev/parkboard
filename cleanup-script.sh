#!/bin/bash
# ParkBoard Repository Cleanup Script
# Run this from your project root

echo "🧹 Starting ParkBoard repository cleanup..."

# Create _deprecated folder structure
echo "📁 Creating _deprecated folder structure..."
mkdir -p _deprecated/donations
mkdir -p _deprecated/register
mkdir -p _deprecated/slots
mkdir -p _deprecated/test

# Move out-of-scope features to deprecated
echo "📦 Moving out-of-scope features to _deprecated..."

# Move donations-related files
if [ -f "app/donations/page.tsx" ]; then
  mv app/donations/page.tsx _deprecated/donations/
  echo "  ✓ Moved donations page"
fi

if [ -f "app/api/donations/route.ts" ]; then
  mv app/api/donations/route.ts _deprecated/donations/api_route.ts
  echo "  ✓ Moved donations API route"
fi

if [ -f "components/forms/DonationForm.tsx" ]; then
  mv components/forms/DonationForm.tsx _deprecated/donations/
  echo "  ✓ Moved DonationForm component"
fi

# Move register-related files
if [ -f "app/register/page.tsx" ]; then
  mv app/register/page.tsx _deprecated/register/
  echo "  ✓ Moved register page"
fi

if [ -f "components/forms/RegisterForm.tsx" ]; then
  mv components/forms/RegisterForm.tsx _deprecated/register/
  echo "  ✓ Moved RegisterForm component"
fi

# Move old slots page
if [ -f "app/slots/page.tsx" ]; then
  mv app/slots/page.tsx _deprecated/slots/
  echo "  ✓ Moved old slots page"
fi

# Move test files
if [ -f "app/test/page.tsx" ]; then
  mv app/test/page.tsx _deprecated/test/
  echo "  ✓ Moved test page"
fi

if [ -f "components/TailwindTest.tsx" ]; then
  mv components/TailwindTest.tsx _deprecated/
  echo "  ✓ Moved TailwindTest component"
fi

# Move donations migration
if [ -f "db/migrations/005_create_donations.sql" ]; then
  mv db/migrations/005_create_donations.sql _deprecated/donations/
  echo "  ✓ Moved donations migration"
fi

# Clean up empty directories
echo "🗑️  Cleaning up empty directories..."
if [ -d "app/donations" ]; then
  rmdir app/donations 2>/dev/null && echo "  ✓ Removed empty donations folder"
fi

if [ -d "app/register" ]; then
  rmdir app/register 2>/dev/null && echo "  ✓ Removed empty register folder"
fi

if [ -d "app/slots" ]; then
  rmdir app/slots 2>/dev/null && echo "  ✓ Removed empty slots folder"
fi

if [ -d "app/test" ]; then
  rmdir app/test 2>/dev/null && echo "  ✓ Removed empty test folder"
fi

if [ -d "components/forms" ]; then
  rmdir components/forms 2>/dev/null && echo "  ✓ Removed empty forms folder"
fi

# Create organized component folders
echo "📁 Creating organized component structure..."
mkdir -p components/auth
mkdir -p components/booking
mkdir -p components/admin
mkdir -p components/common

# Move components to organized folders
echo "📦 Organizing components..."

# Auth components
if [ -f "components/AuthWrapper.tsx" ] && [ ! -f "components/auth/AuthWrapper.tsx" ]; then
  mv components/AuthWrapper.tsx components/auth/
  echo "  ✓ Moved AuthWrapper to auth/"
fi

if [ -f "components/DevAuthWrapper.tsx" ] && [ ! -f "components/auth/DevAuthWrapper.tsx" ]; then
  mv components/DevAuthWrapper.tsx components/auth/
  echo "  ✓ Moved DevAuthWrapper to auth/"
fi

# Booking components
if [ -f "components/BookingCard.tsx" ] && [ ! -f "components/booking/BookingCard.tsx" ]; then
  mv components/BookingCard.tsx components/booking/
  echo "  ✓ Moved BookingCard to booking/"
fi

if [ -f "components/BookingConfirmation.tsx" ] && [ ! -f "components/booking/BookingConfirmation.tsx" ]; then
  mv components/BookingConfirmation.tsx components/booking/
  echo "  ✓ Moved BookingConfirmation to booking/"
fi

if [ -f "components/BookingForm.tsx" ] && [ ! -f "components/booking/BookingForm.tsx" ]; then
  mv components/BookingForm.tsx components/booking/
  echo "  ✓ Moved BookingForm to booking/"
fi

if [ -f "components/SlotGrid.tsx" ] && [ ! -f "components/booking/SlotGrid.tsx" ]; then
  mv components/SlotGrid.tsx components/booking/
  echo "  ✓ Moved SlotGrid to booking/"
fi

if [ -f "components/TimeRangePicker.tsx" ] && [ ! -f "components/booking/TimeRangePicker.tsx" ]; then
  mv components/TimeRangePicker.tsx components/booking/
  echo "  ✓ Moved TimeRangePicker to booking/"
fi

if [ -f "components/UserBookingsList.tsx" ] && [ ! -f "components/booking/UserBookingsList.tsx" ]; then
  mv components/UserBookingsList.tsx components/booking/
  echo "  ✓ Moved UserBookingsList to booking/"
fi

# Admin components
if [ -f "components/AdminDashboard.tsx" ] && [ ! -f "components/admin/AdminDashboard.tsx" ]; then
  mv components/AdminDashboard.tsx components/admin/
  echo "  ✓ Moved AdminDashboard to admin/"
fi

# Common components
if [ -f "components/ErrorDisplay.tsx" ] && [ ! -f "components/common/ErrorDisplay.tsx" ]; then
  mv components/ErrorDisplay.tsx components/common/
  echo "  ✓ Moved ErrorDisplay to common/"
fi

if [ -f "components/Navigation.tsx" ] && [ ! -f "components/common/Navigation.tsx" ]; then
  mv components/Navigation.tsx components/common/
  echo "  ✓ Moved Navigation to common/"
fi

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "⚠️  IMPORTANT: You now need to:"
echo "1. Update all import statements to reflect new component paths"
echo "2. Replace the content of app/admin/page.tsx with the fixed version"
echo "3. Replace components/common/Navigation.tsx with the fixed version (encoding issue)"
echo "4. Test all pages to ensure imports are working"
echo ""
echo "Run this command to find and review all imports that need updating:"
echo 'grep -r "from '\''@/components/" app/ components/ --include="*.tsx" --include="*.ts"'