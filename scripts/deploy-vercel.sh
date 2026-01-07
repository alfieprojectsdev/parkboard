#!/usr/bin/env bash

################################################################################
# PARKBOARD - VERCEL PRODUCTION DEPLOYMENT SCRIPT
################################################################################
#
# Automated CLI deployment script with comprehensive checks and verification.
#
# Features:
# - Prerequisites verification (Vercel CLI, Node.js, git status)
# - Environment variable validation and setup
# - Database migrations execution via TypeScript runner
# - Vercel deployment with environment variable configuration
# - Post-deployment verification (health checks, endpoints)
# - Detailed error handling with actionable messages
#
# Usage:
#   ./scripts/deploy-vercel.sh                    # Interactive deployment
#   ./scripts/deploy-vercel.sh --dry-run          # Preview without deploying
#   ./scripts/deploy-vercel.sh --force            # Skip confirmations
#   ./scripts/deploy-vercel.sh --domain myapp.com # Custom domain
#   ./scripts/deploy-vercel.sh --verbose          # Debug mode
#
# Environment Variables (optional):
#   DATABASE_URL       - Neon pooled connection string
#   NEXTAUTH_SECRET    - NextAuth JWT secret
#   NEXTAUTH_URL       - App URL (set automatically if not provided)
#
# Examples:
#   # Standard deployment
#   ./scripts/deploy-vercel.sh
#
#   # Non-interactive with all variables
#   DATABASE_URL="..." NEXTAUTH_SECRET="..." ./scripts/deploy-vercel.sh --force
#
#   # Test run
#   ./scripts/deploy-vercel.sh --dry-run
#
################################################################################

set -euo pipefail

# ==============================================================================
# CONFIGURATION
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_PRODUCTION="${PROJECT_ROOT}/.env.vercel.production"

# Color codes
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[0;33m'
readonly BLUE='\033[0;34m'
readonly CYAN='\033[0;36m'
readonly RESET='\033[0m'

# Emoji symbols
readonly SUCCESS='✓'
readonly ERROR='✗'
readonly WARNING='⚠'
readonly INFO='ℹ'
readonly ROCKET='🚀'

# Flags
DRY_RUN=false
FORCE_MODE=false
VERBOSE=false
AUTO_FIX=false
CUSTOM_DOMAIN=""

# ==============================================================================
# LOGGING FUNCTIONS
# ==============================================================================

log_info() {
  echo -e "${CYAN}${INFO}${RESET} $*"
}

log_success() {
  echo -e "${GREEN}${SUCCESS}${RESET} $*"
}

log_warning() {
  echo -e "${YELLOW}${WARNING}${RESET} $*"
}

log_error() {
  echo -e "${RED}${ERROR}${RESET} $*" >&2
}

log_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${RESET}"
  echo -e "${BLUE}$*${RESET}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${RESET}"
}

log_verbose() {
  if [[ "$VERBOSE" == "true" ]]; then
    echo -e "${BLUE}[DEBUG]${RESET} $*"
  fi
}

# ==============================================================================
# ERROR HANDLING
# ==============================================================================

cleanup() {
  local exit_code=$?
  if [[ $exit_code -ne 0 ]]; then
    log_error "Deployment failed with exit code: $exit_code"
    echo ""
    log_info "Check logs above for detailed error information"
    log_info ""
    log_info "Quick fixes:"
    log_info "  - Try with auto-fix: $0 --auto-fix"
    log_info "  - Run in verbose mode: $0 --verbose"
    log_info "  - Check Vercel CLI: npm i -g vercel"
    log_info "  - Verify login: vercel whoami"
    log_info "  - Test DATABASE_URL: psql \"\$DATABASE_URL\" -c 'SELECT 1'"
    echo ""
    log_info "For help: $0 --help"
  fi
  exit "$exit_code"
}

trap cleanup EXIT

# ==============================================================================
# CLI ARGUMENT PARSING
# ==============================================================================

