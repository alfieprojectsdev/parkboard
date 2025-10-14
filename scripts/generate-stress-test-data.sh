#!/bin/bash

# ============================================================================
# PARKBOARD - STRESS TEST DATA GENERATION SCRIPT
# ============================================================================
# This script generates mock data for stress testing ParkBoard:
# - 20 regular users
# - 1 admin user
# - 10 parking slots
#
# Uses curl to interact with the signup API
# ============================================================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BASE_URL="${BASE_URL:-http://localhost:3000}"
API_ENDPOINT="${BASE_URL}/api/auth/signup"

echo -e "${BLUE}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║        ParkBoard Stress Test Data Generation Script         ║${NC}"
echo -e "${BLUE}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Target API:${NC} $API_ENDPOINT"
echo -e "${YELLOW}Generating:${NC} 20 users + 1 admin + 10 parking slots"
echo ""

# ============================================================================
# Function: Create User via API
# ============================================================================
create_user() {
    local email=$1
    local password=$2
    local name=$3
    local phone=$4
    local unit=$5

    echo -ne "${YELLOW}Creating user:${NC} $email ... "

    response=$(curl -s -w "\n%{http_code}" -X POST "$API_ENDPOINT" \
        -H "Content-Type: application/json" \
        -d "{
            \"email\": \"$email\",
            \"password\": \"$password\",
            \"name\": \"$name\",
            \"phone\": \"$phone\",
            \"unit_number\": \"$unit\"
        }")

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -eq 200 ]; then
        echo -e "${GREEN}✓ Success${NC}"
        return 0
    elif echo "$body" | grep -q "already registered"; then
        echo -e "${YELLOW}⚠ Already exists${NC}"
        return 0
    else
        echo -e "${RED}✗ Failed (HTTP $http_code)${NC}"
        echo -e "${RED}   Response: $body${NC}"
        return 1
    fi
}

# ============================================================================
# Generate 20 Regular Users
# ============================================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 1: Creating 20 Regular Users${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

# Filipino names for realism
FIRST_NAMES=("Juan" "Maria" "Jose" "Ana" "Pedro" "Sofia" "Miguel" "Isabella" "Carlos" "Gabriela" \
             "Luis" "Carmen" "Antonio" "Rosa" "Diego" "Elena" "Fernando" "Patricia" "Rafael" "Lucia")

LAST_NAMES=("Dela Cruz" "Santos" "Reyes" "Garcia" "Cruz" "Gonzales" "Ramos" "Mendoza" "Flores" "Rivera" \
            "Bautista" "Torres" "Rodriguez" "Lopez" "Martinez" "Perez" "Fernandez" "Sanchez" "Castillo" "Aquino")

for i in {1..20}; do
    first_name="${FIRST_NAMES[$((i-1))]}"
    last_name="${LAST_NAMES[$((i-1))]}"
    full_name="$first_name $last_name"
    email="user${i}@parkboard.test"
    password="test123456"
    phone="+6391712345$(printf "%02d" $i)"
    unit="$(printf "%d" $((i)))-A"

    create_user "$email" "$password" "$full_name" "$phone" "$unit"

    # Small delay to avoid rate limiting
    sleep 0.2
done

echo ""

# ============================================================================
# Generate 1 Admin User
# ============================================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}STEP 2: Creating Admin User${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""

create_user "admin@parkboard.test" "admin123456" "Admin User" "+639171234500" "ADMIN"

echo ""

# ============================================================================
# Display Summary
# ============================================================================
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}SUMMARY${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${GREEN}✓ Users created successfully!${NC}"
echo ""
echo -e "${YELLOW}Test Credentials:${NC}"
echo "  Regular Users: user1@parkboard.test to user20@parkboard.test"
echo "  Admin User:    admin@parkboard.test"
echo "  Password (all): test123456"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Log into Supabase dashboard"
echo "  2. Manually create 10 parking slots using SQL:"
echo ""
echo -e "${BLUE}-- Copy and run this SQL in Supabase SQL Editor:${NC}"
echo ""
cat << 'EOF'
-- Get a user ID to use as slot owner (user1)
DO $$
DECLARE
  owner_user_id UUID;
BEGIN
  SELECT id INTO owner_user_id FROM auth.users WHERE email = 'user1@parkboard.test' LIMIT 1;

  -- Insert 10 parking slots
  INSERT INTO parking_slots (owner_id, slot_number, slot_type, description, price_per_hour, status) VALUES
    (owner_user_id, 'A-101', 'covered', 'Near main entrance, well-lit', 50, 'active'),
    (owner_user_id, 'A-102', 'covered', 'Covered parking, close to elevator', 55, 'active'),
    (owner_user_id, 'A-103', 'covered', 'Premium spot with EV charging', 75, 'active'),
    (owner_user_id, 'B-201', 'open', 'Open parking, spacious', 40, 'active'),
    (owner_user_id, 'B-202', 'open', 'Ground floor, easy access', 35, 'active'),
    (owner_user_id, 'B-203', 'open', 'Near exit, convenient', 38, 'active'),
    (owner_user_id, 'C-301', 'covered', 'VIP parking with security', 80, 'active'),
    (owner_user_id, 'C-302', 'covered', 'Basement level, climate controlled', 60, 'active'),
    (owner_user_id, 'D-401', 'open', 'Rooftop parking, panoramic view', 45, 'active'),
    (owner_user_id, 'D-402', 'covered', 'Motorcycle parking', 30, 'active');

  RAISE NOTICE 'Successfully created 10 parking slots for user1@parkboard.test';
END $$;
EOF
echo ""
echo -e "${YELLOW}Why SQL for slots?${NC}"
echo "  The API doesn't have a public slot creation endpoint yet."
echo "  Slots are created by authenticated users in the app."
echo "  For stress testing, we use SQL to bulk-create slots."
echo ""
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✓ Stress test data generation complete!${NC}"
echo -e "${GREEN}══════════════════════════════════════════════════════════════${NC}"
echo ""
