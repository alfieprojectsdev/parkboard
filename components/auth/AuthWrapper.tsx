// components/AuthWrapper.tsx - Enhanced with session expiry handling
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
  const [sessionError, setSessionError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    let sessionCheckInterval;

    const init = async () => {
      try {
        const {
          data: { session },
          error
        } = await supabase.auth.getSession();

        if (error) {
          console.error("Session error:", error);
          setSessionError(error.message);
        }

        setUser(session?.user || null);
        setLoading(false);

        // Set up periodic session checks every 5 minutes
        if (session) {
          sessionCheckInterval = setInterval(async () => {
            const { data: { session: currentSession }, error: refreshError } = 
              await supabase.auth.getSession();
            
            if (!currentSession || refreshError) {
              console.log("Session expired or error, redirecting to login");
              await supabase.auth.signOut();
              router.replace("/login");
            }
          }, 5 * 60 * 1000); // 5 minutes
        }
      } catch (err) {
        console.error("Auth init error:", err);
        setSessionError("Authentication initialization failed");
        setLoading(false);
      }
    };
    
    init();

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth state changed:", event);
      
      if (event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        if (!session) {
          setUser(null);
          setProfile(null);
          router.replace("/login");
        }
      } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session?.user || null);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (sessionCheckInterval) {
        clearInterval(sessionCheckInterval);
      }
    };
  }, [router]);

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        setProfileLoading(true);
        try {
          const { data, error } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", user.id)  // Make sure this matches exactly
            .single();

          if (error) {
            console.error("Profile fetch error:", error);
            // If profile doesn't exist, redirect to profile setup
            if (error.code === 'PGRST116') {
              console.log("Profile not found, consider redirecting to profile setup");
              // You could redirect to a profile setup page here
              // router.push('/profile/setup');
            }
            setProfile(null);
          } else {
            setProfile(data);
          }
        } catch (err) {
          console.error("Profile fetch exception:", err);
          setProfile(null);
        } finally {
          setProfileLoading(false);
        }
      } else {
        setProfile(null);
        if (!loading) {
          router.replace("/login");
        }
      }
    };
    
    fetchProfile();
  }, [user, router, loading]);

  // Add a function to manually refresh session
  const refreshSession = async () => {
    try {
      const { data: { session }, error } = await supabase.auth.refreshSession();
      if (error) throw error;
      return session;
    } catch (error) {
      console.error("Failed to refresh session:", error);
      await supabase.auth.signOut();
      router.replace("/login");
      return null;
    }
  };

  const value = { 
    user, 
    profile, 
    loading: loading || profileLoading,
    sessionError,
    refreshSession
  };

  // Show error state if there's a session error
  if (sessionError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md">
          <h2 className="text-red-800 font-semibold mb-2">Session Error</h2>
          <p className="text-red-600 mb-4">{sessionError}</p>
          <button
            onClick={() => {
              setSessionError(null);
              window.location.href = '/login';
            }}
            className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700"
          >
            Return to Login
          </button>
        </div>
      </div>
    );
  }

  // Don't redirect if we're still loading the initial auth state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // If no user after loading is complete, don't render children
  if (!user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <p className="text-gray-500 mb-4">Redirecting to login...</p>
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={value}>
      {profileLoading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading profile...</p>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
}