// components/AuthWrapper.tsx - Authentication gate and session management
"use client";

import { useEffect, useState, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export default function AuthWrapper({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const init = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setUser(session?.user || null);
      setLoading(false);
    };
    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        const { data, error } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Profile fetch error:", error);
          // If profile doesn't exist, you might want to redirect to a profile setup page
          // For now, we'll just set profile to null and let the user continue
          setProfile(null);
        } else {
          setProfile(data);
        }
        setProfileLoading(false);
      } else {
        setProfile(null);
        // Only redirect to login if we're not loading and there's no user
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    fetchProfile();
  }, [user, router, loading]);

  const value = { user, profile, loading: loading || profileLoading };

  // Don't redirect if we're still loading the initial auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  // If no user after loading is complete, don't render children
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {profileLoading ? (
        <div className="flex items-center justify-center h-screen">
          <p className="text-gray-500">Loading profile...</p>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}