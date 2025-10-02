// app/onboarding/page.tsx
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthWrapper';
import { supabase } from '@/lib/supabase';

export default function OnboardingPage() {
  const { user, profile } = useAuth();
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [hasSlot, setHasSlot] = useState<boolean | null>(null);
  const [wantsToRent, setWantsToRent] = useState<boolean | null>(null);
  const [viberProfile, setViberProfile] = useState<any>(null);

  useEffect(() => {
    const checkViberMember = async () => {
      if (profile?.email) {
        const { data } = await supabase
          .from('user_profiles')
          .select('viber_member, viber_nickname, viber_join_date')
          .eq('email', profile.email)
          .single();

        if (data?.viber_member) {
          setViberProfile(data);
        }
      }
    };
    checkViberMember();
  }, [profile]);

  // Step 1: Do you own a parking slot?
  if (step === 1) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8">
        <h1 className="text-2xl font-bold mb-4">Welcome to ParkBoard!</h1>

        {/* Viber Member Recognition */}
        {viberProfile?.viber_member && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
            <h3 className="font-semibold text-green-800">
              Welcome back from LMR Parking! 👋
            </h3>
            <p className="text-sm text-green-600 mt-1">
              We recognize you as {viberProfile.viber_nickname} -
              member since {new Date(viberProfile.viber_join_date).toLocaleDateString('en-PH')}
            </p>
          </div>
        )}

        <p className="text-gray-600 mb-6">
          Let's set up your account. First question:
        </p>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            Do you own a parking slot in this building?
          </h2>

          <div className="space-y-3">
            <button
              onClick={() => {
                setHasSlot(true);
                setStep(2);
              }}
              className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-lg hover:bg-blue-50 text-left"
            >
              <div className="font-medium">✅ Yes, I own a slot</div>
              <div className="text-sm text-gray-600">I have a deeded parking space</div>
            </button>

            <button
              onClick={() => {
                setHasSlot(false);
                router.push('/dashboard');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="font-medium">👤 No, I'm a renter only</div>
              <div className="text-sm text-gray-600">I want to book others' slots</div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step 2: Want to list your slot?
  if (step === 2 && hasSlot) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8">
        <h1 className="text-2xl font-bold mb-4">Great! You own a slot.</h1>

        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">
            Would you like to rent out your parking slot?
          </h2>
          <p className="text-sm text-gray-600 mb-4">
            You can earn passive income when you're not using it.
            You control pricing and availability.
          </p>

          <div className="space-y-3">
            <button
              onClick={() => {
                setWantsToRent(true);
                router.push('/owner/setup');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-lg hover:bg-green-50 text-left"
            >
              <div className="font-medium">💰 Yes, list my slot</div>
              <div className="text-sm text-gray-600">Set it up now (2 minutes)</div>
            </button>

            <button
              onClick={() => {
                setWantsToRent(false);
                router.push('/dashboard');
              }}
              className="w-full px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:bg-gray-50 text-left"
            >
              <div className="font-medium">❌ Not right now</div>
              <div className="text-sm text-gray-600">Maybe later (you can always do this)</div>
            </button>
          </div>
        </div>

        <p className="text-xs text-gray-500 text-center">
          💡 You can change this anytime in your dashboard
        </p>
      </div>
    );
  }

  return null;
}
