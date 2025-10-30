-- Create Test Banner Data
-- Run with: psql "postgresql://ltpt420:mannersmakethman@localhost:5432/parkboard_db" -f scripts/create-test-banner.sql

-- Insert sample banner for testing
INSERT INTO ad_banners (
  business_name,
  business_owner_unit,
  business_contact,
  banner_image_url,
  banner_alt_text,
  target_url,
  placement,
  display_priority,
  is_beta_free,
  notes
) VALUES (
  'Tita Elena''s Homemade Pastries',
  '10A',
  '09171234567',
  'https://placehold.co/800x200/e6e6fa/4a4a4a?text=Tita+Elena''s+Homemade+Pastries+%7C+Fresh+Daily+%7C+Call+0917-123-4567',
  'Fresh homemade pastries delivered to your door - Made with love by Tita Elena from Unit 10A',
  'https://facebook.com/TitaElenasPastries',
  'header',
  10,
  true,
  'Beta program - FREE ad for LMR resident business owner (3 months)'
);

-- Insert another banner for inline placement
INSERT INTO ad_banners (
  business_name,
  business_owner_unit,
  business_contact,
  banner_image_url,
  banner_alt_text,
  target_url,
  placement,
  display_priority,
  is_beta_free,
  notes
) VALUES (
  'Kuya Ben''s Computer Repair',
  '5B',
  '09181234567',
  'https://placehold.co/600x150/e8f4f8/2c5f77?text=Kuya+Ben''s+Computer+Repair+%7C+Unit+5B+%7C+Call+0918-123-4567',
  'Computer repair and tech support - LMR resident since 2015',
  null,
  'inline',
  5,
  true,
  'Beta program - FREE ad for LMR resident business'
);

-- Verify insertion
SELECT
  business_name,
  business_owner_unit,
  placement,
  display_priority,
  active,
  is_beta_free
FROM ad_banners
ORDER BY placement, display_priority DESC;
