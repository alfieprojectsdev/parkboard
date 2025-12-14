# ParkBoard Screenshot Generation

This document describes the automated screenshot capture script for portfolio and documentation purposes.

## Quick Start

```bash
# Ensure the dev server is running
npm run dev

# In another terminal, capture screenshots
npm run screenshots
```

Screenshots will be saved to `docs/screenshots/` directory with standardized naming and viewport dimensions (1280x720).

## What Gets Captured

The script automatically captures these key user workflows:

| Screenshot | File | Description |
|-----------|------|-------------|
| Login Page | `01-login.png` | Unauthenticated login form with test credentials information |
| Registration Page | `02-register.png` | User signup form with community code entry |
| Dashboard | `03-dashboard.png` | Slots listing view (authenticated user) |
| Create Slot Form | `04-create-slot.png` | Form for listing a new parking slot |
| Slot Details | `05-slot-detail.png` | Individual parking slot details (captured if slots exist) |

## Features

### Consistent Styling
- Fixed viewport: 1280x720 pixels (desktop HD)
- Light color scheme for professional appearance
- Full-page captures for complete context
- Automatic directory creation if needed

### Smart Waiting
- Network idle detection before capturing
- 500ms buffer for animations to settle
- Proper async handling for form submissions
- Handles authentication flow automatically

### Test Data Integration
The script uses pre-seeded test credentials:
- Community Code: `LMR`
- Email: `user1@parkboard.test`
- Password: `test123456`

These credentials must exist in your database for the script to work (typically pre-seeded for development).

## Usage

### Basic Usage

```bash
npm run screenshots
```

### Custom Base URL

If your dev server runs on a different port:

```bash
BASE_URL=http://localhost:3001 npm run screenshots
```

### Production Screenshots

```bash
BASE_URL=https://parkboard.app npm run screenshots
```

## Requirements

- Development server must be running (`npm run dev`)
- Playwright (already installed as dev dependency)
- Node.js 18+ (same as project requirement)
- Write access to `docs/screenshots/` directory

## Troubleshooting

### Connection Refused Error

```
Error: ECONNREFUSED
Troubleshooting: The development server might not be running.
```

**Solution:** Start the dev server in another terminal:
```bash
npm run dev
```

### Screenshots Directory Permission Denied

```
Error: EACCES: permission denied, mkdir
```

**Solution:** Check directory permissions:
```bash
# Make docs writable
chmod -R u+w docs/

# Or fix ownership (if needed)
sudo chown -R $USER:$USER docs/
```

### No Slot Details Captured

If you see: `⚠ No slots available to capture detail page`

This is expected behavior. The script gracefully handles cases where no slots exist. To capture slot details:

1. Create a parking slot via the UI (`/LMR/slots/new`)
2. Run the script again

## Script Implementation Details

Located at: `scripts/capture-screenshots.ts`

### Key Functions

| Function | Purpose |
|----------|---------|
| `waitForLoad()` | Ensures page is fully rendered (network idle + delay) |
| `captureScreenshot()` | Takes screenshot with consistent naming and logging |
| `captureScreenshots()` | Main orchestration - captures all workflows in sequence |

### Error Handling

The script includes comprehensive error handling:
- Detects connection failures and provides helpful hints
- Gracefully handles missing slot data
- Properly closes browser resources even on error
- Clear exit codes for CI/CD integration

### Browser Configuration

```typescript
// Consistent viewport for portfolio use
viewport: { width: 1280, height: 720 }

// Light theme for professional appearance
colorScheme: 'light'

// Full-page captures for documentation
fullPage: true
```

## Integration with Documentation

Screenshots are formatted for embedding in portfolio, documentation, or blog posts:

### Markdown Embedding

```markdown
### User Login Flow

![ParkBoard Login Page](./docs/screenshots/01-login.png)

The login page accepts community code, email, and password.
Test credentials are displayed for demo purposes.
```

### Presentation Use

Screenshots are at standard desktop resolution (1280x720) suitable for:
- Portfolio websites
- Case studies
- Tutorial documentation
- Product demos
- Pitch decks

## Performance

Expected execution time: **< 30 seconds** (excluding dev server startup)

Breakdown:
- Page navigation: ~5s
- Form interactions: ~8s
- Network idle waits: ~10s
- Screenshot capture: ~3s
- Cleanup: ~2s

## CI/CD Integration

The script can be integrated into CI/CD pipelines:

```bash
#!/bin/bash
# In your CI workflow

# Start dev server in background
npm run dev &
DEV_PID=$!

# Wait for server to be ready
sleep 5

# Capture screenshots
npm run screenshots || exit 1

# Kill dev server
kill $DEV_PID

# Upload screenshots to storage or commit
git add docs/screenshots/
git commit -m "chore: update portfolio screenshots"
```

## Notes

- Screenshots use the current application state - no mock data
- Test credentials in `01-login.png` are intentionally visible for portfolio context
- The script automatically handles authentication flow
- Screenshots update each time the script runs
- Images are versioned in git (consider .gitignore if regenerating frequently)

## Related Documentation

- **Authentication**: See `/CLAUDE.md` for auth setup details
- **E2E Testing**: See `playwright.config.ts` for test configuration
- **Development Setup**: See `CLAUDE.md` for environment variables

## Script Usage in Tests

The screenshot script can be used alongside E2E tests:

```bash
# Run E2E tests with visible browser
npm run test:e2e:headed

# In another terminal
npm run screenshots
```

This helps capture edge cases or specific user flows not covered by standard testing.
