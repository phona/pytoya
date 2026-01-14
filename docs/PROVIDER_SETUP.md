# Vision-Enabled Provider Setup Guide

This guide explains how to configure LLM providers for vision-based extraction in PyToYa.

## Overview

Vision-enabled providers can process images directly, enabling the VISION_ONLY, VISION_FIRST, and TWO_STAGE extraction strategies.

## Supported Providers

### OpenAI

**Models with Vision Support**:
- `gpt-4o` - Best overall, fast and accurate
- `gpt-4o-mini` - Cost-effective option (50% cheaper)
- `gpt-4-turbo` - Older model, still supports vision

**Configuration**:

```typescript
// Via API
POST /api/providers
{
  "name": "OpenAI GPT-4o",
  "type": "openai",
  "baseUrl": "https://api.openai.com/v1",
  "apiKey": "sk-...",
  "modelName": "gpt-4o",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isDefault": true
}
```

**Environment Variables**:
```bash
# Optional: Override default API key
OPENAI_API_KEY=sk-...
```

**Cost Comparison** (per image input):
- GPT-4o: ~$0.01 per image
- GPT-4o-mini: ~$0.005 per image
- GPT-4-turbo: ~$0.015 per image

### Anthropic Claude

**Models with Vision Support**:
- `claude-3-5-sonnet-20241022` - Best for complex tasks
- `claude-3-5-haiku-20241022` - Fast and cost-effective
- `claude-3-opus-20240229` - Older but excellent

**Configuration**:

```typescript
// Via API
POST /api/providers
{
  "name": "Claude 3.5 Sonnet",
  "type": "anthropic",
  "baseUrl": "https://api.anthropic.com/v1",
  "apiKey": "sk-ant-...",
  "modelName": "claude-3-5-sonnet-20241022",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isDefault": false
}
```

**Environment Variables**:
```bash
# Optional: Override default API key
ANTHROPIC_API_KEY=sk-ant-...
```

**Cost Comparison** (per image input):
- Claude 3.5 Sonnet: ~$0.015 per image
- Claude 3.5 Haiku: ~$0.003 per image
- Claude 3 Opus: ~$0.03 per image

### Baidu Qianfan

**Models with Vision Support**:
- `ERNIE-4.0-8K` - Chinese language optimized
- `ERNIE-Vision` - Specialized for visual tasks

**Configuration**:

```typescript
// Via API
POST /api/providers
{
  "name": "Baidu ERNIE 4.0",
  "type": "baidu",
  "baseUrl": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat",
  "apiKey": "your-api-key",
  "secretKey": "your-secret-key",
  "modelName": "ERNIE-4.0-8K",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isDefault": false
}
```

**Environment Variables**:
```bash
# Baidu Qianfan credentials
BAIDU_API_KEY=your-api-key
BAIDU_SECRET_KEY=your-secret-key
```

### SiliconFlow (Chinese Cloud)

**Models with Vision Support**:
- `Qwen-VL-Max` - Excellent for Chinese documents
- `Qwen-VL-Plus` - Cost-effective option

**Configuration**:

```typescript
// Via API
POST /api/providers
{
  "name": "SiliconFlow Qwen VL",
  "type": "siliconflow",
  "baseUrl": "https://api.siliconflow.cn/v1",
  "apiKey": "sk-...",
  "modelName": "Qwen/Qwen2-VL-72B-Instruct",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isDefault": false
}
```

**Environment Variables**:
```bash
# Optional: Override default API key
SILICONFLOW_API_KEY=sk-...
```

### Custom OpenAI-Compatible Providers

Any OpenAI-compatible API can be configured:

```typescript
// Example: Local Ollama with vision
POST /api/providers
{
  "name": "Ollama LLaVA",
  "type": "openai",
  "baseUrl": "http://localhost:11434/v1",
  "apiKey": "ollama",  // Required but not used
  "modelName": "llava:34b",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": false,
  "isDefault": false
}
```

