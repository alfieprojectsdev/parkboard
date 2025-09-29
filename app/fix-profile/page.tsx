// app/fix-profile/page.tsx - Fixed profile creation with duplicate handling
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function FixProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [existingProfile, setExistingProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    unit_number: "",
    phone: "",
    vehicle_plate: "",
  });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!session?.user) {
          router.push('/login');
          return;
        }

        setUser(session.user);

        // Check if profile already exists
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          console.log('Profile already exists:', profile);
          setExistingProfile(profile);
          setFormData({
            name: profile.name || "",
            unit_number: profile.unit_number || "",
            phone: profile.phone || "",
            vehicle_plate: profile.vehicle_plate || "",
          });
        } else if (profileError && profileError.code !== 'PGRST116') {
          // PGRST116 = no rows returned, which is expected for missing profile
          console.error('Error checking profile:', profileError);
          setError('Error checking existing profile: ' + profileError.message);
        }

      } catch (err) {
        console.error('Session error:', err);
        setError('Authentication error: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const profileData = {
        id: user.id,
        email: user.email,
        name: formData.name.trim(),
        unit_number: formData.unit_number.trim(),
        phone: formData.phone.trim() || null,
        vehicle_plate: formData.vehicle_plate.trim() || null,
        role: 'resident',
        updated_at: new Date().toISOString()
      };

      if (existingProfile) {
        // Update existing profile
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update(profileData)
          .eq('id', user.id);

        if (updateError) throw updateError;
        setSuccess("Profile updated successfully!");
      } else {
        // Create new profile using upsert to handle duplicates
        const { error: upsertError } = await supabase
          .from('user_profiles')
          .upsert(profileData, { 
            onConflict: 'id',
            ignoreDuplicates: false 
          });

        if (upsertError) throw upsertError;
        setSuccess("Profile created successfully!");
      }

      // Redirect after success
      setTimeout(() => {
        router.push('/dashboard');
      }, 1500);

    } catch (err) {
      console.error('Profile operation error:', err);
      if (err.message.includes('duplicate key')) {
        setError('Profile already exists. Redirecting to dashboard...');
        setTimeout(() => router.push('/dashboard'), 2000);
      } else {
        setError('Failed to save profile: ' + err.message);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">
            {existingProfile ? "Update Profile" : "Complete Your Profile"}
          </CardTitle>
          {user && (
            <p className="text-center text-sm text-gray-600">
              {user.email}
            </p>
          )}
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <Input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                placeholder="Enter your full name"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number *
              </label>
              <Input
                type="text"
                value={formData.unit_number}
                onChange={(e) => setFormData({...formData, unit_number: e.target.value})}
                placeholder="e.g., 101A, B-205"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number
              </label>
              <Input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                placeholder="e.g., 09171234567"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Vehicle Plate
              </label>
              <Input
                type="text"
                value={formData.vehicle_plate}
                onChange={(e) => setFormData({...formData, vehicle_plate: e.target.value})}
                placeholder="e.g., ABC-123"
              />
            </div>
            
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
            
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={submitting || !formData.name.trim() || !formData.unit_number.trim()}
            >
              {submitting 
                ? (existingProfile ? "Updating..." : "Creating...") 
                : (existingProfile ? "Update Profile" : "Create Profile")
              }
            </Button>
          </form>
          
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={() => router.push('/dashboard')}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              Skip and go to Dashboard
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}