# User Guide: OCR Preview and Selective Extraction

## Overview

The OCR Preview and Selective Extraction features allow you to:
- Preview OCR results before extraction to verify quality
- Selectively re-extract individual fields without re-processing the entire document
- Track extraction costs with breakdown between OCR and LLM operations
- Configure model pricing and view cost history

---

## Table of Contents

1. [Previewing OCR Results](#previewing-ocr-results)
2. [Understanding OCR Quality Scores](#understanding-ocr-quality-scores)
3. [Extracting Documents with Cost Tracking](#extracting-documents-with-cost-tracking)
4. [Selective Field Re-extraction](#selective-field-re-extraction)
5. [Cost Tracking and Budget Management](#cost-tracking-and-budget-management)
6. [Extraction History](#extraction-history)

---

## Previewing OCR Results

### What is OCR Preview?

OCR Preview shows you the raw text extracted from your PDF documents before running the more expensive LLM extraction. This helps you:
- Verify that the document was processed correctly
- Check the quality of text recognition
- Identify potential issues before spending money on extraction

### How to Preview OCR

1. **From the Manifests List**:
   - Navigate to your project's manifests page
   - Find the document you want to preview
   - Click the **👁️ Preview OCR** button

2. **From the Manifest Detail View**:
   - Open a manifest in the audit panel
   - Click the **OCR Preview** tab

### OCR Preview Tabs

The OCR Preview modal provides four tabs:

#### PDF Tab
- Displays the original PDF document
- Shows OCR quality badge in the header
- Useful for visual verification alongside extracted text

#### Raw Text Tab
- Shows the extracted text with line numbers
- **Search**: Find specific text in the document
- **Copy**: Copy all text to clipboard
- **Download**: Save text as a .txt file
- **Highlight Low Confidence**: Marks lines with low character confidence

#### Layout Tab
- Shows document structure analysis
- Displays layout elements (paragraphs, tables, etc.)
- Shows table detection results with row/column counts

#### Vision Analysis Tab
- Shows LLM-generated caption describing the document
- Lists detected fields with confidence scores
- Displays quality warnings if issues were detected

### Re-running OCR

If OCR quality is poor or you want to re-process with updated settings:

1. Open the OCR Preview modal
2. Click the **Run OCR** button (shown when OCR is missing or quality is low)
3. The document will be re-processed with the current OCR model

---

## Understanding OCR Quality Scores

The quality score (0-100) indicates how well the OCR processed your document:

### Quality Levels

| Score | Label | Meaning |
|-------|-------|---------|
| 90+ | Excellent | High confidence text detection, good layout analysis |
| 70-89 | Good | Acceptable quality, some minor issues |
| <70 | Poor | Low confidence, may need manual review or re-processing |

### Factors Affecting Quality Score

1. **Text Coverage** (30% weight)
   - Ratio of detected text to expected text based on page count
   - Higher is better

2. **Average Confidence** (40% weight)
   - Mean confidence of all detected text elements
   - From 0 to 1

3. **Layout Detection** (20% weight)
   - Whether layout elements and tables were detected
   - 1 if detected, 0 if not

4. **Language Match** (10% weight)
   - Whether the expected language was detected
   - 1 if matched, 0.6 if not detected

### Improving Quality Scores

If a document has a poor quality score:
1. Check if the PDF is readable (not scanned images)
2. Verify the PDF orientation is correct
3. Try re-running OCR with updated settings
4. For very poor scans, consider manual data entry

---

## Extracting Documents with Cost Tracking

### Extraction Cost Breakdown

Costs are now separated into two components:

#### OCR Cost
- Charged per page processed
- Typical rate: $0.001 per page (configurable)
- Example: 3 pages = $0.003

#### LLM Cost
- Charged per 1M tokens (input + output)
- Varies by model (e.g., GPT-4o: $2.50 input / $10.00 output per 1M)
- Example: 2400 input tokens + 480 output tokens = $0.0108

#### Total Cost
```
Total = OCR Cost + LLM Cost
```

### Starting an Extraction

1. **Single Document Extraction**:
   - Click the **[Extract→]** button on a manifest row
   - Review the cost estimate in the confirmation modal
   - Select the model and prompt template
   - Check the agreement checkbox
   - Click **Start Extraction**

2. **Bulk Extraction**:
   - Select multiple manifests using checkboxes
   - Click **Bulk Extract** button
   - Review aggregate cost estimate
   - Click **Start Extraction**

### Extraction Confirmation Modal

The modal shows:

- **Documents to Extract**: Count and total pages
- **Extraction Settings**:
  - Model selector with pricing display
  - Prompt template selector (optional)
- **Cost Estimate**:
  - OCR Cost (per page calculation)
  - LLM Cost (min-max range based on token estimate)
  - Total Estimated (min-max range)
- **Budget Warning**: Alerts if costs exceed or approach your budget
- **Confirmation Checkbox**: Must acknowledge costs will be incurred

### Monitoring Extraction Progress

The extraction progress view displays:

1. **Overall Progress**: Completion percentage and document count
2. **Current Document**: Which document is being processed with its progress
3. **Speed and ETA**: Processing rate and estimated completion time
4. **Cost Tracker**: Real-time cost accumulation with OCR/LLM breakdown
5. **Live Queue**: Visual badges showing completed and running jobs
6. **Controls**: Pause, Resume, Stop buttons

---

## Selective Field Re-extraction

### What is Field Re-extraction?

Instead of re-processing the entire document, you can re-extract a single field that had an incorrect value. This saves time and money by only extracting what's needed.

### When to Use Field Re-extraction

- A specific field has an incorrect value
- The OCR quality was poor for a particular region
- You want to test different prompts for a single field
- The extraction confidence for one field is low

### How to Re-extract a Field

1. **From the Manifest Detail View**:
   - Open the audit panel for a manifest
   - Find the field with the incorrect value
   - Click the **⟳ Re-extract** button next to the field

2. **From the Re-extract Dialog**:
   - You'll see the current value and OCR context
   - Optionally provide a custom prompt for this specific extraction
   - Review the cost estimate (typically $0.003-$0.010 per field)
   - Click **Re-extract Field**

3. **Monitor Progress**:
   - The field extraction job runs in the background
   - You'll be notified when it completes
   - The new value will replace the old one

### Field Re-extract Cost

Field re-extraction costs much less than full document extraction:
- Uses only the relevant OCR context (reduces input tokens)
- Smaller output (single field vs entire schema)
- Typical cost: $0.003-$0.010 depending on field complexity

---

## Cost Tracking and Budget Management

### Accessing Cost Information

1. **During Extraction**:
   - Real-time cost tracker in the progress view
   - Shows OCR cost, LLM cost, and accumulated total

2. **Cost Log Modal**:
   - Click "View Detailed Log" from the cost tracker
   - See chronological list of all extractions
   - View cost breakdown per document
   - Export cost log as CSV

3. **Monthly Summary**:
   - Total spent this month
   - Number of extractions
   - Average cost per document
   - Success rate

### Setting Budget Alerts

Budget warnings help you control spending:

1. **Near Budget** (yellow warning):
   - Shown when >80% of budget is used
   - Displays remaining budget amount

2. **Over Budget** (red warning):
   - Shown when estimated cost exceeds budget
   - Requires explicit acknowledgment before proceeding

### Cost Log Features

The Cost Log Modal provides:

- **Monthly Statistics**:
  - Budget progress bar
  - Total spent vs budget
  - Success rate
  - Average cost

- **Cost Breakdown Table**:
  - Date/time of each extraction
  - Document name
  - Model used
  - Pages processed
  - Token counts (input/output)
  - OCR cost
  - LLM cost
  - Total cost
  - Status (Done/Partial/Failed)

- **Export**:
  - Download full cost log as CSV
  - Useful for accounting and analysis

---

## Extraction History

### Viewing Extraction History

Each manifest maintains a history of all extraction attempts:

Tip: From the invoice form, click a field’s **History** button to open field-specific extraction history without leaving the form.

1. **Open Manifest Detail View**
2. **Click "Extraction History" tab**
3. **View Timeline** showing:
   - Extraction attempt number
   - Date/time
   - Model used
   - Status (Success/Partial/Failed)
   - Cost breakdown (OCR + LLM)
   - Duration

### Comparing Extraction Runs

1. Select up to 2 extraction runs by clicking the checkboxes
2. Click **Compare Runs** button
3. View side-by-side comparison of:
   - Extracted data differences
   - Cost differences
   - Duration differences
   - Model performance

### Re-running from History

You can re-run a previous extraction attempt:

1. Find the extraction run in history
2. Click **Re-run with Same Settings**
3. The system will queue a new job with the same:
   - Model
   - Prompt
   - Settings

---

## Tips and Best Practices

### Cost Optimization

1. **Use OCR Preview First**:
   - Verify OCR quality before spending on LLM extraction
   - Poor OCR = Poor extraction regardless of model

2. **Use Field Re-extraction**:
   - Fix individual fields instead of full re-extraction
   - Saves 80-90% compared to full document extraction

3. **Choose Models Wisely**:
   - Smaller models (GPT-4o-mini) cost 80-90% less
   - Reserve large models (GPT-4o, Claude) for complex documents

4. **Batch Similar Documents**:
   - Bulk extraction has better efficiency
   - Reduces per-document overhead

### Quality Assurance

1. **Check Quality Scores**:
   - Documents with scores <70 may need manual review
   - Consider re-running OCR for poor quality documents

2. **Review Low Confidence Fields**:
   - Fields with confidence <70% are marked with red borders
   - Use re-extract for these specific fields

3. **Validate Results**:
   - Use human verification for critical documents
   - Run validation scripts to catch common errors

### Workflow Recommendations

1. **For New Documents**:
   ```
   Upload → Preview OCR → Check Quality Score → Extract → Verify
   ```

2. **For Corrections**:
   ```
   Identify Error → Re-extract Field → Verify → Mark as Verified
   ```

3. **For Bulk Processing**:
   ```
   Select Documents → Get Cost Estimate → Set Budget → Extract → Monitor → Review Cost Log
   ```

---

## Troubleshooting

### OCR Preview Shows "Not Processed"

**Cause**: OCR hasn't been run for this document yet.

**Solution**: Click the **Run OCR** button in the preview modal.

### Cost Estimate Seems High

**Check**:
- Number of pages (more pages = higher OCR cost)
- Token estimate (longer documents = more tokens)
- Model pricing (check Model Pricing in admin settings)

### Field Re-extract Failed

**Possible causes**:
- Field name is invalid (check dot notation)
- OCR result is missing
- Model is not available

**Solution**: Ensure the document has OCR results first, then retry.

### Budget Warning Appears

**This is normal** - the system is alerting you before costs are incurred.

**Options**:
- Proceed if you're comfortable with the cost
- Deselect some documents to reduce cost
- Choose a less expensive model

---

## Glossary

- **OCR**: Optical Character Recognition - converting PDF images to text
- **LLM**: Large Language Model - AI model that extracts structured data
- **Token**: Unit of text for LLMs (roughly 4 characters)
- **Manifest**: A document or file being processed
- **Schema**: The structure/template for extracting data
- **Field Re-extraction**: Re-processing a single field instead of the entire document
- **Quality Score**: 0-100 score indicating OCR quality
