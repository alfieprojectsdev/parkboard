#!/bin/bash
# Simple migration runner for development
# Usage: ./run_migration.sh migration_file.sql

if [ -z "$1" ]; then
    echo "Usage: $0 <migration_file.sql>"
    echo "Example: $0 migrations/001_add_slot_ownership.sql"
    exit 1
fi

MIGRATION_FILE="$1"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "Error: Migration file '$MIGRATION_FILE' not found"
    exit 1
fi

echo "Running migration: $MIGRATION_FILE"
echo "Make sure to:"
echo "1. Backup your database first"
echo "2. Test on development database"
echo "3. Review the migration file"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "Copy and paste this into Supabase SQL Editor:"
    echo "----------------------------------------"
    cat "$MIGRATION_FILE"
    echo "----------------------------------------"
else
    echo "Migration cancelled"
fi
