// =====================================================
// File: lib/constants.ts
// Centralized booking rules and constants
// =====================================================
export const BOOKING_RULES = {
  MIN_DURATION_HOURS: 1,
  MAX_DURATION_HOURS: 24,
  MAX_ADVANCE_DAYS: 30,
  CANCELLATION_GRACE_HOURS: 1,
} as const;

export const SLOT_TYPES = {
  COVERED: 'covered',
  UNCOVERED: 'uncovered', 
  VISITOR: 'visitor',
} as const;

export const BOOKING_STATUSES = {
  CONFIRMED: 'confirmed',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
  NO_SHOW: 'no_show',
} as const;

export const USER_ROLES = {
  RESIDENT: 'resident',
  ADMIN: 'admin',
} as const;