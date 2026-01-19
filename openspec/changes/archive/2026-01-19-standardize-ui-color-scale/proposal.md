# Change: Standardize UI Color Scale

## Why

The web application currently mixes `gray-*` and `slate-*` Tailwind classes across pages and components, which makes the UI feel inconsistent and complicates theme support.

## What Changes

- Replace hard-coded neutral color classes with semantic Tailwind tokens
- Use theme-aware tokens for backgrounds, text, borders, and hover states
- Align all neutral UI surfaces to `bg-background`/`bg-card` and `text-foreground`/`text-muted-foreground`

## Impact

- Affected specs: `web-app` (new styling consistency requirements)
- Affected code: All components in `src/apps/web/src/`
- Visual change: Neutral surfaces shift to semantic tokens (light and dark compatible)

## Migration

Hard-coded neutral classes are replaced with semantic tokens:
- `bg-gray-50` and `bg-slate-50` to `bg-background`
- `bg-white` and `bg-slate-50` to `bg-card`
- `text-gray-900` to `text-foreground`
- `text-gray-500` to `text-muted-foreground`
- `border-gray-200` to `border-border`
- `hover:bg-gray-50` to `hover:bg-muted`