## Setup Steps

### 1. Verify Provider Capabilities

Before configuring, verify the provider supports vision:

```bash
# For OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Look for models with "vision" or "omni" in the name
```

### 2. Add Provider via API

```bash
curl -X POST http://localhost:3000/api/providers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "OpenAI GPT-4o",
    "type": "openai",
    "baseUrl": "https://api.openai.com/v1",
    "apiKey": "sk-...",
    "modelName": "gpt-4o",
    "temperature": 0.1,
    "maxTokens": 4000,
    "supportsVision": true,
    "supportsStructuredOutput": true,
    "isDefault": false
  }'
```

### 3. Update Schema to Use Vision Strategy

```bash
curl -X PATCH http://localhost:3000/api/schemas/1 \
  -H "Content-Type: application/json" \
  -d '{
    "extractionStrategy": "vision-only"
  }'
```

### 4. Test Vision Extraction

```bash
# Upload a test document
curl -X POST http://localhost:3000/api/manifests \
  -F "file=@test-invoice.pdf" \
  -F "groupId=1"

# Run extraction with vision
curl -X POST http://localhost:3000/api/manifests/1/extract \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 1,
    "schemaId": 1
  }'
```

## Provider-Specific Notes

### OpenAI GPT-4o

**Advantages**:
- Fastest vision processing (110 tokens/ms)
- Best balance of speed and accuracy
- Lower cost than GPT-4
- Excellent at table extraction

**Limitations**:
- Rate limits: 10,000 tokens/minute for tier 3
- Max 4 images per request
- Images must be < 20MB each

**Recommended Settings**:
```typescript
{
  "temperature": 0.1,      // Low temperature for consistency
  "maxTokens": 4000,       // Sufficient for most invoices
  "detail": "auto"         // Auto-resolution for images
}
```

### Anthropic Claude

**Advantages**:
- Larger context window (200K tokens)
- Excellent at handwriting recognition
- Better for complex document layouts
- No rate limiting concerns

**Limitations**:
- Higher cost per token
- Slower processing speed
- More expensive than GPT-4o

**Recommended Settings**:
```typescript
{
  "temperature": 0.1,      // Low temperature for consistency
  "maxTokens": 4096,       // Claude's default max
  "detail": "high"         // High detail for accuracy
}
```

### Baidu Qianfan

**Advantages**:
- Optimized for Chinese documents
- Lower cost than Western providers
- Good regional availability

**Limitations**:
- Requires API key + secret key
- Limited model options
- Less accurate for English documents

**Recommended Settings**:
```typescript
{
  "temperature": 0.1,
  "maxTokens": 2000,
  "topP": 0.8
}
```

## Testing Configuration

### Verify Vision Support

```bash
# Test provider endpoint
curl -X POST http://localhost:3000/api/providers/test \
  -H "Content-Type: application/json" \
  -d '{
    "providerId": 1,
    "content": [
      {
        "type": "text",
        "text": "What is in this image?"
      },
      {
        "type": "image_url",
        "image_url": {
          "url": "data:image/png;base64,iVBORw0KG..."
        }
      }
    ]
  }'
```

### Check Provider Status

```bash
curl http://localhost:3000/api/providers

# Response should include:
{
  "id": 1,
  "name": "OpenAI GPT-4o",
  "supportsVision": true,
  "supportsStructuredOutput": true,
  ...
}
```

## Troubleshooting

### Common Issues

**"Provider does not support vision"**

**Cause**: `supportsVision` field is `false` or `null`

**Solution**:
```bash
curl -X PATCH http://localhost:3000/api/providers/:id \
  -H "Content-Type: application/json" \
  -d '{"supportsVision": true}'
```

**"Invalid image format"**

**Cause**: Image format not supported by provider

**Solution**: Ensure images are PNG, JPEG, GIF, or WebP format

**"Image too large"**

**Cause**: Image exceeds provider's size limit

