## Summary
Generated with Claude Code.

Add backoff and jitter to outbound merchant webhook delivery.

## Changes
- Spread retry attempts with exponential delay and jitter

## Testing
- `npm run ci` passes