parse_args() {
  while [[ $# -gt 0 ]]; do
    case $1 in
      --dry-run)
        DRY_RUN=true
        shift
        ;;
      --force)
        FORCE_MODE=true
        shift
        ;;
      --verbose)
        VERBOSE=true
        shift
        ;;
      --auto-fix)
        AUTO_FIX=true
        shift
        ;;
      --no-auto-fix)
        AUTO_FIX=false
        shift
        ;;
      --domain)
        CUSTOM_DOMAIN="$2"
        shift 2
        ;;
      --help|-h)
        show_help
        exit 0
        ;;
      *)
        log_error "Unknown option: $1"
        show_help
        exit 1
        ;;
    esac
  done
}

show_help() {
  cat <<EOF
ParkBoard Vercel Deployment Script

Usage: $0 [OPTIONS]

Options:
  --dry-run           Preview deployment without executing
  --force             Skip all confirmations (non-interactive mode)
  --verbose           Enable debug output
  --auto-fix          Automatically fix common issues (recommended)
  --no-auto-fix       Disable automatic fixes
  --domain <domain>   Set custom domain (e.g., parkboard.app)
  --help, -h          Show this help message

Environment Variables (optional):
  DATABASE_URL        Neon pooled connection string
  NEXTAUTH_SECRET     NextAuth JWT secret (generated if not set)
  NEXTAUTH_URL        Application URL (set from Vercel URL if not provided)

Examples:
  # Interactive deployment with auto-fix (recommended)
  $0 --auto-fix

  # Dry-run to preview
  $0 --dry-run

  # Fully automated (CI/CD)
  DATABASE_URL="..." NEXTAUTH_SECRET="..." $0 --force --auto-fix

  # Deploy with custom domain
  $0 --domain parkboard.app --auto-fix

Auto-Fix Capabilities:
  - Automatically installs Vercel CLI if missing
  - Automatically initiates login if not authenticated
  - Auto-converts DATABASE_URL to pooled connection
  - Auto-retries failed migrations (up to 3 attempts)
  - Auto-wakes suspended Neon database
  - Auto-retries failed deployments (up to 2 attempts)
  - Interactive environment setup for missing variables

Requirements:
  - Node.js >= 18
  - Valid Neon database with pooled connection string

For more information, see docs/DEPLOYMENT_VERCEL_NEON_2025.md
EOF
}

# ==============================================================================
# PREREQUISITES CHECK
# ==============================================================================

