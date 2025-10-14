# Invoice Module Toggle Feature

## Overview

The Invoice module is now **optional** and disabled by default. This provides a cleaner, more minimalistic interface for new users who may not need invoicing functionality right away.

## How It Works

### Default State
- **Invoice module is DISABLED by default** (`invoice_module_enabled = 0`)
- Invoices tab is **hidden** from the navigation
- Users see a clean interface with just: Task Manager, Calendar, and Task History

### Enabling the Invoice Module

Users can enable invoicing through Settings:

1. Click the **Settings** icon in the top-right corner
2. Scroll to the **"Feature Modules"** section
3. Toggle **"Invoice Module"** ON
4. Click **"Save Settings"**
5. The **Invoices tab** will immediately appear in the navigation

### Disabling the Invoice Module

1. Click the **Settings** icon
2. Toggle **"Invoice Module"** OFF
3. Click **"Save Settings"**
4. The **Invoices tab** will be hidden
5. If you were on the Invoices tab, you'll be redirected to Task Manager

## Database Changes

### Settings Table Update

Added a new field to the `settings` table:

```sql
invoice_module_enabled INTEGER DEFAULT 0
```

**Migration File:** `cloudflare-workers/migrations/add-invoice-module-toggle.sql`

To add this field to existing databases:

```bash
wrangler d1 execute YOUR_DATABASE --file=./migrations/add-invoice-module-toggle.sql
```

## Frontend Implementation

### Updated Components

#### 1. SimpleSettings.tsx
- Added "Feature Modules" section
- Added Invoice Module toggle with description
- Saves `invoice_module_enabled` field
- Triggers callback to refresh module state

#### 2. TabNavigation.tsx
- Added `showInvoices` prop (default: `false`)
- Conditionally renders Invoices tab based on prop
- Maintains responsive layout

#### 3. App.tsx
- Loads user settings on mount
- Tracks `invoiceModuleEnabled` state
- Passes `showInvoices` to TabNavigation
- Handles tab redirection when module is disabled
- Refreshes settings after toggle

#### 4. database.types.ts
- Added `invoice_module_enabled: boolean` to settings types

## Backend Requirements

Update your settings API endpoint to handle the new field:

### GET `/api/settings`

**Response should include:**
```json
{
  "default_email": "user@example.com",
  "invoice_module_enabled": 0,
  ...
}
```

### PATCH `/api/settings`

**Request body should accept:**
```json
{
  "invoice_module_enabled": 1
}
```

**SQL Update:**
```sql
UPDATE settings
SET invoice_module_enabled = ?,
    updated_at = datetime('now')
WHERE user_id = ?
```

## User Experience

### First-Time Users
1. Sign up and complete onboarding
2. See clean interface with 3 tabs
3. Focus on task management first
4. Enable invoicing when ready to bill clients

### Enabling Invoices
1. User enables Invoice Module in Settings
2. Invoices tab appears instantly
3. User can start creating invoices
4. All invoice features are fully functional

### Disabling Invoices
1. User disables Invoice Module
2. Tab disappears from navigation
3. Auto-redirect if currently viewing invoices
4. Invoice data is preserved in database
5. Can re-enable anytime without data loss

## Benefits

✅ **Minimalistic by Default** - New users see a simpler interface
✅ **Progressive Disclosure** - Advanced features revealed when needed
✅ **User Choice** - Let users decide when they're ready for invoicing
✅ **No Data Loss** - Disabling hides the UI but preserves all data
✅ **Instant Toggle** - Changes take effect immediately
✅ **Clean Architecture** - Feature flag pattern for future modules

## Testing Checklist

- [ ] Default: Invoice tab is hidden for new users
- [ ] Enable: Toggle ON in settings, tab appears
- [ ] Disable: Toggle OFF in settings, tab disappears
- [ ] Redirect: Disable while on Invoices tab, redirected to Manager
- [ ] Persistence: Refresh page, setting is maintained
- [ ] Re-enable: Toggle back ON, all invoice data is intact
- [ ] Settings API: Save and load `invoice_module_enabled` correctly

## Future: More Toggleable Modules

This pattern can be extended for other optional features:

```sql
-- Future feature toggles
time_tracking_module_enabled INTEGER DEFAULT 1,
reports_module_enabled INTEGER DEFAULT 0,
client_portal_enabled INTEGER DEFAULT 0,
integrations_module_enabled INTEGER DEFAULT 1
```

Each module can be independently enabled/disabled through Settings, giving users full control over their interface complexity.

## Migration Steps

### For New Installations
The field is already in `schema.sql` with `DEFAULT 0` - no action needed.

### For Existing Databases
Run the migration:

```bash
# Add the column
wrangler d1 execute YOUR_DATABASE --file=./migrations/add-invoice-module-toggle.sql

# Verify
wrangler d1 execute YOUR_DATABASE --command="SELECT invoice_module_enabled FROM settings LIMIT 5;"
```

### Backend API Update
1. Update GET `/api/settings` to return `invoice_module_enabled`
2. Update PATCH `/api/settings` to accept and save `invoice_module_enabled`
3. Default to `0` (disabled) for new users

## Summary

The Invoice Module toggle provides:
- ✅ Opt-in invoicing functionality
- ✅ Cleaner default interface
- ✅ User control over features
- ✅ No breaking changes to existing functionality
- ✅ Foundation for future feature toggles

Users can now start with a simple task manager and enable invoicing when they're ready to bill clients!
