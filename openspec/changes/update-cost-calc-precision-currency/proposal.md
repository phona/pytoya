## Why

Cost values shown in the system are not always precise and sometimes appear as USD even when the pricing configuration is missing or different.

Root causes:
- Cost math uses floating point `number` math across multiple steps and sums, which can accumulate rounding drift.
- Several places default `currency` to `USD` when it is missing, which hides misconfiguration and makes non-USD pricing look like USD.
- The web UI has a fallback `$` formatter and a hardcoded `en-US` currency formatter path, which can mislead users.

## What Changes

- Cost calculations SHALL be performed using integer “nano currency units” (1e-9) and then converted to a rounded decimal for storage/transport.
- Cost results SHALL include an explicit ISO-like currency code (e.g., `USD`, `EUR`, `GBP`, `CNY`) when pricing is provided.
- Aggregations across multiple records SHALL NOT sum different currencies into a single total. If multiple currencies exist, totals SHALL be grouped by currency.
- UI cost formatting SHALL display currency codes and MUST NOT assume `$`/`USD` when currency is unknown.

## Scope

In scope:
- LLM cost calculation (per 1M tokens) precision and rounding rules
- Text extractor cost calculation precision and rounding rules (page/token/fixed)
- Cost estimate endpoint outputs (min/max + currency handling)
- Cost display components: remove misleading USD/$ fallbacks, show currency codes, handle multi-currency totals
- Tests to prove deterministic rounding and currency behavior

Out of scope (non-goals):
- FX conversion between currencies
- Repricing historical data with new pricing
- Changing the pricing admin UX beyond currency display correctness

## Compatibility / Impact

- API responses that currently return a single “total cost” MAY instead return totals grouped by currency when data is mixed-currency.
- Existing records without currency will remain; UI will show “unknown currency” rather than USD.

## Rollout

1) Implement bigint-based calculators behind the current services.
2) Update endpoints to return currency alongside numeric cost values (and grouped totals when needed).
3) Update UI formatting and multi-currency display.
4) Add regression tests and validate deterministic rounding.

