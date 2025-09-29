#!/usr/bin/env bash
# stage_and_commit.sh
# Interactive helper for staging and committing ParkBoard changes
# Updated to match current project structure from project_code_only.md

set -euo pipefail

echo "===> Checking current branch and status"
git status
echo
read -r -p "Continue with staging? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Stage API routes ---
echo "===> Staging API routes"
if [[ -d "app/api" ]]; then
    git add app/api/
    echo "✓ Added app/api/"
fi

# --- Stage app pages ---
echo "===> Staging app pages"
for page_dir in bookings dashboard login slots test; do
    if [[ -d "app/$page_dir" ]]; then
        git add app/$page_dir/
        echo "✓ Added app/$page_dir/"
    fi
done

# Add root app files
for app_file in layout.tsx page.tsx globals.css; do
    if [[ -f "app/$app_file" ]]; then
        git add app/$app_file
        echo "✓ Added app/$app_file"
    fi
done

git status
echo
read -r -p "App files staged. Continue to components? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Stage components ---
echo "===> Staging components"
if [[ -d "components" ]]; then
    # Add all .tsx files in components root
    git add components/*.tsx 2>/dev/null || echo "No .tsx files in components root"
    
    # Add UI components
    if [[ -d "components/ui" ]]; then
        git add components/ui/
        echo "✓ Added components/ui/"
    fi
fi

git status
echo
read -r -p "Components staged. Continue to lib and config? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Stage lib and config files ---
echo "===> Staging lib and config files"
for lib_file in lib/supabase.ts lib/supabaseServer.ts lib/utils.ts lib/getSlotIcon.tsx; do
    if [[ -f "$lib_file" ]]; then
        git add "$lib_file"
        echo "✓ Added $lib_file"
    fi
done

# Config files
for config_file in components.json tailwind.config.js next.config.js tsconfig.json postcss.config.js; do
    if [[ -f "$config_file" ]]; then
        git add "$config_file"
        echo "✓ Added $config_file"
    fi
done

# Package files
for pkg_file in package.json package-lock.json; do
    if [[ -f "$pkg_file" ]]; then
        git add "$pkg_file"
        echo "✓ Added $pkg_file"
    fi
done

git status
echo
read -r -p "Lib/config staged. Continue to docs and db? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Stage docs ---
echo "===> Staging docs"
if [[ -d "docs" ]]; then
    git add docs/
    echo "✓ Added docs/"
fi

# --- Stage db ---
echo "===> Staging database files"
if [[ -d "db" ]]; then
    git add db/
    echo "✓ Added db/"
fi

git status
echo
read -r -p "Docs and db staged. Continue to other files? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Stage other project files ---
echo "===> Staging other project files"
for other_file in .env.local.example .gitignore README.md export_frontend_and_config_to_md.sh; do
    if [[ -f "$other_file" ]]; then
        git add "$other_file"
        echo "✓ Added $other_file"
    fi
done

# GitHub files
if [[ -d ".github" ]]; then
    git add .github/
    echo "✓ Added .github/"
fi

git status
echo
read -r -p "All files staged. Ready to commit? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Commit with descriptive message ---
echo "===> Committing changes"
echo "Suggested commit messages:"
echo "1. 'Complete ParkBoard MVP: TSX components, booking flow, admin panel, and database setup'"
echo "2. 'Add complete Next.js 15 app with Supabase backend and booking system'"
echo "3. 'Implement full parking booking system with authentication and admin features'"
echo "4. Custom message"
echo

read -r -p "Choose option (1-4) or press Enter for option 1: " choice
case "${choice:-1}" in
    1)
        commit_msg="Complete ParkBoard MVP: TSX components, booking flow, admin panel, and database setup"
        ;;
    2)
        commit_msg="Add complete Next.js 15 app with Supabase backend and booking system"
        ;;
    3)
        commit_msg="Implement full parking booking system with authentication and admin features"
        ;;
    4)
        read -r -p "Enter custom commit message: " commit_msg
        ;;
    *)
        commit_msg="Complete ParkBoard MVP: TSX components, booking flow, admin panel, and database setup"
        ;;
esac

git commit -m "$commit_msg"
echo "✓ Committed with message: $commit_msg"

echo
read -r -p "Push to remote? [y/N] " ans
[[ "$ans" =~ ^[Yy]$ ]] || exit 0

# --- Push ---
echo "===> Pushing to remote"
git push
echo "✅ Successfully pushed to remote"

echo
echo "🎉 All done! Your ParkBoard changes have been committed and pushed."