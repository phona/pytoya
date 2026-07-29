"""
Prototype: Qwen + RapidOCR cross-verification of table values.

Flow:
  1. Qwen3-VL-8B extracts structured table (what values, which row/col)
  2. RapidOCR detects all text on the page with pixel coordinates
  3. Match Qwen values to RapidOCR coordinates
  4. Crop cells using precise bounding boxes
  5. (optional) Run digit CNN on cropped cells
"""
import base64, json, urllib.request, cv2, numpy as np
import re, sys, os
from rapidocr_onnxruntime import RapidOCR

API_KEY = "sk-hsgodohacyuipxvjfnhjmueuqilxozajrxltabdpcllcurtr"

# ============ Step 1: Qwen OCR ============
def call_qwen(image_path):
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    
    payload = {
        "model": "Qwen/Qwen3-VL-8B-Instruct",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "auto"}},
            {"type": "text", "text": "提取采购申请单表格内容。按行输出：行号 | 品名 | 数量 | 建议采购单价。用 | 分隔。不要额外说明。"}
        ]}],
        "max_tokens": 2048,
        "temperature": 0.1
    }
    
    req = urllib.request.Request(
        "https://api.siliconflow.cn/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    )
    
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        text = result["choices"][0]["message"]["content"]
        print(f"\n[Qwen] Tokens: {result['usage']['prompt_tokens']}")
        return text

# ============ Step 2: RapidOCR detection ============
def rapid_detect(image_path):
    engine = RapidOCR()
    result = engine(image_path)
    if not result or not result[0]:
        print("[RapidOCR] No text detected")
        return []
    
    blocks = result[0]
    boxes = []
    for b in blocks:
        pts, txt, conf = b[0], b[1], b[2]
        if conf < 0.3:
            continue
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        boxes.append({
            "text": txt,
            "conf": round(conf, 3),
            "x": int(min(xs)), "y": int(min(ys)),
            "w": int(max(xs) - min(xs)), "h": int(max(ys) - min(ys)),
        })
    
    print(f"[RapidOCR] {len(boxes)} text blocks detected")
    return boxes

# ============ Step 3: Parse Qwen output into rows ============
def parse_qwen_table(qwen_text):
    """Parse Qwen's pipe-delimited table output."""
    rows = []
    for line in qwen_text.split('\n'):
        line = line.strip()
        if '|' not in line:
            continue
        parts = [p.strip() for p in line.split('|')]
        if not parts or not parts[0].isdigit():
            continue
        row_num = int(parts[0])
        row = {"num": row_num}
        if len(parts) >= 2:
            row["name"] = parts[1]
        if len(parts) >= 3:
            row["quantity"] = parts[2]
        if len(parts) >= 4:
            row["unit_price"] = parts[3]
        rows.append(row)
    
    return rows

# ============ Step 4: Match Qwen values to RapidOCR boxes ============
def find_row_positions(qwen_rows, ocr_boxes):
    """Use row numbers '1','2','3','4' in OCR boxes to find row y-positions.
    Then combine with template column positions to get cell coordinates."""
    
    # Find row number markers in OCR boxes
    row_markers = {}
    for box in ocr_boxes:
        txt = box["text"].strip()
        if txt.isdigit() and 1 <= int(txt) <= 4:
            row_markers[int(txt)] = box["y"]
    
    if not row_markers:
        # Fallback to template
        print("  [WARN] No row markers found, using template")
        return [(i, 1198 + i * 244) for i in range(1, 5)]
    
    # Calculate row positions
    # Sort by row number
    sorted_rows = sorted(row_markers.items())
    row_positions = []
    
    for rn, y_pos in sorted_rows:
        row_positions.append((rn, y_pos))
    
    # If we have only 1-2 markers but need more, estimate
    if len(row_positions) < 4:
        # Estimate row height from existing markers
        if len(row_positions) >= 2:
            heights = [row_positions[i+1][1] - row_positions[i][1] 
                      for i in range(len(row_positions)-1)]
            avg_h = np.mean(heights)
            last_y = row_positions[-1][1]
            while len(row_positions) < 4:
                next_rn = row_positions[-1][0] + 1
                row_positions.append((next_rn, int(last_y + avg_h)))
                last_y = row_positions[-1][1]
        else:
            # Single marker, use template
            first_y = row_positions[0][1]
            for rn in range(2, 5):
                row_positions.append((rn, int(first_y + (rn - 1) * 244)))
    
    return row_positions

def match_values(qwen_rows, ocr_boxes):
    """Match Qwen's values to table cell positions using row markers + template columns."""
    row_positions = find_row_positions(qwen_rows, ocr_boxes)
    
    # Column positions (relative to page)
    col_map = {
        "quantity": (680, 100),
        "unit_price": (800, 160),
    }
    
    matched = []
    
    for q_row in qwen_rows:
        rn = q_row["num"]
        
        # Find y-position for this row
        row_y = None
        for pos_rn, pos_y in row_positions:
            if pos_rn == rn:
                row_y = pos_y
                break
        
        if row_y is None:
            continue
        
        for field in ["quantity", "unit_price"]:
            val = q_row.get(field)
            if not val:
                continue
            
            cx, cw = col_map[field]
            
            # Row marker is at bottom of cell, data is above it
            # Crop ~60px above the marker to get the cell content
            box = {
                "x": cx,
                "y": row_y - 60,
                "w": cw,
                "h": 50,
                "text": val,
                "conf": 1.0,
            }
            
            # Also try to find matching OCR box for verification
            clean_val = val.replace('件', '').replace('个', '').strip()
            ocr_match = None
            for obox in ocr_boxes:
                if abs(obox["y"] - row_y) < 30 and abs(obox["x"] - cx) < 200:
                    obox_text = obox["text"].strip()
                    if clean_val in obox_text or obox_text in clean_val:
                        ocr_match = obox
                        break
            
            matched.append({
                "row": rn,
                "field": field,
                "qwen_value": val,
                "box": box,
                "ocr_match": ocr_match,
            })
    
    return matched

# ============ Step 5: Crop cells and verify ============
def crop_and_verify(image_path, matched_items):
    """Crop cells using matched RapidOCR boxes and save them."""
    img = cv2.imread(image_path, cv2.IMREAD_GRAYSCALE)
    if img is None:
        return
    
    crops = []
    for item in matched_items:
        box = item["box"]
        pad = 5
        y1 = max(0, box["y"] - pad)
        y2 = min(img.shape[0], box["y"] + box["h"] + pad)
        x1 = max(0, box["x"] - pad)
        x2 = min(img.shape[1], box["x"] + box["w"] + pad)
        
        cell = img[y1:y2, x1:x2]
        if cell.size > 0:
            label = f"r{item['row']}_{item['field']}_{item['qwen_value']}.png"
            path = f"/tmp/cross_crops/{label}"
            os.makedirs("/tmp/cross_crops", exist_ok=True)
            cv2.imwrite(path, cell)
            ocr_txt = item['ocr_match']['text'] if item.get('ocr_match') else 'no_ocr'
            crops.append({"label": label, "qwen": item['qwen_value'], 
                          "ocr": ocr_txt, "size": cell.shape})
    
    return crops

# ============ Main ============
if __name__ == "__main__":
    image = sys.argv[1] if len(sys.argv) > 1 else "/tmp/manifest_690_raw.png"
    
    # Fix: use the server page if local doesn't exist
    if not os.path.exists(image):
        image = "/tmp/test_692_pg.png"
    if not os.path.exists(image):
        print(f"Image not found: {image}")
        sys.exit(1)
    
    print("=" * 50)
    print("Step 1: Qwen3-VL-8B table extraction")
    print("=" * 50)
    qwen_text = call_qwen(image)
    print(qwen_text)
    
    rows = parse_qwen_table(qwen_text)
    print(f"\nParsed {len(rows)} rows")
    
    print("\n" + "=" * 50)
    print("Step 2: RapidOCR text detection")
    print("=" * 50)
    boxes = rapid_detect(image)
    
    # Show boxes in the table area
    table_boxes = [b for b in boxes if 1000 < b["y"] < 2500]
    print(f"Table area boxes ({len(table_boxes)}):")
    for b in sorted(table_boxes, key=lambda x: (x["y"], x["x"]))[:15]:
        print(f"  [{b['conf']}] '{b['text']}' @ ({b['x']}, {b['y']}) {b['w']}x{b['h']}")
    
    print("\n" + "=" * 50)
    print("Step 3: Value matching")
    print("=" * 50)
    matched = match_values(rows, boxes)
    for m in matched:
        ocr_info = f"OCR='{m['ocr_match']['text']}'" if m['ocr_match'] else "no OCR match"
        print(f"  Row {m['row']} {m['field']}: Qwen='{m['qwen_value']}' | {ocr_info} | crop @ ({m['box']['x']},{m['box']['y']})")
    
    print("\n" + "=" * 50)
    print("Step 4: Crop cells")
    print("=" * 50)
    crops = crop_and_verify(image, matched)
    for c in crops:
        print(f"  Saved: {c['label']} ({c['size'][1]}x{c['size'][0]})")
