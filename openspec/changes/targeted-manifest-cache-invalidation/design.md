# Design: targeted-manifest-cache-invalidation

## Strategy

Use the mutation response (or cached manifest) to identify `groupId`, then invalidate only queries for that group.

Key pattern:
```
['manifests','group', groupId, params]
```

## Safety

If `groupId` cannot be determined, fall back to the broad invalidation to preserve correctness.

