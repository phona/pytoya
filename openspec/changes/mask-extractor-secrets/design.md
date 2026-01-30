# Design: mask-extractor-secrets

## Masking contract

Constant:
```
MASKED_SECRET = "********"
```

Read responses:
- Mask all fields marked `secret: true` in the extractor type schema.

Update requests:
- Treat `MASKED_SECRET` as “keep existing value” when possible.
- When changing extractor type, `MASKED_SECRET` MUST NOT be accepted as the actual secret.

ASCII:
```
client sends: apiKey="********"
  same type + existing stored value -> keep
  type changed OR no stored value   -> reject / require real secret
```

