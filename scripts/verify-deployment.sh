#!/usr/bin/env bash

# ==============================================================================
# PARKBOARD DEPLOYMENT VERIFICATION SCRIPT
# ==============================================================================
# Verifies that a ParkBoard deployment is working correctly by checking
# endpoint availability and optionally database connectivity.
#
# Usage:
#   ./scripts/verify-deployment.sh <url>              # Basic health checks
#   ./scripts/verify-deployment.sh <url> --with-db    # Include database checks
#
# Examples:
#   ./scripts/verify-deployment.sh https://parkboard.vercel.app
#   ./scripts/verify-deployment.sh https://parkboard.app --with-db
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

TIMEOUT_SECONDS=5
ENDPOINTS=(
    "/"
    "/LMR/slots"
    "/login"
)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log_success() {
    echo -e "${GREEN}✅${NC} $1"
}

log_error() {
    echo -e "${RED}❌${NC} $1"
}

log_info() {
    echo -e "${BLUE}ℹ${NC}  $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC}  $1"
}

# ==============================================================================
# USAGE
# ==============================================================================

show_usage() {
    echo "Usage: $0 <deployment-url> [--with-db]"
    echo ""
    echo "Arguments:"
    echo "  <deployment-url>    The base URL to verify (e.g., https://parkboard.vercel.app)"
    echo ""
    echo "Options:"
    echo "  --with-db           Also verify database connectivity (requires NEON_CONNECTION_STRING)"
    echo "  --help, -h          Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 https://parkboard.vercel.app"
    echo "  $0 https://parkboard.app --with-db"
}

# ==============================================================================
# VALIDATION
# ==============================================================================

validate_url() {
    local url="$1"

    # Check if URL is provided
    if [[ -z "$url" ]]; then
        log_error "Deployment URL is required"
        echo ""
        show_usage
        exit 1
    fi

    # Check if URL starts with http:// or https://
    if [[ ! "$url" =~ ^https?:// ]]; then
        log_error "Invalid URL: must start with http:// or https://"
        exit 1
    fi

    # Remove trailing slash if present
    echo "${url%/}"
}

# ==============================================================================
# ENDPOINT CHECKS
# ==============================================================================

check_endpoint() {
    local base_url="$1"
    local endpoint="$2"
    local full_url="${base_url}${endpoint}"

    ((TOTAL_CHECKS++))

    # Make HTTP request with timeout
    local http_code
    http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT_SECONDS" "$full_url" 2>/dev/null) || {
        log_error "${endpoint} -> Connection failed (timeout or network error)"
        ((FAILED_CHECKS++))
        return 1
    }

    # Check status code
    if [[ "$http_code" == "200" ]]; then
        log_success "${endpoint} -> ${http_code} OK"
        ((PASSED_CHECKS++))
        return 0
    elif [[ "$http_code" =~ ^3[0-9][0-9]$ ]]; then
        # Redirects are acceptable (e.g., auth redirects)
        log_success "${endpoint} -> ${http_code} (redirect)"
        ((PASSED_CHECKS++))
        return 0
    else
        log_error "${endpoint} -> ${http_code}"
        ((FAILED_CHECKS++))
        return 1
    fi
}

run_endpoint_checks() {
    local base_url="$1"

    echo ""
    echo "Checking endpoints..."

    for endpoint in "${ENDPOINTS[@]}"; do
        check_endpoint "$base_url" "$endpoint" || true
    done
}

# ==============================================================================
# DATABASE CHECKS
# ==============================================================================

check_database() {
    echo ""
    echo "Checking database connectivity..."

    # Check if NEON_CONNECTION_STRING is set
    if [[ -z "${NEON_CONNECTION_STRING:-}" ]]; then
        log_warning "NEON_CONNECTION_STRING not set, skipping database checks"
        return 0
    fi

    # Check if psql is available
    if ! command -v psql &> /dev/null; then
        log_warning "psql not found, skipping database checks"
        return 0
    fi

    ((TOTAL_CHECKS++))

    # Verify core tables exist
    local tables_query="SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('user_profiles', 'parking_slots', 'bookings') ORDER BY table_name;"

    local result
    result=$(psql "$NEON_CONNECTION_STRING" -t -A -c "$tables_query" 2>/dev/null) || {
        log_error "Database connection failed"
        ((FAILED_CHECKS++))
        return 1
    }

    # Check that expected tables exist
    local expected_tables=("bookings" "parking_slots" "user_profiles")
    local found_tables
    IFS=$'\n' read -r -d '' -a found_tables <<< "$result" || true

    local missing_tables=()
    for table in "${expected_tables[@]}"; do
        if [[ ! " ${found_tables[*]} " =~ " ${table} " ]]; then
            missing_tables+=("$table")
        fi
    done

    if [[ ${#missing_tables[@]} -eq 0 ]]; then
        log_success "Database tables verified (${#expected_tables[@]} core tables found)"
        ((PASSED_CHECKS++))
        return 0
    else
        log_error "Missing tables: ${missing_tables[*]}"
        ((FAILED_CHECKS++))
        return 1
    fi
}

# ==============================================================================
# SUMMARY
# ==============================================================================

show_summary() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo -e "${BLUE}📊${NC} Results: ${PASSED_CHECKS}/${TOTAL_CHECKS} checks passed"

    if [[ $FAILED_CHECKS -eq 0 ]]; then
        echo -e "${GREEN}🎉${NC} Deployment verified successfully!"
        return 0
    else
        echo -e "${RED}💥${NC} Deployment verification failed (${FAILED_CHECKS} check(s) failed)"
        return 1
    fi
}

# ==============================================================================
# MAIN
# ==============================================================================

main() {
    local url=""
    local with_db=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --with-db)
                with_db=true
                shift
                ;;
            --help|-h)
                show_usage
                exit 0
                ;;
            -*)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$url" ]]; then
                    url="$1"
                else
                    log_error "Unexpected argument: $1"
                    show_usage
                    exit 1
                fi
                shift
                ;;
        esac
    done

    # Validate URL
    url=$(validate_url "$url")

    # Display header
    echo ""
    echo -e "${BLUE}🔍${NC} ParkBoard Deployment Verification"
    echo "===================================="
    echo "Target: $url"

    # Run endpoint checks
    run_endpoint_checks "$url"

    # Run database checks if requested
    if [[ "$with_db" == "true" ]]; then
        check_database
    fi

    # Show summary and exit with appropriate code
    show_summary
    exit $?
}

main "$@"
