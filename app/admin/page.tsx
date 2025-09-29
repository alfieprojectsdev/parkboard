// app/admin/page.tsx - Fixed with AuthWrapper
"use client";

import AuthWrapper from '@/components/auth/AuthWrapper';
import AdminDashboardContent from '@/app/admin/AdminDashboardContent'; // ✅ Fixed path

export default function AdminPage() {
  return (
    <AuthWrapper>
      <AdminDashboardContent />
    </AuthWrapper>
  );
}