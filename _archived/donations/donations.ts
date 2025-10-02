// lib/donations.ts - Donations API helper functions
import { supabase } from './supabase';

export interface Donation {
  donation_id: number;
  user_id: string;
  amount: number;
  currency: string;
  message?: string;
  donation_type: 'general' | 'maintenance' | 'community' | 'emergency';
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at: string;
  updated_at: string;
  user_profiles?: {
    name: string;
    unit_number: string;
  };
}

export interface CreateDonationData {
  amount: number;
  currency?: string;
  message?: string;
  donation_type?: 'general' | 'maintenance' | 'community' | 'emergency';
}

/**
 * Fetch all donations for the current user
 */
export async function getUserDonations() {
  const { data, error } = await supabase
    .from('donations')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching donations:', error);
    throw error;
  }

  return data as Donation[];
}

/**
 * Fetch all donations (admin only)
 */
export async function getAllDonations() {
  const { data, error } = await supabase
    .from('donations')
    .select('*, user_profiles(name, unit_number)')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching all donations:', error);
    throw error;
  }

  return data as Donation[];
}

/**
 * Create a new donation
 */
export async function createDonation(donationData: CreateDonationData, userId: string) {
  const { data, error } = await supabase
    .from('donations')
    .insert([
      {
        user_id: userId,
        amount: donationData.amount,
        currency: donationData.currency || 'PHP',
        message: donationData.message,
        donation_type: donationData.donation_type || 'general',
        status: 'completed', // Auto-complete for now (no payment gateway)
      }
    ])
    .select()
    .single();

  if (error) {
    console.error('Error creating donation:', error);
    throw error;
  }

  return data as Donation;
}

/**
 * Get donation statistics
 */
export async function getDonationStats() {
  const { data, error } = await supabase
    .from('donations')
    .select('amount, donation_type, status')
    .eq('status', 'completed');

  if (error) {
    console.error('Error fetching donation stats:', error);
    throw error;
  }

  const total = data.reduce((sum, d) => sum + Number(d.amount), 0);
  const count = data.length;
  const byType = data.reduce((acc, d) => {
    acc[d.donation_type] = (acc[d.donation_type] || 0) + Number(d.amount);
    return acc;
  }, {} as Record<string, number>);

  return { total, count, byType };
}