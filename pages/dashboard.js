import AuthWrapper from '@/components/AuthWrapper';
import Navigation from '@/components/Navigation';
import UserDashboard from '@/components/UserDashboard';

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <Navigation />
      <UserDashboard />
    </AuthWrapper>
  );
}