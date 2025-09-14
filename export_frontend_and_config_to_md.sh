#!/bin/bash

# =============================================================================
# Script: export_project_code_only.sh
# Description: Export ONLY your deliberate project code, excluding all
# auto-generated, boilerplate, and build artifacts
# =============================================================================

OUTPUT_FILE="project_code_only.md"

# Clear previous output
> "$OUTPUT_FILE"

# Comprehensive exclusions for build artifacts and auto-generated code
EXCLUDE_DIRS="node_modules|\.next|\.git|build|dist|coverage|\.turbo|\.vercel|\.swc|out|\.nuxt|\.output"

# Also exclude common auto-generated files
EXCLUDE_FILES="next-env\.d\.ts|\.d\.ts$"

echo "## Your Project Code (JS/JSX/TS/TSX)" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Focus on App Router structure + your components
find ./app ./components ./lib ./utils ./hooks ./contexts ./types -type f \( -name "*.js" -o -name "*.jsx" -o -name "*.ts" -o -name "*.tsx" \) ! -regex ".*\($EXCLUDE_DIRS\).*" ! -regex ".*\($EXCLUDE_FILES\).*" 2>/dev/null | sort | while read -r file; do
    # Skip if file is likely auto-generated (check for common patterns)
    if grep -q "This file was automatically generated" "$file" 2>/dev/null || \
       grep -q "@generated" "$file" 2>/dev/null || \
       grep -q "DO NOT EDIT" "$file" 2>/dev/null; then
        continue
    fi
    
    echo '```typescript' >> "$OUTPUT_FILE"
    echo "// $file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    cat "$file" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
done

# Your deliberate config files (the ones you actually modified)
echo "## Your Configuration Files" >> "$OUTPUT_FILE"
echo "" >> "$OUTPUT_FILE"

# Only include configs you likely customized
USER_CONFIGS=("next.config.js" "next.config.mjs" "tailwind.config.js" "tailwind.config.ts" "postcss.config.js" ".env.local" ".env.example")

for cfg in "${USER_CONFIGS[@]}"; do
    if [[ -f $cfg ]]; then
        echo '```javascript' >> "$OUTPUT_FILE"
        echo "// $cfg" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        cat "$cfg" >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
        echo '```' >> "$OUTPUT_FILE"
        echo "" >> "$OUTPUT_FILE"
    fi
done

# Package.json (just the important parts)
if [[ -f package.json ]]; then
    echo "## Package Dependencies" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    echo '```json' >> "$OUTPUT_FILE"
    echo "// package.json (dependencies only)" >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
    jq '{dependencies, devDependencies, scripts}' package.json 2>/dev/null || cat package.json
    echo "" >> "$OUTPUT_FILE"
    echo '```' >> "$OUTPUT_FILE"
    echo "" >> "$OUTPUT_FILE"
fi

echo "Export complete: $OUTPUT_FILE"
echo "File size: $(du -h "$OUTPUT_FILE" | cut -f1)"