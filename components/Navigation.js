// =============================================================================
// Navigation.js - Header with user info and role switching
// =============================================================================

import { useState } from 'react';
import { useAuth } from './AuthWrapper';

export default function Navigation({ currentView, onViewChange }) {
  const { userProfile, signOut, isAdmin } = useAuth();
  const [showDropdown, setShowDropdown] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    setShowDropdown(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo/Title */}
          <div className="flex items-center">
            <h1 className="text-xl font-bold text-gray-900">ParkBoard</h1>
          </div>

          {/* Navigation Links */}
          <div className="flex items-center space-x-4">
            {isAdmin && (
              <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
                <button
                  onClick={() => onViewChange('resident')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'resident'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Resident View
                </button>
                <button
                  onClick={() => onViewChange('admin')}
                  className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                    currentView === 'admin'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Admin View
                </button>
              </div>
            )}

            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                <span>{userProfile?.name}</span>
                <span className="text-gray-500">({userProfile?.unit_number})</span>
              </button>

              {showDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-10">
                  <div className="py-1">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{userProfile?.name}</div>
                      <div className="text-gray-500">{userProfile?.email}</div>
                    </div>
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Sign out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

