#!/usr/bin/env bash

# ==============================================================================
# DATABASE MIGRATION RUNNER
# ==============================================================================
# Platform-independent migration script that works with:
# - Supabase (via Supabase CLI or dashboard)
# - Neon (via psql with DATABASE_URL)
# - Local PostgreSQL (via psql)
#
# Features:
# - Auto-detects database type from environment variables
# - Tracks migration history (which migrations have run)
# - Supports forward migrations and rollbacks
# - Idempotent (safe to run multiple times)
# - Dry-run mode for testing
#
# Usage:
#   ./scripts/migrate.sh                    # Run all pending migrations
#   ./scripts/migrate.sh --dry-run          # Show what would run
#   ./scripts/migrate.sh rollback           # Rollback last migration
#   ./scripts/migrate.sh status             # Show migration status
# ==============================================================================

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MIGRATIONS_DIR="$PROJECT_ROOT/app/db/migrations"
MIGRATION_TABLE="schema_migrations"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

log_success() {
    echo -e "${GREEN}✓${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

log_error() {
    echo -e "${RED}✗${NC} $1"
}

log_header() {
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$1"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

# ==============================================================================
# DATABASE TYPE DETECTION
# ==============================================================================

detect_database_type() {
    # Check for Supabase (public env var indicates Supabase)
    if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
        echo "supabase"
        return
    fi

    # Check for Neon or local Postgres (via DATABASE_URL)
    if [[ -n "${DATABASE_URL:-}" ]]; then
        if [[ "$DATABASE_URL" == *"neon.tech"* ]]; then
            echo "neon"
        else
            echo "local"
        fi
        return
    fi

    log_error "No database connection configured!"
    echo ""
    echo "Set one of:"
    echo "  - NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (for Supabase)"
    echo "  - DATABASE_URL (for Neon or local PostgreSQL)"
    exit 1
}

# ==============================================================================
# SQL EXECUTION FUNCTIONS
# ==============================================================================

execute_sql_supabase() {
    local sql="$1"
    local description="${2:-}"

    if [[ -n "$description" ]]; then
        log_info "$description"
    fi

    # Try using Supabase CLI first
    if command -v supabase &> /dev/null; then
        echo "$sql" | supabase db execute --stdin
    else
        log_warning "Supabase CLI not found. Please install it or use the dashboard."
        echo ""
        echo "Installation: npm install -g supabase"
        echo "Or paste this SQL into Supabase Dashboard → SQL Editor:"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        echo "$sql"
        echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
        exit 1
    fi
}

execute_sql_postgres() {
    local sql="$1"
    local description="${2:-}"

    if [[ -n "$description" ]]; then
        log_info "$description"
    fi

    echo "$sql" | psql "$DATABASE_URL" -v ON_ERROR_STOP=1
}

execute_sql() {
    local sql="$1"
    local description="${2:-}"
    local db_type="$3"

    if [[ "$db_type" == "supabase" ]]; then
        execute_sql_supabase "$sql" "$description"
    else
        execute_sql_postgres "$sql" "$description"
    fi
}

# ==============================================================================
# MIGRATION TRACKING
# ==============================================================================

ensure_migration_table() {
    local db_type="$1"

    local sql="
CREATE TABLE IF NOT EXISTS $MIGRATION_TABLE (
    id SERIAL PRIMARY KEY,
    migration_name TEXT NOT NULL UNIQUE,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    execution_time_ms INTEGER,
    checksum TEXT
);

COMMENT ON TABLE $MIGRATION_TABLE IS 'Tracks which database migrations have been executed';
"

    execute_sql "$sql" "Ensuring migration tracking table exists..." "$db_type"
}

get_executed_migrations() {
    local db_type="$1"

    local sql="SELECT migration_name FROM $MIGRATION_TABLE ORDER BY id;"

    if [[ "$db_type" == "supabase" ]]; then
        if command -v supabase &> /dev/null; then
            echo "$sql" | supabase db execute --stdin | tail -n +3 | grep -v '^(' | grep -v '^$' || true
        else
            echo ""
        fi
    else
        echo "$sql" | psql "$DATABASE_URL" -t -A || true
    fi
}

record_migration() {
    local migration_name="$1"
    local execution_time_ms="$2"
    local db_type="$3"

    local sql="
INSERT INTO $MIGRATION_TABLE (migration_name, execution_time_ms)
VALUES ('$migration_name', $execution_time_ms)
ON CONFLICT (migration_name) DO NOTHING;
"

    execute_sql "$sql" "" "$db_type"
}

# ==============================================================================
# MIGRATION EXECUTION
# ==============================================================================

run_migration() {
    local migration_file="$1"
    local db_type="$2"
    local dry_run="${3:-false}"

    local migration_name=$(basename "$migration_file")
    local start_time=$(date +%s%3N)

    log_info "Running migration: $migration_name"

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY-RUN: Would execute $migration_file"
        return
    fi

    local sql=$(cat "$migration_file")

    # Execute migration
    if execute_sql "$sql" "" "$db_type"; then
        local end_time=$(date +%s%3N)
        local execution_time=$((end_time - start_time))

        record_migration "$migration_name" "$execution_time" "$db_type"
        log_success "Migration completed in ${execution_time}ms"
    else
        log_error "Migration failed: $migration_name"
        exit 1
    fi
}

run_pending_migrations() {
    local db_type="$1"
    local dry_run="${2:-false}"

    log_header "RUNNING PENDING MIGRATIONS"
    log_info "Database type: $db_type"

    # Ensure migration tracking table exists
    ensure_migration_table "$db_type"

    # Get list of executed migrations
    local executed_migrations=$(get_executed_migrations "$db_type")

    # Find all migration files
    local migration_files=$(find "$MIGRATIONS_DIR" -name "*.sql" -not -path "*/rollback/*" -not -name "test_*" | sort)

    local pending_count=0

    for migration_file in $migration_files; do
        local migration_name=$(basename "$migration_file")

        # Check if migration has already been executed
        if echo "$executed_migrations" | grep -q "^$migration_name$"; then
            log_info "Skipping $migration_name (already executed)"
        else
            run_migration "$migration_file" "$db_type" "$dry_run"
            ((pending_count++))
        fi
    done

    echo ""
    if [[ $pending_count -eq 0 ]]; then
        log_success "No pending migrations. Database is up to date."
    else
        log_success "Successfully executed $pending_count migration(s)"
    fi
}

# ==============================================================================
# ROLLBACK FUNCTIONALITY
# ==============================================================================

rollback_last_migration() {
    local db_type="$1"
    local dry_run="${2:-false}"

    log_header "ROLLING BACK LAST MIGRATION"

    # Get last executed migration
    local sql="SELECT migration_name FROM $MIGRATION_TABLE ORDER BY id DESC LIMIT 1;"

    local last_migration=""
    if [[ "$db_type" == "supabase" ]]; then
        if command -v supabase &> /dev/null; then
            last_migration=$(echo "$sql" | supabase db execute --stdin | tail -n +3 | head -n 1 | tr -d ' ')
        fi
    else
        last_migration=$(echo "$sql" | psql "$DATABASE_URL" -t -A)
    fi

    if [[ -z "$last_migration" ]]; then
        log_warning "No migrations to rollback"
        exit 0
    fi

    log_info "Last migration: $last_migration"

    # Find rollback file
    local rollback_file="$MIGRATIONS_DIR/rollback/${last_migration%.sql}_rollback.sql"

    if [[ ! -f "$rollback_file" ]]; then
        log_error "Rollback file not found: $rollback_file"
        exit 1
    fi

    if [[ "$dry_run" == "true" ]]; then
        log_warning "DRY-RUN: Would rollback $last_migration"
        return
    fi

    # Execute rollback
    local sql=$(cat "$rollback_file")
    if execute_sql "$sql" "Executing rollback..." "$db_type"; then
        # Remove from tracking table
        local delete_sql="DELETE FROM $MIGRATION_TABLE WHERE migration_name = '$last_migration';"
        execute_sql "$delete_sql" "" "$db_type"

        log_success "Rollback completed: $last_migration"
    else
        log_error "Rollback failed"
        exit 1
    fi
}

# ==============================================================================
# STATUS DISPLAY
# ==============================================================================

show_migration_status() {
    local db_type="$1"

    log_header "MIGRATION STATUS"
    log_info "Database type: $db_type"

    # Ensure migration tracking table exists
    ensure_migration_table "$db_type"

    # Get executed migrations
    local executed_migrations=$(get_executed_migrations "$db_type")

    # Find all migration files
    local migration_files=$(find "$MIGRATIONS_DIR" -name "*.sql" -not -path "*/rollback/*" -not -name "test_*" | sort)

    echo ""
    echo "Available Migrations:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    for migration_file in $migration_files; do
        local migration_name=$(basename "$migration_file")

        if echo "$executed_migrations" | grep -q "^$migration_name$"; then
            echo -e "${GREEN}✓${NC} $migration_name (executed)"
        else
            echo -e "${YELLOW}○${NC} $migration_name (pending)"
        fi
    done

    echo ""
}

# ==============================================================================
# MAIN FUNCTION
# ==============================================================================

main() {
    local command="${1:-run}"
    local dry_run=false

    # Parse flags
    if [[ "$command" == "--dry-run" ]]; then
        dry_run=true
        command="run"
    fi

    # Detect database type
    local db_type=$(detect_database_type)

    case "$command" in
        run|migrate)
            run_pending_migrations "$db_type" "$dry_run"
            ;;
        rollback)
            rollback_last_migration "$db_type" "$dry_run"
            ;;
        status)
            show_migration_status "$db_type"
            ;;
        help|--help|-h)
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  run, migrate    Run all pending migrations (default)"
            echo "  rollback        Rollback the last migration"
            echo "  status          Show migration status"
            echo "  help            Show this help message"
            echo ""
            echo "Options:"
            echo "  --dry-run       Show what would be executed without running"
            echo ""
            echo "Examples:"
            echo "  $0                    # Run pending migrations"
            echo "  $0 --dry-run          # Preview migrations"
            echo "  $0 rollback           # Rollback last migration"
            echo "  $0 status             # Show status"
            ;;
        *)
            log_error "Unknown command: $command"
            echo "Run '$0 help' for usage information"
            exit 1
            ;;
    esac
}

# Run main function
main "$@"
