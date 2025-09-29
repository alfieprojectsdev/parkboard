#!/bin/bash
# Update imports after component reorganization
# Run this from your project root after running the cleanup script

echo "🔄 Updating import statements..."

# Function to update imports in a file
update_imports() {
  local file=$1
  
  # Skip if file doesn't exist
  [ ! -f "$file" ] && return
  
  # Auth components
  sed -i.bak "s|from '@/components/AuthWrapper'|from '@/components/auth/AuthWrapper'|g" "$file"
  sed -i.bak "s|from '../AuthWrapper'|from '../auth/AuthWrapper'|g" "$file"
  sed -i.bak "s|from './AuthWrapper'|from './auth/AuthWrapper'|g" "$file"
  sed -i.bak "s|from '@/components/DevAuthWrapper'|from '@/components/auth/DevAuthWrapper'|g" "$file"
  
  # Booking components
  sed -i.bak "s|from '@/components/BookingCard'|from '@/components/booking/BookingCard'|g" "$file"
  sed -i.bak "s|from '@/components/BookingConfirmation'|from '@/components/booking/BookingConfirmation'|g" "$file"
  sed -i.bak "s|from '@/components/BookingForm'|from '@/components/booking/BookingForm'|g" "$file"
  sed -i.bak "s|from '@/components/SlotGrid'|from '@/components/booking/SlotGrid'|g" "$file"
  sed -i.bak "s|from '@/components/TimeRangePicker'|from '@/components/booking/TimeRangePicker'|g" "$file"
  sed -i.bak "s|from '@/components/UserBookingsList'|from '@/components/booking/UserBookingsList'|g" "$file"
  sed -i.bak "s|from './BookingCard'|from './BookingCard'|g" "$file"
  sed -i.bak "s|from './BookingConfirmation'|from './BookingConfirmation'|g" "$file"
  sed -i.bak "s|from './BookingForm'|from './BookingForm'|g" "$file"
  sed -i.bak "s|from './SlotGrid'|from './SlotGrid'|g" "$file"
  sed -i.bak "s|from './TimeRangePicker'|from './TimeRangePicker'|g" "$file"
  sed -i.bak "s|from './UserBookingsList'|from './UserBookingsList'|g" "$file"
  
  # Admin components
  sed -i.bak "s|from '@/components/AdminDashboard'|from '@/components/admin/AdminDashboard'|g" "$file"
  sed -i.bak "s|from '../../components/AdminDashboard'|from '@/components/admin/AdminDashboard'|g" "$file"
  
  # Common components
  sed -i.bak "s|from '@/components/ErrorDisplay'|from '@/components/common/ErrorDisplay'|g" "$file"
  sed -i.bak "s|from '@/components/Navigation'|from '@/components/common/Navigation'|g" "$file"
  sed -i.bak "s|from '../../components/Navigation'|from '@/components/common/Navigation'|g" "$file"
  sed -i.bak "s|from '../../../components/Navigation'|from '@/components/common/Navigation'|g" "$file"
  sed -i.bak "s|from './ErrorDisplay'|from '../common/ErrorDisplay'|g" "$file"
  sed -i.bak "s|from './Navigation'|from './Navigation'|g" "$file"
  
  # Fix relative imports within component folders
  if [[ "$file" == *"components/booking/"* ]]; then
    sed -i.bak "s|from './AuthWrapper'|from '../auth/AuthWrapper'|g" "$file"
    sed -i.bak "s|from './ErrorDisplay'|from '../common/ErrorDisplay'|g" "$file"
  fi
  
  if [[ "$file" == *"components/auth/"* ]]; then
    sed -i.bak "s|from './Navigation'|from '../common/Navigation'|g" "$file"
  fi
  
  # Remove backup files
  rm -f "${file}.bak"
}

# Update imports in all TypeScript/JavaScript files
echo "📝 Processing app directory..."
find app -name "*.tsx" -o -name "*.ts" | while read file; do
  update_imports "$file"
  echo "  ✓ Updated $file"
done

echo "📝 Processing components directory..."
find components -name "*.tsx" -o -name "*.ts" | while read file; do
  update_imports "$file"
  echo "  ✓ Updated $file"
done

echo ""
echo "✅ Import updates complete!"
echo ""
echo "⚠️  Manual fixes still needed:"
echo "1. Review and fix any complex relative imports"
echo "2. Update imports in booking components that reference each other"
echo "3. Test the application to ensure all imports resolve correctly"