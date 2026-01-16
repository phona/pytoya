# Baidu Qianfan Integration Guide

This guide explains how to integrate and use Baidu Qianfan's vision capabilities for document extraction in PyToYa.

**Update (Jan 2026)**: PyToYa now uses adapter-based models instead of providers. To follow this guide:
- Implement a Baidu adapter and register it in the adapter registry.
- Use `POST /api/models` with `adapterType` set to your adapter name and move configuration fields under `parameters`.
- Replace `providerId` with `llmModelId` and `/api/providers` with `/api/models`.

## Overview

Baidu Qianfan (Wenxin Workshop) provides Chinese-optimized LLM models with vision capabilities, ideal for processing Chinese invoices, receipts, and business documents.

## Model Configuration

### Basic Setup

```typescript
// POST /api/models
{
  "name": "Baidu ERNIE 4.0",
  "adapterType": "baidu",
  "parameters": {
    "baseUrl": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat",
    "apiKey": "your-api-key",
    "secretKey": "your-secret-key",
    "modelName": "ERNIE-4.0-8K",
    "temperature": 0.1,
    "maxTokens": 2000,
    "supportsVision": true,
    "supportsStructuredOutput": true
  },
  "isActive": true
}
```

### Environment Variables

```bash
# .env file
BAIDU_API_KEY=your-api-key-here
BAIDU_SECRET_KEY=your-secret-key-here
```

### Available Models

| Model | Context | Vision | Best For |
|-------|---------|--------|----------|
| ERNIE-4.0-8K | 8K tokens | ✅ | Most documents |
| ERNIE-4.0-8K-Preview | 8K tokens | ✅ | Testing/preview |
| ERNIE-3.5-8K | 8K tokens | ✅ | Cost-effective |
| ERNIE-Vision | Specialized | ✅ | Pure vision tasks |

## Usage Examples

### Basic Vision Extraction

```typescript
// Using VISION_ONLY strategy
const manifest = await manifestsService.upload(file, groupId);
const schema = await schemasService.findOne(schemaId);

// Set schema to use vision-only
schema.extractionStrategy = ExtractionStrategy.VISION_ONLY;
await schemasService.update(schemaId, schema);

// Run extraction
const result = await extractionService.runExtraction(manifest.id, {
  llmModelId: baiduModelId,
});
```

### MultiPicOCR Integration

```typescript
// For Chinese documents with complex layouts
const schema: SchemaEntity = {
  name: "Chinese Invoice Schema",
  jsonSchema: {
    type: "object",
    properties: {
      invoiceNumber: { type: "string", description: "发票号码" },
      invoiceDate: { type: "string", description: "开票日期" },
      sellerName: { type: "string", description: "销售方名称" },
      buyerName: { type: "string", description: "购买方名称" },
      amount: { type: "number", description: "金额" },
      tax: { type: "number", description: "税额" },
    },
  },
  requiredFields: [
    "invoiceNumber",
    "invoiceDate",
    "sellerName",
    "amount"
  ],
  projectId: 1,
  extractionStrategy: ExtractionStrategy.VISION_ONLY,
};

const result = await extractionService.runExtraction(manifestId, {
  model: baiduModel,
  schema,
});
```

### Using Vision First with OCR Fallback

```typescript
// For documents where OCR might miss some text
const schema = {
  extractionStrategy: ExtractionStrategy.VISION_FIRST,
  // ... other fields
};

// System will:
// 1. Convert PDF to images
// 2. Run PaddleOCR-VL for text extraction
// 3. Send BOTH images and OCR text to Baidu
// 4. Use OCR as fallback when vision is uncertain
```

### Prompt Templates for Chinese Documents

```typescript
// System prompt template
const systemPrompt = `
你是一个专业的发票信息提取助手。请从图片中提取以下信息：

1. 发票号码 (invoiceNumber)
2. 开票日期 (invoiceDate)
3. 销售方名称 (sellerName)
4. 购买方名称 (buyerName)
5. 金额 (amount)
6. 税额 (tax)

请以JSON格式返回结果。
`;

// Build extraction prompt
const prompt = promptsService.buildExtractionPrompt(
  manifest,
  systemPrompt,
  requiredFields
);
```

## API Integration

