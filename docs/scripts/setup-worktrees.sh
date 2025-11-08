#!/bin/bash
#
# Parkboard Git Worktree Automated Setup
# ======================================
#
# This script automates the complete setup of git worktrees for the parkboard project.
# It handles everything from bare repo creation to environment configuration.
#
# Usage:
#   ./setup-worktrees.sh [--bare|--adjacent] [--skip-install]
#
# Options:
#   --bare         Use bare repository approach (recommended, default)
#   --adjacent     Use adjacent worktrees approach (simpler)
#   --skip-install Skip npm install (faster for testing)
#   --help         Show this help message
#

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARKBOARD_DIR="/home/ltpt420/repos/parkboard"
REPOS_DIR="/home/ltpt420/repos"
BARE_REPO_DIR="${REPOS_DIR}/parkboard"
WORKTREES_DIR="${REPOS_DIR}/parkboard/.trees"
BACKUP_DIR="${REPOS_DIR}/parkboard-backup-$(date +%Y%m%d-%H%M%S)"

# Default options
USE_BARE=true
SKIP_INSTALL=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --bare)
      USE_BARE=true
      shift
      ;;
    --adjacent)
      USE_BARE=false
      shift
      ;;
    --skip-install)
      SKIP_INSTALL=true
      shift
      ;;
    --help)
      head -n 20 "$0" | grep "^#" | sed 's/^# \?//'
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Run with --help for usage information"
      exit 1
      ;;
  esac
done

# Helper functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_step() {
  echo ""
  echo -e "${CYAN}==>${NC} ${BLUE}$1${NC}"
  echo ""
}

# Check prerequisites
check_prerequisites() {
  log_step "Checking prerequisites"

  if ! command -v git &> /dev/null; then
    log_error "git is not installed"
    exit 1
  fi

  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed"
    exit 1
  fi

  if [ ! -d "$PARKBOARD_DIR" ]; then
    log_error "Parkboard directory not found at $PARKBOARD_DIR"
    exit 1
  fi

  if [ ! -d "$PARKBOARD_DIR/.git" ]; then
    log_error "Parkboard is not a git repository"
    exit 1
  fi

  log_success "All prerequisites met"
}

# Backup current repository
backup_repository() {
  log_step "Backing up current repository"

  if [ -d "$BACKUP_DIR" ]; then
    log_warning "Backup already exists at $BACKUP_DIR"
    read -p "Overwrite? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
      log_error "Backup aborted by user"
      exit 1
    fi
    rm -rf "$BACKUP_DIR"
  fi

  log_info "Creating backup at $BACKUP_DIR"
  cp -r "$PARKBOARD_DIR" "$BACKUP_DIR"
  log_success "Backup created successfully"
}

# Check for uncommitted changes
check_uncommitted_changes() {
  log_step "Checking for uncommitted changes"

  cd "$PARKBOARD_DIR"

  if ! git diff-index --quiet HEAD --; then
    log_warning "You have uncommitted changes in $PARKBOARD_DIR"
    git status --short
    echo ""
    read -p "Stash changes before continuing? (Y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Nn]$ ]]; then
      git stash push -m "Pre-worktree-setup stash $(date +%Y%m%d-%H%M%S)"
      log_success "Changes stashed"
    else
      log_warning "Continuing with uncommitted changes (they will be preserved)"
    fi
  else
    log_success "No uncommitted changes"
  fi
}

# Setup bare repository approach
setup_bare_repository() {
  log_step "Setting up bare repository approach"

  # Create bare clone
  if [ -d "$BARE_REPO_DIR" ]; then
    log_warning "Bare repository already exists at $BARE_REPO_DIR"
    read -p "Remove and recreate? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      rm -rf "$BARE_REPO_DIR"
    else
      log_info "Using existing bare repository"
      return
    fi
  fi

  log_info "Creating bare repository at $BARE_REPO_DIR"
  cd "$REPOS_DIR"

  # Clone bare from existing local repo (faster than remote)
  git clone --bare "$PARKBOARD_DIR" "$BARE_REPO_DIR"

  log_success "Bare repository created"
}