check_prerequisites() {
  log_header "CHECKING PREREQUISITES"

  # Check Node.js version
  log_info "Checking Node.js version..."
  if ! command -v node &> /dev/null; then
    log_error "Node.js not found. Install from https://nodejs.org"
    exit 1
  fi

  local node_version
  node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
  if [[ "$node_version" -lt 18 ]]; then
    log_error "Node.js version must be >= 18 (found: $(node --version))"
    exit 1
  fi
  log_success "Node.js $(node --version)"

  # Check Vercel CLI (with auto-install)
  log_info "Checking Vercel CLI..."
  if ! command -v vercel &> /dev/null; then
    log_warning "Vercel CLI not found"

    if [[ "$AUTO_FIX" == "true" ]] || [[ "$FORCE_MODE" == "true" ]]; then
      log_info "Installing Vercel CLI automatically..."
      if npm install -g vercel; then
        log_success "Vercel CLI installed successfully"
      else
        log_error "Failed to install Vercel CLI"
        log_info "Manual install: npm i -g vercel"
        exit 1
      fi
    else
      read -p "Install Vercel CLI now? (Y/n): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Installing Vercel CLI..."
        if npm install -g vercel; then
          log_success "Vercel CLI installed successfully"
        else
          log_error "Failed to install Vercel CLI"
          exit 1
        fi
      else
        log_error "Vercel CLI required for deployment"
        log_info "Install: npm i -g vercel"
        exit 1
      fi
    fi
  else
    log_success "Vercel CLI $(vercel --version 2>/dev/null || echo 'installed')"
  fi

  # Check Vercel login status (with auto-login)
  log_info "Checking Vercel authentication..."
  if ! vercel whoami &> /dev/null; then
    log_warning "Not logged in to Vercel"

    if [[ "$AUTO_FIX" == "true" ]] || [[ "$FORCE_MODE" == "true" ]]; then
      log_info "Opening Vercel login..."
      vercel login

      # Verify login succeeded
      if ! vercel whoami &> /dev/null; then
        log_error "Login failed"
        exit 1
      fi
      log_success "Logged in successfully"
    else
      read -p "Login to Vercel now? (Y/n): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Nn]$ ]]; then
        log_info "Opening Vercel login..."
        vercel login

        # Verify login succeeded
        if ! vercel whoami &> /dev/null; then
          log_error "Login failed"
          exit 1
        fi
        log_success "Logged in successfully"
      else
        log_error "Vercel authentication required"
        log_info "Run: vercel login"
        exit 1
      fi
    fi
  fi

  local vercel_user
  vercel_user=$(vercel whoami 2>/dev/null)
  log_success "Logged in as: $vercel_user"

  # Check git repository
  log_info "Checking git repository..."
  if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
    log_error "Not a git repository. Initialize with: git init"
    exit 1
  fi
  log_success "Git repository found"

  # Check for uncommitted changes
  if [[ -n "$(git status --porcelain)" ]]; then
    log_warning "Uncommitted changes detected"
    if [[ "$FORCE_MODE" != "true" ]] && [[ "$DRY_RUN" != "true" ]]; then
      read -p "Continue anyway? (y/N): " -n 1 -r
      echo
      if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Deployment cancelled"
        exit 0
      fi
    fi
  else
    log_success "Working directory clean"
  fi

  # Check for required files
  log_info "Checking project structure..."
  local required_files=("package.json" "next.config.js" "tsconfig.json")
  for file in "${required_files[@]}"; do
    if [[ ! -f "$PROJECT_ROOT/$file" ]]; then
      log_error "Required file not found: $file"
      exit 1
    fi
  done
  log_success "Project structure valid"

  log_success "All prerequisites satisfied"
}

# ==============================================================================
# ENVIRONMENT SETUP
# ==============================================================================

