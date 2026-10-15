## Summary
Merchants can set their webhook endpoint and send a test ping from the dashboard. Invoice search now finds records by number or customer email.

## Changes
- Save and read merchant webhook settings
- Send a signed test event and show the delivery result
- Search recent invoices within a merchant account

## Testing
- Added route and service coverage for configuration and search
- `npm run ci` passes