### Direct API Usage

```typescript
import { LlmService } from '../llm/llm.service';

class BaiduExtractionService {
  constructor(private readonly llmService: LlmService) {}

  async extractFromImage(imageBuffer: Buffer, mimeType: string) {
    // Create vision message
    const message = this.llmService.createVisionMessageFromBuffers(
      '请从发票图片中提取结构化数据',
      [{ buffer: imageBuffer, mimeType }],
      'high'  // Use high detail for Chinese characters
    );

    // Call Baidu API
    const response = await this.llmService.createChatCompletion(
      { role: 'system', content: 'You are a helpful assistant.' },
      message,
      {
        llmModelId: baiduModelId,
        temperature: 0.1,
        maxTokens: 2000,
      }
    );

    return JSON.parse(response.content);
  }
}
```

### Multi-Page Document Handling

```typescript
// For multi-page PDFs
const pages = await pdfToImageService.convertPdfToImages(pdfPath);

// Process each page and merge results
const allResults = [];
for (const page of pages) {
  const result = await this.extractFromPage(page.buffer);
  allResults.push(result);
}

// Merge results (e.g., combine line items from all pages)
const merged = this.mergeResults(allResults);
```

## Error Handling

### Common Baidu API Errors

**"Insufficient quota"**

**Cause**: API quota exceeded

**Solution**:
```typescript
// Check quota before processing
const quota = await this.checkBaiduQuota();
if (quota.remaining < 1000) {
  throw new Error('Insufficient Baidu quota, please top up');
}
```

**"Invalid API key"**

**Cause**: API key or secret key is incorrect

**Solution**:
```bash
# Verify credentials
curl -X POST "https://aip.baidubce.com/oauth/2.0/token" \
  -d "grant_type=client_credentials&client_id=$BAIDU_API_KEY&client_secret=$BAIDU_SECRET_KEY"
```

**"Model not found"**

**Cause**: Model name is incorrect or not available

**Solution**:
```typescript
// Use correct model name
const validModels = [
  'ERNIE-4.0-8K',
  'ERNIE-4.0-8K-Preview',
  'ERNIE-3.5-8K',
];
```

### Retry Logic

```typescript
// Implement exponential backoff for retries
async function extractWithRetry(pdfPath: string, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await extractionService.runExtraction(manifestId, {
        model: baiduModel,
      });
    } catch (error) {
      if (attempt === maxRetries) {
        throw error;
      }

      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

## Performance Tuning

### Temperature Settings

```typescript
// Low temperature for consistency
{ temperature: 0.1 }  // Recommended for extraction

// Medium temperature for creativity
{ temperature: 0.5 }  // For less structured documents

// High temperature for diversity
{ temperature: 0.8 }  // Not recommended for extraction
```

### Max Tokens Configuration

```typescript
// Simple invoices
{ maxTokens: 1000 }  // Sufficient for basic data

// Complex documents
{ maxTokens: 2000 }  // Default, good for most cases

// Very long documents
{ maxTokens: 4000 }  // For multi-page invoices
```

### Image Quality Settings

```typescript
// Standard quality (default)
{ scale: 2 }  // 144 DPI

// High quality for small text
{ scale: 3 }  // 216 DPI

