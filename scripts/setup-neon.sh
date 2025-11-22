#!/usr/bin/env bash

# ==============================================================================
# PARKBOARD NEON DATABASE SETUP
# ==============================================================================
# One-command script to set up Neon database for ParkBoard deployment.
#
# Features:
# - Prerequisite validation (psql, connection string)
# - Optional test data seeding
# - Dry-run mode for previewing actions
# - Colored output for readability
# - Idempotent (safe to run multiple times)
#
# Usage:
#   ./scripts/setup-neon.sh                    # Schema only
#   ./scripts/setup-neon.sh --with-seed        # Schema + test data
#   ./scripts/setup-neon.sh --dry-run          # Show what would run
#   ./scripts/setup-neon.sh --help             # Show usage information
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SCHEMA_FILE="$PROJECT_ROOT/db/migrations/005_neon_compatible_schema.sql"
SEED_FILE="$PROJECT_ROOT/scripts/seed-test-data-neon.sql"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log_info() {
    echo -e "${BLUE}INFO:${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_header() {
    echo ""
    echo -e "${BOLD}$1${NC}"
    echo "================================"
    echo ""
}

# ==============================================================================
# HELP MESSAGE
# ==============================================================================

show_help() {
    cat << EOF
ParkBoard Neon Database Setup

Usage: $0 [OPTIONS]

Options:
  --with-seed    Include test data after schema creation
  --dry-run      Show what would be executed without running
  --help         Show this help message

Examples:
  $0                    # Create schema only
  $0 --with-seed        # Create schema + test data
  $0 --dry-run          # Preview what would run
  $0 --with-seed --dry-run  # Preview schema + seed

Environment:
  NEON_CONNECTION_STRING    Required. PostgreSQL connection string to Neon.
                            Format: postgresql://user:pass@host/db?sslmode=require

Files Used:
  Schema: db/migrations/005_neon_compatible_schema.sql
  Seed:   scripts/seed-test-data-neon.sql
EOF
}

# ==============================================================================
# PREREQUISITE CHECKS
# ==============================================================================

check_prerequisites() {
    local has_errors=false

    echo "Checking prerequisites..."
    echo ""

    # Check psql
    if command -v psql &> /dev/null; then
        log_success "psql is installed"
    else
        log_error "psql is not installed"
        echo "       Install with: sudo apt install postgresql-client"
        has_errors=true
    fi

    # Check NEON_CONNECTION_STRING
    if [[ -n "${NEON_CONNECTION_STRING:-}" ]]; then
        log_success "NEON_CONNECTION_STRING is set"
    else
        log_error "NEON_CONNECTION_STRING is not set"
        echo "       Set with: export NEON_CONNECTION_STRING='postgresql://...'"
        has_errors=true
    fi

    # Check schema file exists
    if [[ -f "$SCHEMA_FILE" ]]; then
        log_success "Schema file exists: $(basename "$SCHEMA_FILE")"
    else
        log_error "Schema file not found: $SCHEMA_FILE"
        has_errors=true
    fi

    # Check seed file exists (only if --with-seed)
    if [[ "${WITH_SEED:-false}" == "true" ]]; then
        if [[ -f "$SEED_FILE" ]]; then
            log_success "Seed file exists: $(basename "$SEED_FILE")"
        else
            log_error "Seed file not found: $SEED_FILE"
            has_errors=true
        fi
    fi

    echo ""

    if [[ "$has_errors" == "true" ]]; then
        log_error "Prerequisites check failed. Please fix the issues above."
        exit 1
    fi
}

# ==============================================================================
# DATABASE OPERATIONS
# ==============================================================================

run_schema_migration() {
    local dry_run="${1:-false}"

    echo "Running schema migration..."
    echo ""

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY-RUN: Would execute $SCHEMA_FILE"
        echo ""
        echo "File preview (first 30 lines):"
        echo "---"
        head -n 30 "$SCHEMA_FILE"
        echo "---"
        echo "(... truncated ...)"
        echo ""
        return 0
    fi

    if psql "$NEON_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE" > /dev/null 2>&1; then
        log_success "Schema created successfully"
    else
        log_error "Schema creation failed"
        echo ""
        echo "Running with verbose output for debugging:"
        psql "$NEON_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f "$SCHEMA_FILE"
        exit 1
    fi
}

