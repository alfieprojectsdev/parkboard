import AuthWrapper from '@/components/AuthWrapper';
import Navigation from '@/components/Navigation';
import AdminDashboard from '@/components/AdminDashboard';

export default function AdminPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <AdminDashboard />
    </AuthWrapper>
  );
}