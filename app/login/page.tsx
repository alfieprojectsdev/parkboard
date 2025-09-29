// app/login/page.tsx - Fixed version with proper error handling
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'signup' | 'reset'>('login');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [vehiclePlate, setVehiclePlate] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const clearMessages = () => {
    setErrorMsg("");
    setSuccessMsg("");
  };

  const resetForm = () => {
    setPassword("");
    setConfirmPassword("");
    setName("");
    setUnitNumber("");
    setPhone("");
    setVehiclePlate("");
    clearMessages();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      
      router.replace("/dashboard");
    } catch (error: any) {
      setErrorMsg(error.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    // Validation
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      setLoading(false);
      return;
    }

    if (!name.trim() || !unitNumber.trim()) {
      setErrorMsg("Name and unit number are required");
      setLoading(false);
      return;
    }

    try {
      // Create auth user
      const { data: authData, error: signupError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signupError) throw signupError;
      if (!authData.user) throw new Error("No user data returned from signup");

      // Create profile using API route
      const profileResponse = await fetch('/api/profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: authData.user.id,
          email: authData.user.email,
          name: name.trim(),
          unit_number: unitNumber.trim(),
          phone: phone.trim() || null,
          vehicle_plate: vehiclePlate.trim() || null,
          role: 'resident'
        })
      });

      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        throw new Error(errorData.error || "Failed to create profile");
      }

      setSuccessMsg("Account created successfully! You can now sign in.");
      setMode('login');
      resetForm();

    } catch (error: any) {
      console.error('Signup error:', error);
      setErrorMsg(error.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSuccessMsg("Password reset link sent to your email. Check your inbox!");
    } catch (error: any) {
      setErrorMsg(error.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode: 'login' | 'signup' | 'reset') => {
    setMode(newMode);
    resetForm();
  };

  const getTitle = () => {
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Reset Password';
      default: return 'Login';
    }
  };

  const getSubmitText = () => {
    if (loading) {
      switch (mode) {
        case 'signup': return 'Creating account...';
        case 'reset': return 'Sending reset link...';
        default: return 'Signing in...';
      }
    }
    switch (mode) {
      case 'signup': return 'Sign Up';
      case 'reset': return 'Send Reset Link';
      default: return 'Sign In';
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-lg rounded-2xl">
        <CardHeader>
          <CardTitle className="text-center text-xl">{getTitle()}</CardTitle>
        </CardHeader>
        <CardContent>
          <form 
            onSubmit={mode === 'login' ? handleLogin : mode === 'signup' ? handleSignup : handlePasswordReset} 
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            
            {mode !== 'reset' && (
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
              />
            )}
            
            {mode === 'signup' && (
              <>
                <Input
                  type="password"
                  placeholder="Confirm Password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <Input
                  type="text"
                  placeholder="Full Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <Input
                  type="text"
                  placeholder="Unit Number"
                  value={unitNumber}
                  onChange={(e) => setUnitNumber(e.target.value)}
                  required
                />
                <Input
                  type="tel"
                  placeholder="Phone Number (optional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <Input
                  type="text"
                  placeholder="Vehicle Plate (optional)"
                  value={vehiclePlate}
                  onChange={(e) => setVehiclePlate(e.target.value)}
                />
              </>
            )}
            
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{errorMsg}</p>
              </div>
            )}
            
            {successMsg && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <p className="text-sm text-green-600">{successMsg}</p>
              </div>
            )}
            
            <Button type="submit" className="w-full" disabled={loading}>
              {getSubmitText()}
            </Button>
          </form>
          
          <div className="mt-4 space-y-2 text-center text-sm">
            {mode === 'login' && (
              <>
                <button
                  type="button"
                  onClick={() => switchMode('signup')}
                  className="text-blue-600 hover:text-blue-800 underline block w-full"
                >
                  Don't have an account? Sign up
                </button>
                <button
                  type="button"
                  onClick={() => switchMode('reset')}
                  className="text-gray-600 hover:text-gray-800 underline block w-full"
                >
                  Forgot your password?
                </button>
              </>
            )}
            
            {mode === 'signup' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Already have an account? Sign in
              </button>
            )}
            
            {mode === 'reset' && (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="text-blue-600 hover:text-blue-800 underline block w-full"
              >
                Back to login
              </button>
            )}
          </div>

          {/* Emergency profile fix link */}
          <div className="mt-4 pt-4 border-t border-gray-200 text-center">
            <a
              href="/fix-profile"
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Having profile issues? Fix Profile
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}