run_seed_data() {
    local dry_run="${1:-false}"

    echo "Running seed data..."
    echo ""

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY-RUN: Would execute $SEED_FILE"
        echo ""
        echo "File preview (first 30 lines):"
        echo "---"
        head -n 30 "$SEED_FILE"
        echo "---"
        echo "(... truncated ...)"
        echo ""
        return 0
    fi

    if psql "$NEON_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f "$SEED_FILE" > /dev/null 2>&1; then
        log_success "Seed data inserted successfully"
    else
        log_error "Seed data insertion failed"
        echo ""
        echo "Running with verbose output for debugging:"
        psql "$NEON_CONNECTION_STRING" -v ON_ERROR_STOP=1 -f "$SEED_FILE"
        exit 1
    fi
}

verify_tables() {
    local dry_run="${1:-false}"

    echo "Verifying tables..."
    echo ""

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY-RUN: Would verify tables user_profiles, parking_slots, bookings"
        return 0
    fi

    local tables=("user_profiles" "parking_slots" "bookings")
    local all_exist=true

    for table in "${tables[@]}"; do
        local exists
        exists=$(psql "$NEON_CONNECTION_STRING" -t -A -c \
            "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '$table');" 2>/dev/null || echo "f")

        if [[ "$exists" == "t" ]]; then
            log_success "$table table exists"
        else
            log_error "$table table does not exist"
            all_exist=false
        fi
    done

    echo ""

    if [[ "$all_exist" == "false" ]]; then
        log_error "Table verification failed"
        exit 1
    fi
}

show_summary() {
    local dry_run="${1:-false}"
    local with_seed="${2:-false}"

    echo ""

    if [[ "$dry_run" == "true" ]]; then
        log_header "Dry Run Complete"
        echo "No changes were made to the database."
        echo ""
        echo "To execute, run without --dry-run:"
        if [[ "$with_seed" == "true" ]]; then
            echo "  $0 --with-seed"
        else
            echo "  $0"
        fi
    else
        # Get table count
        local table_count
        table_count=$(psql "$NEON_CONNECTION_STRING" -t -A -c \
            "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'parking_slots', 'bookings');" 2>/dev/null || echo "0")

        echo ""
        echo -e "${GREEN}Setup complete!${NC} $table_count tables ready."
        echo ""
        echo "Next steps:"
        echo "  1. Set NEON_CONNECTION_STRING in your .env file"
        echo "  2. Run: npm run dev"
        echo "  3. Open: http://localhost:3000/LMR/slots"
        if [[ "$with_seed" == "true" ]]; then
            echo ""
            echo "Test data created:"
            echo "  - 4 test users (maria.santos, juan.delacruz, elena.rodriguez, ben.alvarez)"
            echo "  - 6 parking slots (4 active, 1 maintenance, 1 disabled)"
        fi
    fi
}

# ==============================================================================
# MAIN FUNCTION
# ==============================================================================

main() {
    local dry_run=false
    local with_seed=false

    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --with-seed)
                with_seed=true
                shift
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --help|-h|help)
                show_help
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                echo ""
                echo "Run '$0 --help' for usage information"
                exit 1
                ;;
        esac
    done

    # Export for use in check_prerequisites
    export WITH_SEED="$with_seed"

    # Display header
    log_header "ParkBoard Neon Database Setup"

    # Check prerequisites
    check_prerequisites

    # Run schema migration
    run_schema_migration "$dry_run"

    # Run seed data if requested
    if [[ "$with_seed" == "true" ]]; then
        run_seed_data "$dry_run"
    fi

    # Verify tables
    verify_tables "$dry_run"

    # Show summary
    show_summary "$dry_run" "$with_seed"
}

# Run main function
main "$@"