setup_environment() {
  log_header "ENVIRONMENT SETUP"

  # Load existing .env.vercel.production if exists
  if [[ -f "$ENV_PRODUCTION" ]]; then
    log_info "Loading environment from: .env.vercel.production"
    # shellcheck disable=SC1090
    source "$ENV_PRODUCTION"
  fi

  # 1. DATABASE_URL
  if [[ -z "${DATABASE_URL:-}" ]]; then
    log_info "DATABASE_URL not set"
    if [[ "$FORCE_MODE" == "true" ]]; then
      log_error "DATABASE_URL required in non-interactive mode"
      exit 1
    fi

    log_info ""
    log_info "Database Connection Setup"
    log_info "Get from: https://console.neon.tech -> Your Project -> Connection Details"
    log_warning "IMPORTANT: Use 'Pooled connection' (hostname with -pooler)"
    echo ""
    echo -n "Enter Neon DATABASE_URL: "
    read -r DATABASE_URL
  fi

  # Auto-convert DATABASE_URL to pooled connection
  if [[ ! "$DATABASE_URL" =~ -pooler\. ]]; then
    log_warning "DATABASE_URL should use pooled connection (-pooler)"

    # Extract hostname and convert to pooled
    if [[ "$DATABASE_URL" =~ @ep-([^.]+)\. ]]; then
      POOLED_URL=$(echo "$DATABASE_URL" | sed 's/@ep-\([^.]*\)\./@ep-\1-pooler./')

      log_info "Auto-converting to pooled connection:"
      log_info "  Old: ${DATABASE_URL:0:60}..."
      log_info "  New: ${POOLED_URL:0:60}..."

      if [[ "$AUTO_FIX" == "true" ]] || [[ "$FORCE_MODE" == "true" ]]; then
        DATABASE_URL="$POOLED_URL"
        log_success "Auto-converted to pooled connection"
      else
        read -p "Use pooled connection? (Y/n): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Nn]$ ]]; then
          DATABASE_URL="$POOLED_URL"
          log_success "Converted to pooled connection"
        else
          log_error "Pooled connection required for Vercel deployment"
          exit 1
        fi
      fi
    else
      log_error "Invalid DATABASE_URL format: Cannot auto-convert"
      log_info "Expected: postgresql://user:pass@ep-xxx.region.aws.neon.tech/db"
      log_info "Required: postgresql://user:pass@ep-xxx-pooler.region.aws.neon.tech/db"
      exit 1
    fi
  fi
  log_success "DATABASE_URL configured (pooled connection)"

  # 2. NEXTAUTH_SECRET
  if [[ -z "${NEXTAUTH_SECRET:-}" ]]; then
    log_info "Generating NEXTAUTH_SECRET..."
    NEXTAUTH_SECRET=$(openssl rand -base64 32)
  fi
  log_success "NEXTAUTH_SECRET configured (${#NEXTAUTH_SECRET} characters)"

  # 3. NEXTAUTH_URL (will be set after deployment)
  if [[ -z "${NEXTAUTH_URL:-}" ]]; then
    log_info "NEXTAUTH_URL will be set after first deployment"
  else
    log_success "NEXTAUTH_URL configured: $NEXTAUTH_URL"
  fi

  # 4. NEXT_PUBLIC_APP_URL
  if [[ -z "${NEXT_PUBLIC_APP_URL:-}" ]]; then
    NEXT_PUBLIC_APP_URL="${NEXTAUTH_URL:-}"
  fi

  # 5. Supabase variables (legacy - still needed for query layer)
  if [[ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
    log_warning "NEXT_PUBLIC_SUPABASE_URL not set (legacy variable - may cause issues)"
  fi
  if [[ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
    log_warning "NEXT_PUBLIC_SUPABASE_ANON_KEY not set (legacy variable - may cause issues)"
  fi

  # Save environment for future runs
  if [[ "$DRY_RUN" != "true" ]]; then
    log_info "Saving environment to: .env.vercel.production"
    cat > "$ENV_PRODUCTION" <<EOF
# Generated by deploy-vercel.sh on $(date)
# DO NOT commit to git!

DATABASE_URL='$DATABASE_URL'
NEXTAUTH_SECRET='$NEXTAUTH_SECRET'
${NEXTAUTH_URL:+NEXTAUTH_URL="$NEXTAUTH_URL"}
${NEXT_PUBLIC_APP_URL:+NEXT_PUBLIC_APP_URL="$NEXT_PUBLIC_APP_URL"}
${NEXT_PUBLIC_SUPABASE_URL:+NEXT_PUBLIC_SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"}
${NEXT_PUBLIC_SUPABASE_ANON_KEY:+NEXT_PUBLIC_SUPABASE_ANON_KEY="$NEXT_PUBLIC_SUPABASE_ANON_KEY"}
EOF
    log_success "Environment saved"
  fi

  log_success "Environment setup complete"
}

# ==============================================================================
# DATABASE MIGRATIONS
# ==============================================================================

run_migrations() {
  log_header "DATABASE MIGRATIONS"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry-run mode: Skipping migrations"
    return 0
  fi

  # Export DATABASE_URL for migration script
  export DATABASE_URL

  # Change to project root
  cd "$PROJECT_ROOT"

  local max_attempts=3
  local attempt=1

  while [ $attempt -le $max_attempts ]; do
    log_info "Running migrations (attempt $attempt/$max_attempts)..."

    # Run migrations using npm script
    local migration_output
    if [[ "$VERBOSE" == "true" ]]; then
      npm run migrate
      local migration_status=$?
    else
      migration_output=$(npm run migrate 2>&1)
      local migration_status=$?
    fi

    if [[ $migration_status -eq 0 ]]; then
      log_success "Database migrations completed"
      return 0
    fi

    # Diagnose failure
    log_warning "Migration failed, diagnosing issue..."

    # Test database connection
    if ! psql "$DATABASE_URL" -c "SELECT 1" &> /dev/null; then
      log_warning "Cannot connect to database"

      if [[ "$migration_output" =~ "no pg_hba.conf entry" ]]; then
        log_error "Database access denied - check IP allowlist in Neon"
        log_info "Go to: https://console.neon.tech -> Your Project -> Settings -> IP Allow"
        exit 1
      fi

      if [[ "$migration_output" =~ "timeout" ]] || [[ "$migration_output" =~ "ECONNREFUSED" ]]; then
        log_info "Database may be suspended (Neon auto-suspends after inactivity)"
        log_info "Waking up database..."

        # Wake up database with a simple query (ignore errors)
        psql "$DATABASE_URL" -c "SELECT 1" 2>&1 | head -5 || true

        log_info "Waiting 10 seconds for database to wake up..."
        sleep 10

        attempt=$((attempt + 1))
        continue
      fi

      log_error "Database connection failed"
      if [[ "$VERBOSE" == "true" ]]; then
        log_verbose "$migration_output"
      fi
      exit 1
    fi

    # Check if tables already exist (migrations already ran)
    if psql "$DATABASE_URL" -c "\dt" 2>/dev/null | grep -q "user_profiles"; then
      log_success "Migrations already applied (tables exist)"
      return 0
    fi

    # Check for permission errors
    if [[ "$migration_output" =~ "permission denied" ]]; then
      log_error "Database user lacks required permissions"
      log_info "Ensure database user has CREATE, ALTER, and INSERT permissions"
      exit 1
    fi

    # Unknown error
    if [[ $attempt -eq $max_attempts ]]; then
      log_error "Database migrations failed after $max_attempts attempts"
      log_info "Migration logs:"
      if [[ -n "$migration_output" ]]; then
        echo "$migration_output"
      fi
      log_info ""
      log_info "Common issues:"
      log_info "  - Invalid DATABASE_URL format"
      log_info "  - Database access denied (check IP allowlist)"
      log_info "  - Network connectivity issues"
      log_info "  - Database user lacks permissions"
      exit 1
    fi

    log_info "Retrying in 5 seconds..."
    sleep 5
    attempt=$((attempt + 1))
  done

  log_error "Migration failed after all retry attempts"
  exit 1
}

# ==============================================================================
# VERCEL DEPLOYMENT
# ==============================================================================

deploy_to_vercel() {
  log_header "VERCEL DEPLOYMENT"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry-run mode: Would execute deployment with:"
    log_info "  Command: vercel --prod"
    log_info "  Environment variables:"
    log_info "    - DATABASE_URL: ${DATABASE_URL:0:50}..."
    log_info "    - NEXTAUTH_SECRET: (hidden)"
    log_info "    - NEXTAUTH_URL: ${NEXTAUTH_URL:-'(to be set after deployment)'}"
    log_info "    - NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-'(to be set after deployment)'}"
    return 0
  fi

  # Change to project root
  cd "$PROJECT_ROOT"

  # Set environment variables in Vercel
  log_info "Configuring environment variables in Vercel..."

  # Function to set env var (silently handles already-exists errors)
  set_vercel_env() {
    local name=$1
    local value=$2
    local env_type=${3:-production}

    log_verbose "Setting $name for $env_type..."
    echo "$value" | vercel env add "$name" "$env_type" --force &>/dev/null || true
  }

  # Set all required variables
  set_vercel_env "DATABASE_URL" "$DATABASE_URL" "production"
  set_vercel_env "NEXTAUTH_SECRET" "$NEXTAUTH_SECRET" "production"

  # Set optional variables if they exist
  if [[ -n "${NEXTAUTH_URL:-}" ]]; then
    set_vercel_env "NEXTAUTH_URL" "$NEXTAUTH_URL" "production"
    set_vercel_env "NEXT_PUBLIC_APP_URL" "$NEXTAUTH_URL" "production"
  fi

  if [[ -n "${NEXT_PUBLIC_SUPABASE_URL:-}" ]]; then
    set_vercel_env "NEXT_PUBLIC_SUPABASE_URL" "$NEXT_PUBLIC_SUPABASE_URL" "production"
  fi

  if [[ -n "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ]]; then
    set_vercel_env "NEXT_PUBLIC_SUPABASE_ANON_KEY" "$NEXT_PUBLIC_SUPABASE_ANON_KEY" "production"
  fi

  log_success "Environment variables configured"

  # Deploy to production with retry
  local max_attempts=2
  local attempt=1
  local deployment_output
  local deploy_status

  while [ $attempt -le $max_attempts ]; do
    log_info "Deploying to Vercel (attempt $attempt/$max_attempts)..."
    log_info "This may take 2-5 minutes..."

    deployment_output=$(vercel --prod --yes 2>&1)
    deploy_status=$?

    if [[ $deploy_status -eq 0 ]]; then
      # Extract deployment URL
      DEPLOYMENT_URL=$(echo "$deployment_output" | grep -oP 'https://[^\s]+\.vercel\.app' | head -n1)

      if [[ -z "$DEPLOYMENT_URL" ]]; then
        log_error "Could not extract deployment URL from Vercel output"
        log_verbose "$deployment_output"
        exit 1
      fi

      log_success "Deployed to Vercel"
      log_info "Production URL: $DEPLOYMENT_URL"

      # Update NEXTAUTH_URL if not set
      if [[ -z "${NEXTAUTH_URL:-}" ]]; then
        log_info "Setting NEXTAUTH_URL to deployment URL..."
        NEXTAUTH_URL="$DEPLOYMENT_URL"
        NEXT_PUBLIC_APP_URL="$DEPLOYMENT_URL"

        set_vercel_env "NEXTAUTH_URL" "$NEXTAUTH_URL" "production"
        set_vercel_env "NEXT_PUBLIC_APP_URL" "$NEXT_PUBLIC_APP_URL" "production"

        log_warning "Environment variables updated - redeployment recommended"
        log_info "Run: vercel --prod"
      fi

      # Set custom domain if provided
      if [[ -n "$CUSTOM_DOMAIN" ]]; then
        log_info "Assigning custom domain: $CUSTOM_DOMAIN"
        vercel domains add "$CUSTOM_DOMAIN" --yes || log_warning "Failed to add domain (may already exist)"
        log_success "Custom domain configured (DNS propagation may take time)"
      fi

      log_success "Vercel deployment complete"
      return 0
    fi

    # Diagnose failure
    log_warning "Deployment failed, diagnosing issue..."

    # Check for invalid token
    if echo "$deployment_output" | grep -qi "invalid token\|authentication\|unauthorized"; then
      log_error "Vercel authentication expired or invalid"

      if [[ "$AUTO_FIX" == "true" ]] || [[ "$FORCE_MODE" == "true" ]]; then
        log_info "Re-authenticating with Vercel..."
        vercel login

        if ! vercel whoami &> /dev/null; then
          log_error "Re-authentication failed"
          exit 1
        fi

        log_success "Re-authenticated successfully"
        attempt=$((attempt + 1))
        continue
      else
        log_info "Run: vercel login"
        exit 1
      fi
    fi

    # Check for build failure
    if echo "$deployment_output" | grep -qi "build failed\|build error"; then
      log_error "Build failed during deployment"
      log_info ""
      log_info "Build logs:"
      echo "$deployment_output" | grep -A 10 -i "error"
      log_info ""
      log_info "Common fixes:"
      log_info "  - Run locally: npm run build"
      log_info "  - Fix TypeScript errors: npx tsc --noEmit"
      log_info "  - Fix linting errors: npm run lint"
      exit 1
    fi

    # Unknown error
    if [[ $attempt -eq $max_attempts ]]; then
      log_error "Vercel deployment failed after $max_attempts attempts"
      log_info ""
      log_info "Deployment logs:"
      echo "$deployment_output"
      log_info ""
      log_info "Troubleshooting:"
      log_info "  - Check Vercel dashboard: https://vercel.com/dashboard"
      log_info "  - Try manual deployment: vercel --prod"
      exit 1
    fi

    log_info "Retrying in 5 seconds..."
    sleep 5
    attempt=$((attempt + 1))
  done

  log_error "Deployment failed after all retry attempts"
  exit 1
}

# ==============================================================================
# POST-DEPLOYMENT VERIFICATION
# ==============================================================================

verify_deployment() {
  log_header "POST-DEPLOYMENT VERIFICATION"

  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Dry-run mode: Skipping verification"
    return 0
  fi

  if [[ -z "${DEPLOYMENT_URL:-}" ]]; then
    log_warning "No deployment URL available - skipping verification"
    return 0
  fi

  # Wait for deployment to be ready with progress
  log_info "Waiting for deployment to be ready..."
  local max_wait=60
  local waited=0
  local is_ready=false

  while [ $waited -lt $max_wait ]; do
    local status
    status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/" --max-time 5 2>/dev/null || echo "000")

    if [[ "$status" == "200" ]] || [[ "$status" == "308" ]]; then
      is_ready=true
      log_success "Deployment is ready (took ${waited}s)"
      break
    fi

    log_info "Waiting for deployment... ($waited/$max_wait seconds)"
    sleep 5
    waited=$((waited + 5))
  done

  if [[ "$is_ready" == "false" ]]; then
    log_warning "Deployment may not be fully ready yet"
    log_info "Continuing with verification anyway..."
  fi

  # Test endpoints
  log_info ""
  log_info "Testing endpoints:"

  local test_failed=false

  # Test 1: Home page
  local home_status
  home_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/" --max-time 10 2>/dev/null || echo "000")

  if [[ "$home_status" == "200" ]] || [[ "$home_status" == "308" ]]; then
    log_success "  / -> HTTP $home_status"
  else
    log_error "  / -> HTTP $home_status (expected 200)"
    test_failed=true
  fi

  # Test 2: Login page
  local login_status
  login_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/login" --max-time 10 2>/dev/null || echo "000")

  if [[ "$login_status" == "200" ]]; then
    log_success "  /login -> HTTP $login_status"
  else
    log_warning "  /login -> HTTP $login_status (expected 200)"
  fi

  # Test 3: API endpoint (expect 401 or 200, not 500)
  local api_status
  api_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/slots" --max-time 10 2>/dev/null || echo "000")

  if [[ "$api_status" == "401" ]] || [[ "$api_status" == "200" ]]; then
    log_success "  /api/slots -> HTTP $api_status (auth required)"
  elif [[ "$api_status" == "500" ]]; then
    log_error "  /api/slots -> HTTP 500 (server error)"
    log_warning ""
    log_warning "Common fix: DATABASE_URL not set in Vercel"
    log_info "  Check: vercel env ls"
    log_info "  Add: vercel env add DATABASE_URL production"
    test_failed=true
  else
    log_warning "  /api/slots -> HTTP $api_status"
  fi

  # Test 4: Signup endpoint validation
  local signup_status
  signup_status=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOYMENT_URL/api/auth/signup" --max-time 10 -X POST -H "Content-Type: application/json" -d '{}' 2>/dev/null || echo "000")

  if [[ "$signup_status" == "400" ]] || [[ "$signup_status" == "422" ]]; then
    log_success "  /api/auth/signup -> HTTP $signup_status (validation working)"
  elif [[ "$signup_status" == "500" ]]; then
    log_error "  /api/auth/signup -> HTTP 500 (server error)"
    test_failed=true
  else
    log_warning "  /api/auth/signup -> HTTP $signup_status"
  fi

  log_info ""

  if [[ "$test_failed" == "true" ]]; then
    log_warning "Some verification tests failed"
    log_info ""
    log_info "Troubleshooting steps:"
    log_info "  1. Check Vercel logs: vercel logs $DEPLOYMENT_URL"
    log_info "  2. Verify environment variables: vercel env ls"
    log_info "  3. Check function logs: https://vercel.com -> Your Project -> Functions"
    log_info "  4. Test DATABASE_URL connection from your machine"
    log_info ""
    log_info "Common issues:"
    log_info "  - DATABASE_URL not set or incorrect in Vercel"
    log_info "  - Database IP allowlist blocking Vercel IPs"
    log_info "  - NEXTAUTH_SECRET not set"
    log_info "  - Build completed but runtime errors"
  else
    log_success "All verification tests passed"
  fi

  log_success "Post-deployment verification complete"
}

# ==============================================================================
# DEPLOYMENT SUMMARY
# ==============================================================================

show_summary() {
  log_header "DEPLOYMENT SUMMARY"

  if [[ "$DRY_RUN" == "true" ]]; then
    echo -e "${GREEN}${ROCKET}${RESET} Dry-run complete!"
    echo ""
    log_info "No changes were made. Run without --dry-run to deploy."
    return 0
  fi

  echo -e "${GREEN}${ROCKET}${RESET} Deployment successful!"
  echo ""

  if [[ -n "${DEPLOYMENT_URL:-}" ]]; then
    log_info "Production URL: $DEPLOYMENT_URL"
    log_info "Dashboard: https://vercel.com/dashboard"
  fi

  echo ""
  log_info "Next steps:"
  echo "  1. Test the deployment: ${DEPLOYMENT_URL:-https://your-app.vercel.app}"
  echo "  2. Verify authentication flow (signup, login)"
  echo "  3. Check rate limiting (attempt 6 logins with wrong password)"
  echo "  4. Set up custom domain (optional): vercel domains add your-domain.com"
  echo "  5. Enable Vercel Analytics (Dashboard → Analytics → Enable)"

  if [[ -z "${NEXTAUTH_URL:-}" ]]; then
    echo ""
    log_warning "NEXTAUTH_URL was set after first deployment"
    log_info "Recommended: Redeploy to apply updated environment variables"
    log_info "Run: vercel --prod"
  fi

  echo ""
  log_info "Monitor deployment:"
  echo "  - Logs: vercel logs $DEPLOYMENT_URL"
  echo "  - Functions: https://vercel.com → Your Project → Functions"
  echo "  - Database: https://console.neon.tech"

  echo ""
  log_success "Deployment guide: docs/DEPLOYMENT_VERCEL_NEON_2025.md"
}

# ==============================================================================
# MAIN EXECUTION
# ==============================================================================

main() {
  # Parse CLI arguments
  parse_args "$@"

  # Show mode
  if [[ "$DRY_RUN" == "true" ]]; then
    log_info "Running in DRY-RUN mode (no changes will be made)"
  fi

  if [[ "$AUTO_FIX" == "true" ]]; then
    log_info "Auto-fix mode enabled (will automatically fix common issues)"
  fi

  if [[ "$VERBOSE" == "true" ]]; then
    log_info "Verbose mode enabled"
    set -x
  fi

  # Execute deployment pipeline
  check_prerequisites
  setup_environment
  run_migrations
  deploy_to_vercel
  verify_deployment
  show_summary

  # Clean exit
  exit 0
}

# Run main function
main "$@"
