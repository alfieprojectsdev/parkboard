-- =============================================================================
-- Production Seed Data
-- Minimal data for production deployment
-- =============================================================================

-- Add initial parking slots (customize for your building)
INSERT INTO parking_slots (slot_number, slot_type, status, description)
VALUES
('P-001', 'covered', 'available', 'Premium covered slot'),
('P-002', 'covered', 'available', 'Premium covered slot'),
('P-003', 'covered', 'available', 'Premium covered slot'),
('U-001', 'uncovered', 'available', 'Standard uncovered slot'),
('U-002', 'uncovered', 'available', 'Standard uncovered slot'),
('U-003', 'uncovered', 'available', 'Standard uncovered slot'),
('U-004', 'uncovered', 'available', 'Standard uncovered slot'),
('U-005', 'uncovered', 'available', 'Standard uncovered slot'),
('V-001', 'visitor', 'available', 'Visitor parking'),
('V-002', 'visitor', 'available', 'Visitor parking');

-- Note: User profiles will be created automatically via auth signup process
-- Note: No test bookings or payments in production
