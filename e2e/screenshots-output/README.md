# Parkboard Screenshots

Generated screenshots for documentation and marketing purposes.

**Last Generated:** [DATE]

**Base URL:** [URL]

---

## Mobile Screenshots (375x667)

### 01. Landing Page
![Landing Page](mobile/01-landing-page.png)

### 02. Test Accounts Page
![Test Accounts](mobile/02-test-accounts.png)

### 03. Browse Slots (Guest)
![Browse Slots Guest](mobile/03-slots-guest.png)

### 04. Slot Detail Page
![Slot Detail](mobile/04-slot-detail.png)

### 05. Browse Slots (Authenticated)
![Browse Slots Auth](mobile/05-slots-authenticated.png)

### 06. List Slot Form (Empty)
![List Slot Empty](mobile/06-list-slot-form-empty.png)

### 07. List Slot Form (Filled)
![List Slot Filled](mobile/07-list-slot-form-filled.png)

---

## Tablet Screenshots (768x1024)

### 01. Landing Page
![Landing Page](tablet/01-landing-page.png)

### 02. Test Accounts Page
![Test Accounts](tablet/02-test-accounts.png)

### 03. Browse Slots (Guest)
![Browse Slots Guest](tablet/03-slots-guest.png)

### 04. Slot Detail Page
![Slot Detail](tablet/04-slot-detail.png)

### 05. Browse Slots (Authenticated)
![Browse Slots Auth](tablet/05-slots-authenticated.png)

### 06. List Slot Form (Empty)
![List Slot Empty](tablet/06-list-slot-form-empty.png)

### 07. List Slot Form (Filled)
![List Slot Filled](tablet/07-list-slot-form-filled.png)

---

## Desktop Screenshots (1920x1080)

### 01. Landing Page
![Landing Page](desktop/01-landing-page.png)

### 02. Test Accounts Page
![Test Accounts](desktop/02-test-accounts.png)

### 03. Browse Slots (Guest)
![Browse Slots Guest](desktop/03-slots-guest.png)

### 04. Slot Detail Page
![Slot Detail](desktop/04-slot-detail.png)

### 05. Browse Slots (Authenticated)
![Browse Slots Auth](desktop/05-slots-authenticated.png)

### 06. List Slot Form (Empty)
![List Slot Empty](desktop/06-list-slot-form-empty.png)

### 07. List Slot Form (Filled)
![List Slot Filled](desktop/07-list-slot-form-filled.png)

---

## Usage

To regenerate screenshots:

```bash
# Local development server
npx playwright test e2e/screenshots/

# Production site
PLAYWRIGHT_BASE_URL=https://parkboard.app npx playwright test e2e/screenshots/

# Specific viewport
npx playwright test e2e/screenshots/ --grep "mobile viewport"
```

---

**Note:** Screenshots are captured with full-page scroll, so heights may vary.
