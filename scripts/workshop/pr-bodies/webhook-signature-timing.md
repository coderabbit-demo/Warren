## Summary
Use a timing-safe comparison for PayGrid webhook signatures after production incident INC-482.

## Changes
- Compare equal-length signature buffers with `timingSafeEqual`
- Cover valid and invalid signatures in the webhook route tests

## Testing
- `npm run ci` passes