# Create worktrees directory
create_worktrees_directory() {
  log_step "Creating worktrees directory"

  if [ -d "$WORKTREES_DIR" ]; then
    log_warning "Worktrees directory already exists at $WORKTREES_DIR"
    read -p "Continue anyway? (Y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Nn]$ ]]; then
      log_error "Aborted by user"
      exit 1
    fi
  else
    mkdir -p "$WORKTREES_DIR"
    log_success "Worktrees directory created at $WORKTREES_DIR"
  fi
}

# Create a single worktree
create_worktree() {
  local branch_name=$1
  local worktree_name=$2
  local port=$3
  local is_main=$4

  log_info "Creating worktree: $worktree_name (branch: $branch_name)"

  local worktree_path="${WORKTREES_DIR}/${worktree_name}"

  # Check if worktree already exists
  if [ -d "$worktree_path" ]; then
    log_warning "Worktree already exists at $worktree_path"
    return
  fi

  # Create worktree
  if [ "$USE_BARE" = true ]; then
    git -C "$BARE_REPO_DIR" worktree add "$worktree_path" "$branch_name"
  else
    git -C "$PARKBOARD_DIR" worktree add "$worktree_path" "$branch_name"
  fi

  cd "$worktree_path"

  # Install dependencies
  if [ "$SKIP_INSTALL" = false ]; then
    log_info "Installing dependencies in $worktree_name"
    npm install --silent 2>&1 | grep -v "^npm WARN" || true
  else
    log_warning "Skipping npm install for $worktree_name"
  fi

  # Copy .env.local if it exists
  if [ -f "$PARKBOARD_DIR/.env.local" ]; then
    cp "$PARKBOARD_DIR/.env.local" .env.local
    log_info "Copied .env.local to $worktree_name"
  else
    log_warning ".env.local not found in $PARKBOARD_DIR"
  fi

  # Create port-specific dev script in package.json
  if command -v jq &> /dev/null; then
    # Add custom dev script for this port
    jq ".scripts[\"dev:$port\"] = \"next dev -p $port\"" package.json > package.json.tmp && mv package.json.tmp package.json
    log_info "Added dev:$port script to package.json"
  fi

  log_success "Worktree $worktree_name created successfully"
}

# Create all standard worktrees
create_all_worktrees() {
  log_step "Creating worktrees for all branches"

  # Get list of branches
  cd "$PARKBOARD_DIR"
  local branches=$(git branch -a | grep -v "HEAD" | sed 's/remotes\/origin\///' | sed 's/\*//' | sed 's/^[[:space:]]*//' | sort -u)

  log_info "Available branches:"
  echo "$branches"
  echo ""

  # Create worktrees for key branches
  create_worktree "main" "main" 3000 true

  if echo "$branches" | grep -q "feature/slot-edit"; then
    create_worktree "feature/slot-edit" "feature-slot-edit" 3001 false
  fi

  if echo "$branches" | grep -q "fix/sign-out-issues"; then
    create_worktree "fix/sign-out-issues" "fix-sign-out-issues" 3002 false
  fi

  # Create a development worktree (copy of main)
  create_worktree "main" "dev" 3003 false

  log_success "All worktrees created"
}

