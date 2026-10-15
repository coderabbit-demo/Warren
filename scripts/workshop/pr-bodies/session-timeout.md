## Summary
Add session expiry handling and a token refresh endpoint for dashboard clients.

## Changes
- Check bearer token expiry in authentication middleware
- Add `POST /auth/refresh` for active sessions

## Testing
- Authentication route tests and `npm run ci` pass