// Lower quality for faster processing
{ scale: 1 }  // 72 DPI
```

## Testing

### Unit Test Example

```typescript
describe('Baidu Qianfan Extraction', () => {
  let baiduModel: ModelEntity;
  let service: ExtractionService;

  beforeEach(async () => {
    // Setup Baidu model
    baiduModel = {
      id: 1,
      name: 'Baidu ERNIE 4.0',
      type: ModelType.BAIDU,
      baseUrl: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat',
      apiKey: 'test-key',
      secretKey: 'test-secret',
      modelName: 'ERNIE-4.0-8K',
      temperature: 0.1,
      maxTokens: 2000,
      supportsVision: true,
      supportsStructuredOutput: true,
      isActive: false,
    } as ModelEntity;

    // Mock HTTP calls
    module = await Test.createTestingModule({
      models: [
        ExtractionService,
        { provide: 'LLM_AXIOS_INSTANCE', useValue: mockAxios },
      ],
    }).compile();

    service = module.get<ExtractionService>();
  });

  it('should extract Chinese invoice data', async () => {
    // Mock successful Baidu response
    mockAxios.post.mockResolvedValue({
      data: {
        result: JSON.stringify({
          invoiceNumber: '12345678',
          invoiceDate: '2024-01-15',
          sellerName: '北京某某科技有限公司',
          buyerName: '上海某某贸易有限公司',
          amount: 10000.00,
          tax: 1300.00,
        }),
      },
    });

    const result = await service.runExtraction(manifestId, {
      model: baiduModel,
    });

    expect(result.status).toBe(ExtractionStatus.COMPLETED);
    expect(result.extractionResult.data).toMatchObject({
      invoiceNumber: '12345678',
      amount: 10000.00,
    });
  });
});
```

### Integration Test Example

```typescript
describe('Baidu MultiPicOCR Integration', () => {
  it('should process Chinese invoice with VISION_ONLY', async () => {
    // Upload Chinese invoice
    const manifest = await uploadChineseInvoice('./fixtures/chinese-invoice.pdf');

    // Set strategy
    const schema = await schemasService.findOne(schemaId);
    schema.extractionStrategy = ExtractionStrategy.VISION_ONLY;
    await schemasService.update(schemaId, schema);

    // Extract with Baidu
    const result = await extractionService.runExtraction(manifest.id, {
      model: baiduModel,
    });

    // Verify extraction
    expect(result.extractionResult.data).toBeDefined();
    expect(result.extractionResult.data.invoiceNumber).toMatch(/^\d{8}$/);
  });
});
```

## Best Practices

### 1. Use Appropriate Models

```typescript
// For extraction tasks (most common)
ERNIE-4.0-8K

// For cost-sensitive applications
ERNIE-3.5-8K

// For testing/development
ERNIE-4.0-8K-Preview
```

### 2. Handle Chinese Characters

```typescript
// Ensure UTF-8 encoding for prompts
const systemPrompt = `
请从图片中提取发票信息，包括：
- 发票号码
- 开票日期
- 销售方名称
- 购买方名称
- 金额
- 税额

请以JSON格式返回，中文字段名请使用拼音或英文。
`;

// Response format expectation
const expectedResponse = {
  invoiceNumber: "12345678",
  invoiceDate: "2024-01-15",
  sellerName: "北京某某科技有限公司",
  buyerName: "上海某某贸易有限公司",
  amount: 10000.00,
  tax: 1300.00,
};
```

### 3. Validate Chinese Fields

```typescript
// Validate Chinese business license number (统一社会信用代码)
function validateChineseLicenseNumber(license: string): boolean {
  // 18-character license number pattern
  return /^[0-9A-HJ-NP-QRT-UW-Y]{18}$/.test(license);
}

// Validate Chinese invoice number pattern
function validateInvoiceNumber(invoiceNo: string): boolean {
  // 8 or 20 digit invoice number
  return /^\d{8}$/.test(invoiceNo) || /^\d{20}$/.test(invoiceNo);
}
```

### 4. Format Currency Values

```typescript
// Baidu returns Chinese currency formatting
function parseCurrency(value: any): number {
  if (typeof value === 'string') {
    // Remove Chinese characters and format
    const cleaned = value.replace(/[^\d.]/g, '');
    return parseFloat(cleaned);
  }
  return value;
}

// Example
const amount = parseCurrency("￥10,000.00元");  // Returns: 10000.00
```

## Cost Optimization

### Token Usage Tips

```typescript
// 1. Use concise prompts
const badPrompt = "请你非常仔细地查看这张图片，并告诉我图片中包含了哪些发票的信息，包括发票号码、日期、金额等所有详细信息...";

const goodPrompt = "提取发票信息：号码、日期、金额、买卖双方。JSON格式。";

// 2. Limit image detail when appropriate
const detail = 'auto';  // Let model choose
// vs
const detail = 'high';  // Force high resolution