# Create status script
create_status_script() {
  log_step "Creating worktree status script"

  local status_script="${WORKTREES_DIR}/worktree-status.sh"

  cat > "$status_script" << 'EOF'
#!/bin/bash
#
# Parkboard Worktree Status Checker
# Shows status of all worktrees
#

CYAN='\033[0;36m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${CYAN}Parkboard Worktrees Status${NC}"
echo "=========================="
echo ""

git worktree list | while read -r line; do
  path=$(echo "$line" | awk '{print $1}')
  branch=$(echo "$line" | awk '{print $2}' | tr -d '[]')

  if [ ! -d "$path" ]; then
    continue
  fi

  cd "$path"

  # Get worktree name
  name=$(basename "$path")

  # Check for uncommitted changes
  if ! git diff-index --quiet HEAD -- 2>/dev/null; then
    status="${YELLOW}modified${NC}"
  else
    status="${GREEN}clean${NC}"
  fi

  # Check for untracked files
  if [ -n "$(git ls-files --others --exclude-standard 2>/dev/null)" ]; then
    status="${YELLOW}untracked${NC}"
  fi

  # Check if dev server might be running
  port=""
  if [ -f "package.json" ]; then
    port=$(grep -o "dev:[0-9]*" package.json | head -1 | cut -d: -f2)
  fi

  running=""
  if [ -n "$port" ] && lsof -ti:$port >/dev/null 2>&1; then
    running=" ${GREEN}[RUNNING:$port]${NC}"
  fi

  echo -e "${CYAN}$name${NC} ($branch) - $status$running"
  echo "  Path: $path"

  # Show recent commits
  recent=$(git log -1 --oneline 2>/dev/null)
  if [ -n "$recent" ]; then
    echo "  Recent: $recent"
  fi

  echo ""
done
EOF

  chmod +x "$status_script"
  log_success "Status script created at $status_script"
}

# Create cleanup script
create_cleanup_script() {
  log_step "Creating worktree cleanup script"

  local cleanup_script="${WORKTREES_DIR}/cleanup-worktree.sh"

  cat > "$cleanup_script" << 'EOF'
#!/bin/bash
#
# Parkboard Worktree Cleanup
# Safely removes a worktree
#

if [ -z "$1" ]; then
  echo "Usage: ./cleanup-worktree.sh <worktree-name>"
  echo ""
  echo "Available worktrees:"
  git worktree list | awk '{print "  -", $1}'
  exit 1
fi

WORKTREE_NAME=$1
WORKTREES_DIR="/home/ltpt420/repos/parkboard/.trees"
WORKTREE_PATH="${WORKTREES_DIR}/${WORKTREE_NAME}"

if [ ! -d "$WORKTREE_PATH" ]; then
  echo "Error: Worktree not found at $WORKTREE_PATH"
  exit 1
fi

echo "This will remove: $WORKTREE_PATH"
read -p "Are you sure? (y/N) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
  git worktree remove "$WORKTREE_PATH" --force
  echo "Worktree removed successfully"
else
  echo "Aborted"
fi
EOF

  chmod +x "$cleanup_script"
  log_success "Cleanup script created at $cleanup_script"
}

