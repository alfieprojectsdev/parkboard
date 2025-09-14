// app/dashboard/page.js – Entry point for resident dashboard

import AuthWrapper from "@/components/AuthWrapper";
// import DevAuthWrapper from "@/components/DevAuthWrapper";
import Navigation from "@/components/Navigation";
import UserDashboard from "@/components/UserDashboard";

export const metadata = {
  title: "Dashboard | ParkBoard",
  description: "View and manage your parking bookings",
};

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Navigation />
        <main className="flex-1">
          <UserDashboard />
        </main>
      </div>
    </AuthWrapper>
  );
}