**Solution**:
- Resize image before upload
- Use lower DPI for PDF conversion (scale 1 instead of 2)
- Split large PDFs into smaller documents

**"Rate limit exceeded"**

**Cause**: Too many requests to provider API

**Solution**:
- Implement request queueing
- Use multiple provider API keys
- Switch to provider with higher rate limits

## Best Practices

### 1. Use Multiple Providers

Configure multiple vision providers for load balancing:

```typescript
// Primary: GPT-4o for most documents
{
  "name": "OpenAI GPT-4o",
  "isDefault": true,
  ...
}

// Fallback: Claude for complex documents
{
  "name": "Claude 3.5 Sonnet",
  "isDefault": false,
  ...
}
```

### 2. Set Appropriate Max Tokens

```typescript
// Simple invoices: 2000 tokens
{
  "maxTokens": 2000
}

// Complex documents: 4000 tokens
{
  "maxTokens": 4000
}

// Very large documents: 8000 tokens
{
  "maxTokens": 8000
}
```

### 3. Monitor Costs

Track vision API usage:

```bash
# Check extraction history with costs
curl http://localhost:3000/api/extractions/history?limit=100
```

### 4. Test Before Production

Always test with sample documents before production use:

```bash
# Test with single document
curl -X POST http://localhost:3000/api/test-extraction \
  -F "file=@sample.pdf" \
  -F "providerId=1" \
  -F "strategy=vision-only"
```

## Security Considerations

### API Key Management

1. **Never commit API keys** to version control
2. **Use environment variables** for sensitive data
3. **Rotate keys regularly** (every 90 days)
4. **Use separate keys** for development and production

### Environment Variables

```bash
# .env file (DO NOT COMMIT)
OPENAI_API_KEY=sk-prod-...
ANTHROPIC_API_KEY=sk-ant-prod-...
BAIDU_API_KEY=prod-key
BAIDU_SECRET_KEY=prod-secret
```

### Provider Configuration

```typescript
// Production settings
{
  "temperature": 0.1,        // Deterministic for consistency
  "maxTokens": 4000,         // Limit token usage
  "supportsVision": true,    // Required for vision strategies
  "isDefault": true          // Mark as primary provider
}
```

## Migration Guide

### From Non-Vision to Vision Provider

1. **Add new vision provider** (keep old provider as fallback)
2. **Test with sample documents**
3. **Update schemas to use vision strategies**
4. **Monitor extraction quality and costs**
5. **Migrate all schemas when confident**

### Rollback Plan

If issues occur:

```bash
# Revert all schemas to OCR_FIRST
curl -X PATCH http://localhost:3000/api/schemas \
  -H "Content-Type: application/json" \
  -d '[{"op": "replace", "path": "/0/extractionStrategy", "value": "ocr-first"}]'

# Or disable vision provider temporarily
curl -X PATCH http://localhost:3000/api/providers/:id \
  -H "Content-Type: application/json" \
  -d '{"supportsVision": false}'
```

## API Reference

### Create Provider

```http
POST /api/providers HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "string",
  "type": "openai | anthropic | baidu | siliconflow",
  "baseUrl": "string",
  "apiKey": "string",
  "modelName": "string",
  "temperature": 0.1,
  "maxTokens": 4000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isDefault": false
}
```

### Update Provider

```http
PATCH /api/providers/:id HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "supportsVision": true
}
```

### List Providers

```http
GET /api/providers HTTP/1.1
Host: localhost:3000

Response:
[
  {
    "id": 1,
    "name": "OpenAI GPT-4o",
    "type": "openai",
    "supportsVision": true,
    "supportsStructuredOutput": true,
    "isDefault": true
  }
]
```

### Test Provider

```http
POST /api/providers/test HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "providerId": 1,
  "content": [
    {
      "type": "text",
      "text": "Extract data from this invoice"
    },
    {
      "type": "image_url",
      "image_url": {
        "url": "data:image/png;base64,..."
      }
    }
  ]
}
```