# Create summary document
create_summary_document() {
  log_step "Creating setup summary"

  local summary_file="${WORKTREES_DIR}/SETUP_SUMMARY.md"

  cat > "$summary_file" << EOF
# Parkboard Worktrees Setup Summary

**Setup Date:** $(date +"%Y-%m-%d %H:%M:%S")
**Setup Method:** $([ "$USE_BARE" = true ] && echo "Bare Repository" || echo "Adjacent Worktrees")

---

## Directory Structure

\`\`\`
$(tree -L 2 -d "$WORKTREES_DIR" 2>/dev/null || find "$WORKTREES_DIR" -maxdepth 2 -type d)
\`\`\`

---

## Worktrees Created

\`\`\`
$(git worktree list)
\`\`\`

---

## Quick Commands

### Check Status of All Worktrees
\`\`\`bash
cd $WORKTREES_DIR
./worktree-status.sh
\`\`\`

### Start Development Servers

\`\`\`bash
# Main branch (port 3000)
cd $WORKTREES_DIR/main
npm run dev

# Feature branch (port 3001)
cd $WORKTREES_DIR/feature-slot-edit
npm run dev:3001

# Fix branch (port 3002)
cd $WORKTREES_DIR/fix-sign-out-issues
npm run dev:3002

# Dev/testing (port 3003)
cd $WORKTREES_DIR/dev
npm run dev:3003
\`\`\`

### Remove a Worktree

\`\`\`bash
cd $WORKTREES_DIR
./cleanup-worktree.sh <worktree-name>
\`\`\`

---

## Port Assignments

| Worktree | Branch | Port |
|----------|--------|------|
| main | main | 3000 |
| feature-slot-edit | feature/slot-edit | 3001 |
| fix-sign-out-issues | fix/sign-out-issues | 3002 |
| dev | main | 3003 |

---

## Next Steps

1. Navigate to a worktree: \`cd $WORKTREES_DIR/main\`
2. Start dev server: \`npm run dev\`
3. Make changes and commit as normal
4. Switch contexts by simply \`cd\`-ing to another worktree

---

## Troubleshooting

### Port Already in Use
\`\`\`bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9
\`\`\`

### Worktree Out of Sync
\`\`\`bash
cd $WORKTREES_DIR/<worktree-name>
git fetch --all
git pull
npm install
\`\`\`

### Rebuild Everything
\`\`\`bash
cd $WORKTREES_DIR/<worktree-name>
rm -rf node_modules .next
npm install
npm run build
\`\`\`

---

## Backup Location

Original repository backed up to:
\`$BACKUP_DIR\`

---

## Documentation

See \`$PARKBOARD_DIR/docs/GIT_WORKTREE_IMPLEMENTATION_GUIDE.md\` for complete documentation.
EOF

  log_success "Summary document created at $summary_file"
}

# Print final instructions
print_final_instructions() {
  log_step "Setup Complete!"

  echo -e "${GREEN}╔═══════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║                                                           ║${NC}"
  echo -e "${GREEN}║  Parkboard Worktrees Setup Complete!                      ║${NC}"
  echo -e "${GREEN}║                                                           ║${NC}"
  echo -e "${GREEN}╚═══════════════════════════════════════════════════════════╝${NC}"
  echo ""
  echo -e "${CYAN}Worktrees Location:${NC} $WORKTREES_DIR"
  echo -e "${CYAN}Backup Location:${NC} $BACKUP_DIR"
  echo ""
  echo -e "${YELLOW}Quick Start:${NC}"
  echo ""
  echo -e "  ${BLUE}1.${NC} Check status:"
  echo -e "     ${GREEN}cd $WORKTREES_DIR${NC}"
  echo -e "     ${GREEN}./worktree-status.sh${NC}"
  echo ""
  echo -e "  ${BLUE}2.${NC} Start development:"
  echo -e "     ${GREEN}cd $WORKTREES_DIR/main${NC}"
  echo -e "     ${GREEN}npm run dev${NC}"
  echo ""
  echo -e "  ${BLUE}3.${NC} Work on feature:"
  echo -e "     ${GREEN}cd $WORKTREES_DIR/feature-slot-edit${NC}"
  echo -e "     ${GREEN}npm run dev:3001${NC}"
  echo ""
  echo -e "${YELLOW}Documentation:${NC}"
  echo -e "  - Setup summary: ${GREEN}$WORKTREES_DIR/SETUP_SUMMARY.md${NC}"
  echo -e "  - Full guide: ${GREEN}$PARKBOARD_DIR/docs/GIT_WORKTREE_IMPLEMENTATION_GUIDE.md${NC}"
  echo ""
}

# Main execution
main() {
  echo -e "${CYAN}"
  echo "╔═══════════════════════════════════════════════════════════╗"
  echo "║                                                           ║"
  echo "║  Parkboard Git Worktree Automated Setup                  ║"
  echo "║                                                           ║"
  echo "╚═══════════════════════════════════════════════════════════╝"
  echo -e "${NC}"
  echo ""
  echo -e "Setup Method: $([ "$USE_BARE" = true ] && echo "${GREEN}Bare Repository${NC}" || echo "${BLUE}Adjacent Worktrees${NC}")"
  echo -e "Install Dependencies: $([ "$SKIP_INSTALL" = false ] && echo "${GREEN}Yes${NC}" || echo "${YELLOW}No${NC}")"
  echo ""

  read -p "Continue? (Y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Nn]$ ]]; then
    log_error "Aborted by user"
    exit 1
  fi

  check_prerequisites
  check_uncommitted_changes
  backup_repository

  if [ "$USE_BARE" = true ]; then
    setup_bare_repository
  fi

  create_worktrees_directory
  create_all_worktrees
  create_status_script
  create_cleanup_script
  create_summary_document
  print_final_instructions
}

# Run main function
main
