#!/bin/bash
# =============================================================================
# Script: export_for_claude.sh
# Description: Optimized export for Claude/Opus context upload
# - Focuses on CORE source files only
# - Excludes test files and verbose configs
# - Prioritizes critical business logic
# =============================================================================

TIMESTAMP=$(date '+%Y-%m-%d_%H%M%S')
OUTPUT_FILE="parkboard_claude_context_${TIMESTAMP}.md"

> "$OUTPUT_FILE"

# Minimal exclusions - only build artifacts
EXCLUDE_DIRS="node_modules|\.next|\.git|build|dist|coverage|\.turbo|\.vercel|\.swc|out|\.nuxt|\.output|\.cache|_archived|_deprecated|archive"

# Function to redact env files
redact_env_file() {
    sed -E 's/(^[A-Z_][A-Z0-9_]*=).*/\1***REDACTED***/' "$1"
}

# Function to get syntax highlighting
get_syntax_lang() {
    case "$1" in
        *.css|*.scss) echo "css" ;;
        *.sql) echo "sql" ;;
        *.json) echo "json" ;;
        *.md) echo "markdown" ;;
        *.sh) echo "bash" ;;
        *.env*) echo "bash" ;;
        *) echo "typescript" ;;
    esac
}

# Header
cat << 'EOF' >> "$OUTPUT_FILE"
# ParkBoard - Core Context for Claude/Opus

## Project Overview
**ParkBoard** is a parking slot marketplace for residential condominiums. It enables P2P parking slot rental with a focus on migrating users from Viber to a proper web platform.

### Key Features:
- 🚗 Slot ownership & marketplace listing
- 📅 Complex availability scheduling (recurring patterns, blackout dates)
- ⚡ "Available NOW" quick posting (Viber-style)
- 🔍 Fast search with location tags (solves "P6 confusion")
- 💰 Zero-PM booking flow (all info visible upfront)
- ✅ Viber member trust signals

### Tech Stack:
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Backend:** Next.js API routes (server-side)
- **Database:** Supabase (PostgreSQL) with RLS
- **Auth:** Supabase Auth

---

## Core Database Schema

EOF

echo "🗄️  Exporting database schema..."

# 1. CORE SCHEMA ONLY
if [[ -f "db/schema.sql" ]]; then
    echo '```sql' >> "$OUTPUT_FILE"
    echo "-- db/schema.sql (Core Schema)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "db/schema.sql" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 2. CRITICAL MIGRATIONS ONLY
echo "## Database Migrations" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

CRITICAL_MIGRATIONS=(
    "db/migrations/007_marketplace_model.sql"
    "db/migrations/viber-migration-updates.sql"
)

for migration in "${CRITICAL_MIGRATIONS[@]}"; do
    if [[ -f "$migration" ]]; then
        echo "📄 Including: $migration"
        echo '```sql' >> "$OUTPUT_FILE"
        echo "-- $migration" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$migration" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo '```' >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# 3. CORE APPLICATION CODE
echo "## Application Code" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "📂 Exporting core app files..."

# PRIORITY: Critical business logic files
CORE_PATHS=(
    "app/api/bookings/route.ts"
    "app/api/slots/route.ts"
    "app/marketplace/page.tsx"
    "app/marketplace/[slotId]/page.tsx"
    "app/owner/page.tsx"
    "app/owner/setup/page.tsx"
    "app/onboarding/page.tsx"
    "components/auth/AuthWrapper.tsx"
    "lib/supabase.ts"
    "lib/constants.ts"
)

for file in "${CORE_PATHS[@]}"; do
    if [[ -f "$file" ]]; then
        echo "✅ Including: $file"
        lang=$(get_syntax_lang "$file")
        echo "\`\`\`$lang" >> "$OUTPUT_FILE"
        echo "// $file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$file" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo '```' >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# 4. ALL OTHER APP/COMPONENTS/LIB FILES (excluding tests)
find ./app ./components ./lib -type f \( -name "*.ts" -o -name "*.tsx" \) \
    ! -regex ".*\($EXCLUDE_DIRS\).*" \
    ! -name "*.test.*" \
    ! -name "*.spec.*" 2>/dev/null | sort | while read -r file; do

    # Skip if already included in CORE_PATHS
    skip=false
    for core in "${CORE_PATHS[@]}"; do
        if [[ "$file" == "./$core" ]]; then
            skip=true
            break
        fi
    done

    if [[ "$skip" == true ]]; then
        continue
    fi

    echo "📄 Including: $file"
    lang=$(get_syntax_lang "$file")
    echo "\`\`\`$lang" >> "$OUTPUT_FILE"
    echo "// $file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# 5. ESSENTIAL CONFIG ONLY
echo "## Configuration" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

echo "⚙️  Exporting configs..."

ESSENTIAL_CONFIGS=(
    "next.config.mjs"
    "tailwind.config.ts"
    "tsconfig.json"
    "components.json"
    "CLAUDE.md"
)

for cfg in "${ESSENTIAL_CONFIGS[@]}"; do
    if [[ -f "$cfg" ]]; then
        echo "🔧 Including: $cfg"
        lang=$(get_syntax_lang "$cfg")
        echo "\`\`\`$lang" >> "$OUTPUT_FILE"
        echo "// $cfg" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$cfg" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo '```' >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# 6. ENV TEMPLATE (redacted)
echo "## Environment Variables" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [[ -f ".env.local" ]] || [[ -f ".env" ]]; then
    env_file=$(ls .env.local .env 2>/dev/null | head -1)
    echo "🔐 Including env template (redacted)"
    echo '```bash' >> "$OUTPUT_FILE"
    echo "// Environment variables (values redacted)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    redact_env_file "$env_file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# 7. PACKAGE.JSON (minimal)
echo "## Dependencies" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

if [[ -f "package.json" ]]; then
    echo "📦 Including package.json (core fields only)"
    echo '```json' >> "$OUTPUT_FILE"
    echo "// package.json" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"

    if command -v jq >/dev/null 2>&1; then
        jq '{name, version, scripts: .scripts | {dev, build, start, test}, dependencies, devDependencies: (.devDependencies | with_entries(select(.key | test("^(@types|typescript|eslint|tailwind)"))))}' package.json >> "$OUTPUT_FILE"
    else
        cat package.json >> "$OUTPUT_FILE"
    fi

    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

# Summary
cat << EOF >> "$OUTPUT_FILE"

---

## Context Summary

**Generated:** $(date)
**Size:** $(du -h "$OUTPUT_FILE" | cut -f1)

### Included:
- ✅ Complete database schema + critical migrations
- ✅ All core application code (app, components, lib)
- ✅ Essential configuration files
- ✅ Business logic and API routes
- ✅ Viber migration features

### Optimizations for Claude:
- 🚫 No test files
- 🚫 No build artifacts
- 🚫 No verbose documentation
- 🚫 No backup/deprecated files
- ✅ Only production source code

**This snapshot contains everything needed to understand and modify the ParkBoard codebase.**

EOF

echo ""
echo "✅ Claude-optimized export complete!"
echo "📄 Output: $OUTPUT_FILE"
echo "📊 Size: $(du -h "$OUTPUT_FILE" | cut -f1)"
echo ""
echo "🎯 Optimizations:"
echo "   ✅ Core source code only"
echo "   ✅ Critical migrations included"
echo "   ✅ No test/build files"
echo "   ✅ Essential configs only"
echo ""
echo "🚀 Ready to upload to Claude/Opus project context!"
