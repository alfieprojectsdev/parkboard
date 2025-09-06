-- Migration: Create parking_slots table
CREATE TABLE IF NOT EXISTS parking_slots (
    slot_id SERIAL PRIMARY KEY,
    slot_number TEXT UNIQUE NOT NULL,
    slot_type TEXT CHECK (slot_type IN ('covered', 'uncovered', 'visitor')) DEFAULT 'uncovered',
    status TEXT CHECK (status IN ('available', 'maintenance', 'reserved')) DEFAULT 'available',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);