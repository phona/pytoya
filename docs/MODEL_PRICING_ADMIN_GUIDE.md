# Admin Guide: Pricing Configuration

## Overview

As an administrator, you can configure pricing for text extractors and LLM models used in document extraction. This guide explains how to set up, update, and manage pricing.

---

## Table of Contents

1. [Understanding Pricing](#understanding-pricing)
2. [Accessing Pricing Configuration](#accessing-pricing-configuration)
3. [Configuring Text Extractor Pricing](#configuring-text-extractor-pricing)
4. [Configuring LLM Model Pricing](#configuring-llm-model-pricing)
5. [Managing Pricing History](#managing-pricing-history)
6. [Best Practices](#best-practices)

---

## Understanding Pricing

### Text Extractor Pricing

Text extractors can charge **per page processed** (or other modes depending on the extractor):

```
Text Cost = (Number of Pages) × Price Per Page
```

**Example**: 10 pages at $0.001/page = $0.010

### LLM Model Pricing

LLM models charge **per 1M tokens** (input and output):

```
Input Cost = (Input Tokens / 1,000,000) × Input Price
Output Cost = (Output Tokens / 1,000,000) × Output Price
Total LLM Cost = Input Cost + Output Cost
```

**Example**: 50,000 input tokens at $2.50/1M = $0.125

### Minimum Charges

Both pricing types support optional minimum charges:
- **Text Extractor**: Charged when page count is very low
- **LLM**: Charged when token count is very low
- Ensures small operations still cover base costs

---

## Accessing Pricing Configuration

### Navigation

1. Log in as an **admin user**
2. For text extractor pricing, go to **Extractors** in the sidebar
3. For LLM pricing, go to **Models** in the sidebar
4. Open the pricing section for the resource you want to edit

### Permissions

Only users with **admin role** can:
- View model pricing
- Update pricing
- View pricing history
- Add new pricing tiers

---

## Configuring Text Extractor Pricing

### Step-by-Step Guide

1. **Locate the Text Extractor**:
   - Go to the **Extractors** page
   - Example: "PaddleOCR-VL" or "Vision LLM - GPT-4o"

2. **Click Edit Button**:
   - Open the extractor's edit dialog
   - Pricing fields appear in the extractor form

3. **Configure Pricing Fields**:

   **Price Per Page** (page-based extractors only):
   - Enter cost per page in decimal format
   - Example: `0.001` = $0.001 per page
   - Typical range: $0.0005 - $0.005 per page

   **Currency** (required):
   - Select from: USD, EUR, GBP
   - Default: USD
   - All pricing for this model uses the same currency

   **Minimum Charge** (optional):
   - Leave blank for no minimum
   - Enter a value to set minimum cost per operation
   - Example: `0.01` = minimum $0.01 per document
   - Useful for very small documents (1-2 pages)

4. **Save Changes**:
   - Click **Save** button
   - New pricing takes effect immediately for new extractions

### Example Text Extractor Pricing Configuration

```
Extractor: PaddleOCR-VL
Price Per Page: 0.001
Currency: USD
Minimum Charge: 0.01 (optional)

Cost Examples:
- 1 page: max($0.001, $0.01) = $0.01 (minimum applies)
- 5 pages: $0.005 (minimum doesn't apply)
- 100 pages: $0.10
```

---

## Configuring LLM Model Pricing

### Step-by-Step Guide

1. **Locate the LLM Model**:
   - Find models with **[LLM]** badge
   - Examples: "GPT-4o", "GPT-4o-mini", "Claude 3.5 Sonnet"

2. **Click Edit Button**:
   - Expand the model's pricing section

3. **Configure Pricing Fields**:

   **Input Price** (required):
   - Cost per 1M input tokens
   - Example: `2.50` = $2.50 per 1M input tokens
   - Typical range: $0.10 - $30.00 per 1M tokens

   **Output Price** (required):
   - Cost per 1M output tokens
   - Usually 2-8x higher than input price
   - Example: `10.00` = $10.00 per 1M output tokens

   **Currency** (required):
   - Select from: USD, EUR, GBP
   - Default: USD

   **Minimum Charge** (optional):
   - Leave blank for no minimum
   - Ensures small extractions cover base costs
   - Example: `0.05` = minimum $0.05 per extraction

4. **Save Changes**:
   - Click **Save** button
   - Pricing is updated immediately

### Example LLM Pricing Configuration

```
Model: GPT-4o
Input Price: 2.50 (per 1M tokens)
Output Price: 10.00 (per 1M tokens)
Currency: USD
Minimum Charge: 0.05

Cost Examples:
- 1,000 input + 200 output tokens:
  Input: (1,000/1M) × 2.50 = $0.0025
  Output: (200/1M) × 10.00 = $0.002
  Total: $0.0045 (minimum doesn't apply)

- 100 input + 20 output tokens:
  Input: (100/1M) × 2.50 = $0.00025
  Output: (20/1M) × 10.00 = $0.0002
  Total: $0.00045 (minimum applies: $0.05)
```

---

## Managing Pricing History

### Viewing Pricing History

1. **Expand a Model**:
   - Click the chevron (→) next to a model
   - Pricing section expands below

2. **Show Pricing History**:
   - If pricing history exists, click **Show** button
   - Table displays all previous pricing tiers

3. **History Information**:
   - **Effective Date**: When this pricing took effect
   - **End Date**: When this pricing was replaced (if applicable)
   - **Price**: The specific price at that time

### Understanding Pricing Changes

When you update pricing:

1. **Old pricing is archived** with:
   - `effectiveDate`: When it was active
   - `endDate`: When it was replaced (set to now)

2. **New pricing takes effect immediately**:
   - All new extractions use new pricing
   - Existing jobs keep their original pricing

3. **Cost tracking uses historical pricing**:
   - Each extraction records the pricing at time of execution
   - Accurate historical cost reports

### Example Pricing History Timeline

```
PaddleOCR-VL Extractor Pricing:

2024-01-01 - 2024-01-15:
  Price: $0.0008 per page

2024-01-15 - Present:
  Price: $0.001 per page
```

---

## Best Practices

### Setting Initial Pricing

1. **Research Provider Rates**:
   - Check official provider pricing documentation
   - Include your markup if reselling the service

2. **Consider Margins**:
   - Factor in overhead costs (server, storage, bandwidth)
   - Add profit margin if this is a commercial service

3. **Test with Sample Data**:
   - Run test extractions with sample documents
   - Verify cost calculations are accurate
   - Adjust if needed before going live

### Updating Pricing

1. **Communicate Changes**:
   - Notify users before significant price increases
   - Update documentation with new rates
   - Consider grandfathering existing projects

2. **Choose Effective Date**:
   - Changes take effect immediately upon saving
   - For scheduled changes, note the time and update manually

3. **Monitor Impact**:
   - Watch extraction volume after price changes
   - Review cost logs to ensure calculations are correct
   - Be prepared to roll back if issues arise

### Pricing Recommendations

#### Text Extractors

| Model Type | Recommended Price Range |
|------------|------------------------|
| Fast/Basic OCR | $0.0005 - $0.002 per page |
| Standard OCR | $0.001 - $0.005 per page |
| Premium OCR | $0.005 - $0.015 per page |

#### LLM Models

| Model Tier | Input Price Range | Output Price Range |
|-----------|------------------|-------------------|
| Fast/Small (GPT-4o-mini, Qwen) | $0.05 - $0.50 per 1M | $0.10 - $1.50 per 1M |
| Mid-Tier (GPT-4o, Claude Haiku) | $0.50 - $5.00 per 1M | $1.50 - $15.00 per 1M |
| Premium (GPT-4-turbo, Claude Opus) | $5.00 - $30.00 per 1M | $15.00 - $150.00 per 1M |

### Minimum Charge Guidelines

**When to set minimum charges**:
- Very small documents (1-2 pages)
- High fixed costs per API call
- Want to discourage tiny extraction jobs

**Recommended minimums**:
- Text Extractor: $0.01 - $0.05 per document
- LLM: $0.03 - $0.10 per extraction

---

## Troubleshooting

### "Pricing Not Set" Error

**Cause**: Model has no pricing configured.

**Solution**:
1. Go to Model Pricing Configuration
2. Find the model and click Edit
3. Enter pricing values and save

### Cost Calculations Seem Wrong

**Check**:
1. Verify pricing values are correct
2. Ensure currency is set properly
3. Check minimum charge isn't unexpectedly high
4. Review actual token/page counts from extraction logs

### Can't Find Pricing Section

**Possible causes**:
- Not logged in as admin
- Project doesn't have any models configured
- UI permissions issue

**Solution**:
- Verify admin role in user profile
- Add models first in project settings
- Refresh the page

### Historical Cost Reports Show Wrong Values

**This shouldn't happen** because:
- Each extraction records pricing at time of execution
- Historical pricing is preserved in pricing history
- Cost logs use recorded pricing, not current pricing

**If it does happen**:
1. Check for data migration issues
2. Verify pricing history is intact
3. Review extraction records for `pricing` field

---

## API Access

Admins can also update pricing via API:

```http
PATCH /api/extractors/:id
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "config": {
    "pricing": {
      "mode": "page",
      "pricePerPage": 0.001,
      "currency": "USD",
      "minimumCharge": 0.01
    }
  }
}
```

```http
PATCH /api/models/:id/pricing
Authorization: Bearer <admin-token>
Content-Type: application/json

{
  "llm": {
    "inputPrice": 2.50,
    "outputPrice": 10.00,
    "currency": "USD",
    "minimumCharge": 0.05
  }
}
```

See [OCR Preview and Selective Extraction API](./OCR_PREVIEW_AND_SELECTIVE_EXTRACTION_API.md) for full API documentation.
