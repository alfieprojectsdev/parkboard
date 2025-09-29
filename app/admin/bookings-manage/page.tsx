// app/admin/bookings-manage/page.tsx
"use client";

import AuthWrapper from '@/components/auth/AuthWrapper';
import Navigation from '@/components/common/Navigation';
import AdminDashboard from '@/components/admin/AdminDashboard';

export default function AdminBookingsManagePage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <main className="container mx-auto py-6 px-4">
          <AdminDashboard />
        </main>
      </div>
    </AuthWrapper>
  );
}