// 3. Process single pages when possible
const singlePage = await pdfToImageService.convertPdfPageToImage(pdfPath, 1);
// Instead of converting entire PDF
```

### Batch Processing

```typescript
// Process multiple documents efficiently
async function batchExtract(manifestIds: number[]) {
  const results = [];

  // Process in parallel batches of 5
  const batchSize = 5;
  for (let i = 0; i < manifestIds.length; i += batchSize) {
    const batch = manifestIds.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      batch.map(id => extractionService.runExtraction(id, { model: baiduModel }))
    );
    results.push(...batchResults);

    // Rate limiting delay
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  return results;
}
```

## Troubleshooting

### Common Issues

**"Chinese characters garbled in response"**

**Cause**: Encoding issue

**Solution**:
```typescript
// Ensure UTF-8 encoding
const response = await axios.post(url, data, {
  headers: {
    'Content-Type': 'application/json; charset=utf-8',
  },
});
```

**"Model returns Chinese field names instead of English"**

**Cause**: Model not following instructions

**Solution**:
```typescript
// Be explicit about field names in prompt
const prompt = `
Extract invoice data and return JSON with English field names:
{
  "invoiceNumber": "发票号码",
  "invoiceDate": "开票日期",
  ...
}
Return ONLY the JSON object, no additional text.
`;
```

**"Too many requests error"**

**Cause**: Rate limiting

**Solution**:
```typescript
// Implement exponential backoff
async function extractWithBackoff(manifestId: number) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      return await extractionService.runExtraction(manifestId, {
        model: baiduModel,
      });
    } catch (error) {
      if (error.message.includes('rate limit')) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
}
```

## Migration Guide

### From Other Models to Baidu

```typescript
// Step 1: Add Baidu model
const baiduModel = await createModel({
  type: 'baidu',
  modelName: 'ERNIE-4.0-8K',
  supportsVision: true,
});

// Step 2: Update schema to use vision
await schemasService.update(schemaId, {
  extractionStrategy: ExtractionStrategy.VISION_ONLY,
});

// Step 3: Test with sample document
const result = await extractionService.runExtraction(testManifestId, {
  model: baiduModel,
});

// Step 4: Validate results
const validation = schemasService.validateWithRequiredFields({
  jsonSchema: schema.jsonSchema,
  data: result.extractionResult.data,
  requiredFields: schema.requiredFields,
});

if (!validation.valid) {
  console.error('Validation failed:', validation.errors);
} else {
  console.log('Migration successful!');
}
```

## Comparison with Other Models

| Feature | Baidu ERNIE | OpenAI GPT-4o | Claude 3.5 |
|---------|-------------|---------------|-------------|
| Chinese OCR | ✅ Excellent | ⚠️ Good | ⚠️ Good |
| Speed | ⚠️ Medium | ✅ Fast | ⚠️ Medium |
| Cost | ✅ Low | ⚠️ High | ⚠️ High |
| Vision Quality | ✅ Good | ✅ Excellent | ✅ Excellent |
| Context Window | 8K | 128K | 200K |
| Structured Output | ✅ Good | ✅ Excellent | ✅ Good |

## API Reference

### Create Baidu Model

```http
POST /api/models HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "name": "Baidu ERNIE 4.0",
  "adapterType": "baidu",
  "baseUrl": "https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat",
  "apiKey": "your-api-key",
  "secretKey": "your-secret-key",
  "modelName": "ERNIE-4.0-8K",
  "temperature": 0.1,
  "maxTokens": 2000,
  "supportsVision": true,
  "supportsStructuredOutput": true,
  "isActive": false
}
```

### Extract with Baidu

```http
POST /api/manifests/:id/extract HTTP/1.1
Host: localhost:3000
Content-Type: application/json

{
  "llmModelId": 1,
  "schemaId": 1
}
```

### Check Baidu Quota

```http
GET /api/models/:id/quota HTTP/1.1
Host: localhost:3000

Response:
{
  "llmModelId": 1,
  "remainingTokens": 95000,
  "resetDate": "2024-01-16T00:00:00Z"
}
```

## References

- [Baidu Qianfan Documentation](https://cloud.baidu.com/doc/WENXINWORKSHOP/index.html)
- [ERNIE Model Documentation](https://cloud.baidu.com/doc/WENXINWORKSHOP/gettingStarted.html)
- [Pricing Information](https://cloud.baidu.com/doc/WENXINWORKSHOP/pricing.html)
- [Extraction Strategies Guide](./LLM_VISION_EXTRACTION.md)
