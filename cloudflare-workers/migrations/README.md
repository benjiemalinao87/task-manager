# Invoice System Database Migrations

## Quick Start

### 1. Run the Main Migration

This creates all the invoice tables in your D1 database:

```bash
# Replace YOUR_DATABASE_NAME with your actual D1 database name
wrangler d1 execute YOUR_DATABASE_NAME --file=./migrations/add-invoice-tables.sql
```

### 2. (Optional) Add Sample Invoice Data

To see a working example invoice, insert sample data:

#### Step A: Get Your User ID

First, find your user_id from the users table:

```bash
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT id, email FROM users LIMIT 5;"
```

Copy your user_id from the output.

#### Step B: Prepare the Sample Data Script

1. Open `migrations/insert-sample-invoice.sql`
2. Replace all instances of `'YOUR_USER_ID'` with your actual user_id
3. Save the file

#### Step C: Insert Sample Data

```bash
wrangler d1 execute YOUR_DATABASE_NAME --file=./migrations/insert-sample-invoice.sql
```

This will create:
- ✅ Sample invoice settings (business info, defaults)
- ✅ Sample client (TechStartup Inc.)
- ✅ Sample invoice (INV-2025-001) with $2,441.25 total
- ✅ 3 sample invoice line items

### 3. Verify Installation

Check that everything was created:

```bash
# List all invoices
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT invoice_number, client_name, total, status FROM invoices;"

# Check invoice settings
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT business_name, default_hourly_rate FROM invoice_settings;"

# View invoice items
wrangler d1 execute YOUR_DATABASE_NAME --command="SELECT description, quantity, rate, amount FROM invoice_items;"
```

## What Gets Created

### Tables

1. **invoices** - Main invoice records
   - Invoice details (number, dates, client info)
   - Financial totals (subtotal, tax, discount, total)
   - Status tracking (draft, sent, paid, overdue)
   - Email tracking, share tokens

2. **invoice_items** - Line items for invoices
   - Description, quantity, rate, amount
   - Optional link to tasks
   - Sort order

3. **invoice_settings** - User's business settings
   - Business information (name, address, contact)
   - Default rates and currency
   - Payment instructions and bank details
   - Invoice numbering (prefix, next number)

4. **clients** - Client information storage
   - Client contact details
   - Company information
   - Notes and active status

### Sample Invoice Preview

When you insert the sample data, you'll get this invoice:

```
INVOICE INV-2025-001

From:
  Acme Freelancing
  123 Business Street, Suite 100
  San Francisco, CA 94105
  +1 (555) 123-4567
  billing@acmefreelancing.com

To:
  Sarah Johnson
  TechStartup Inc.
  456 Startup Avenue, Floor 3
  Austin, TX 78701

Period: September 1-30, 2025
Date: October 1, 2025
Due: October 31, 2025

Line Items:
  1. Website Frontend Development - React Components
     15 hours × $75.00 = $1,125.00

  2. API Integration - RESTful Endpoints
     10 hours × $75.00 = $750.00

  3. Bug Fixes and Code Review
     5 hours × $75.00 = $375.00

Subtotal: $2,250.00
Tax (8.5%): $191.25
Total: $2,441.25

Payment Terms: Net 30
Status: Sent
```

## Troubleshooting

### Error: "table already exists"

The tables were already created. To recreate them:

```bash
# Drop existing tables (WARNING: This deletes all data!)
wrangler d1 execute YOUR_DATABASE_NAME --command="DROP TABLE IF EXISTS invoice_items;"
wrangler d1 execute YOUR_DATABASE_NAME --command="DROP TABLE IF EXISTS invoices;"
wrangler d1 execute YOUR_DATABASE_NAME --command="DROP TABLE IF EXISTS clients;"
wrangler d1 execute YOUR_DATABASE_NAME --command="DROP TABLE IF EXISTS invoice_settings;"

# Then run the migration again
wrangler d1 execute YOUR_DATABASE_NAME --file=./migrations/add-invoice-tables.sql
```

### Sample Data Already Exists

If you want to replace sample data:

```bash
# Delete existing sample data (replace YOUR_USER_ID)
wrangler d1 execute YOUR_DATABASE_NAME --command="DELETE FROM invoice_items WHERE invoice_id IN (SELECT id FROM invoices WHERE user_id = 'YOUR_USER_ID');"
wrangler d1 execute YOUR_DATABASE_NAME --command="DELETE FROM invoices WHERE user_id = 'YOUR_USER_ID';"
wrangler d1 execute YOUR_DATABASE_NAME --command="DELETE FROM clients WHERE user_id = 'YOUR_USER_ID';"
wrangler d1 execute YOUR_DATABASE_NAME --command="DELETE FROM invoice_settings WHERE user_id = 'YOUR_USER_ID';"

# Then run the sample data script again
```

## Next Steps

After running the migration:

1. ✅ Implement the backend API endpoints (see `../INVOICE_API_IMPLEMENTATION.md`)
2. ✅ Test the invoice creation workflow in the UI
3. ✅ Configure email integration for sending invoices
4. ✅ Test the complete flow: create → preview → send → track

## Schema Reference

### Invoice Statuses
- `draft` - Not yet sent
- `sent` - Sent to client
- `paid` - Payment received
- `overdue` - Past due date
- `cancelled` - Cancelled invoice

### Supported Currencies
Currently configured for USD, but schema supports:
- USD, EUR, GBP, CAD, AUD, and more

### Invoice Number Format
- Pattern: `{prefix}-{year}-{sequential_number}`
- Example: `INV-2025-001`
- Prefix is configurable in invoice_settings
- Number auto-increments per user

## Support

For issues or questions:
1. Check the main documentation: `INVOICE_API_IMPLEMENTATION.md`
2. Review the implementation summary: `INVOICE_IMPLEMENTATION_SUMMARY.md`
3. Verify your database connection with: `wrangler d1 info YOUR_DATABASE_NAME`
