// =============================================================================
// Navigation.js - Header with user info and role switching
// =============================================================================

import Link from 'next/link';
import { useAuth } from './AuthWrapper';
import { useState } from 'react';

export default function Navigation() {
  const { profile } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <nav className="flex flex-col md:flex-row items-center justify-between p-4 bg-gray-100">
      <div className="flex justify-between w-full md:w-auto">
        <div className="font-bold text-lg">ParkBoard</div>
        <button
          className="md:hidden text-gray-600"
          onClick={() => setMenuOpen(!menuOpen)}
        >
          ☰
        </button>
      </div>
      <div className={`flex-col md:flex-row md:flex space-y-2 md:space-y-0 md:space-x-4 ${menuOpen ? 'flex' : 'hidden md:flex'}`}>
        <Link href="/dashboard" className="text-blue-600">Dashboard</Link>
        {profile?.role === 'admin' && (
          <Link href="/admin" className="text-purple-600">Admin</Link>
        )}
        <button
          onClick={() => supabase.auth.signOut()}
          className="text-red-600"
        >
          Logout
        </button>
      </div>
    </nav>
  );
}

