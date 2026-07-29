"""
Final prototype: Qwen + PaddleOCR detection boxes for 0-hardcode cell cropping.

No hardcoded widths, heights, or y-offsets.
1. Qwen extracts structured table values
2. PaddleOCR detects ALL text with bounding boxes (low thresholds)
3. Match: Qwen's values ↔ PaddleOCR's detection boxes
4. Crop exactly at the detection box coordinates
"""
import base64, json, urllib.request, cv2, numpy as np
import os, sys, subprocess, re

API_KEY = "sk-hsgodohacyuipxvjfnhjmueuqilxozajrxltabdpcllcurtr"
os.environ["LD_PRELOAD"] = "/lib64/libz.so.1"

def r(cmd):
    return subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.strip()

def call_qwen(image_path):
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    payload = {
        "model": "Qwen/Qwen3-VL-8B-Instruct",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "auto"}},
            {"type": "text", "text": "提取采购申请单表格，按行输出：行号|品名|数量|建议采购单价|成本中心代码|采购主帐号。用 | 分隔。"}
        ]}],
        "max_tokens": 2048, "temperature": 0.1
    }
    req = urllib.request.Request(
        "https://api.siliconflow.cn/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=120) as resp:
        result = json.loads(resp.read())
        return result["choices"][0]["message"]["content"]

def detect_boxes(image_path):
    """Use PaddleOCR with low thresholds to get all text boxes."""
    from paddleocr import PaddleOCR
    ocr = PaddleOCR(show_log=False, lang="ch", use_angle_cls=False,
                    det_db_thresh=0.1, det_db_box_thresh=0.2)
    result = ocr.ocr(image_path, cls=False)
    
    boxes = []
    if result and result[0]:
        for line in result[0]:
            pts, (txt, conf) = line
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            boxes.append({
                "text": txt, "conf": round(conf, 3),
                "x": int(min(xs)), "y": int(min(ys)),
                "w": int(max(xs) - min(xs)),
                "h": int(max(ys) - min(ys)),
            })
    return boxes

def parse_qwen(qwen_text):
    rows = []
    for line in qwen_text.split('\n'):
        parts = [p.strip() for p in line.split('|')]
        if parts and parts[0].isdigit():
            row = {"num": int(parts[0])}
            if len(parts) >= 2: row["name"] = parts[1]
            if len(parts) >= 3: row["quantity"] = parts[2]
            if len(parts) >= 4: row["unit_price"] = parts[3]
            if len(parts) >= 5: row["cost_center"] = parts[4]
            if len(parts) >= 6: row["account"] = parts[5]
            rows.append(row)
    return rows

def match_values(rows, boxes):
    """Match Qwen values to PaddleOCR detection boxes by text content."""
    matched = []
    for row in rows:
        for field in ["quantity", "unit_price", "cost_center", "account"]:
            val = row.get(field)
            if not val:
                continue
            
            clean = val.replace('件', '').replace('个', '').replace('袋', '').strip()
            
            # Find the best matching box
            best = None
            best_score = 0
            
            for bx in boxes:
                score = 0
                btxt = bx["text"].strip()
                
                # Exact match
                if clean == btxt:
                    score = 1.0
                # Qwen value contains OCR text or vice versa
                elif clean in btxt or btxt in clean:
                    # Check digit overlap
                    score = 0.7
                # Partial digit match
                elif clean.replace('.','').isdigit() and btxt.replace('.','').isdigit():
                    if clean[:3] == btxt[:3]:
                        score = 0.5
                
                if score > best_score:
                    best_score = score
                    best = bx
            
            if best and best_score > 0.4:
                matched.append({
                    "row": row["num"], "field": field,
                    "qwen": val, "ocr": best["text"],
                    "box": best, "score": best_score,
                })
    return matched

if __name__ == "__main__":
    img_path = sys.argv[1] if len(sys.argv) > 1 else "/tmp/test_692_pg-1.png"
    
    print("1. Qwen extracts table...")
    qwen_text = call_qwen(img_path)
    print(qwen_text)
    rows = parse_qwen(qwen_text)
    
    print(f"\n2. PaddleOCR detection (thresh=0.1)...")
    boxes = detect_boxes(img_path)
    print(f"   Found {len(boxes)} text blocks")
    
    # Show boxes near table data area
    table_boxes = [b for b in boxes if 1900 < b["y"] < 2300]
    for b in sorted(table_boxes, key=lambda x: (x["y"], x["x"])):
        print(f"   [{b['conf']}] '{b['text']}' @ ({b['x']},{b['y']}) {b['w']}x{b['h']}")
    
    print(f"\n3. Matching Qwen values to OCR detection boxes...")
    matched = match_values(rows, boxes)
    
    print(f"\n4. Cropping cells at exact detection box coordinates...")
    img = cv2.imread(img_path, cv2.IMREAD_GRAYSCALE)
    os.makedirs("/tmp/v2_crops", exist_ok=True)
    
    for m in matched:
        bx = m["box"]
        pad = 3
        y1 = max(0, bx["y"] - pad)
        y2 = min(img.shape[0], bx["y"] + bx["h"] + pad)
        x1 = max(0, bx["x"] - pad)
        x2 = min(img.shape[1], bx["x"] + bx["w"] + pad)
        
        cell = img[y1:y2, x1:x2]
        if cell.size > 0:
            fname = f"r{m['row']}_{m['field']}_{m['qwen']}.png"
            cv2.imwrite(f"/tmp/v2_crops/{fname}", cell)
            _, bin = cv2.threshold(cell, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            dark = (bin > 0).mean() * 100
            print(f"   ✓ {fname}: OCR='{m['ocr']}' box=({bx['x']},{bx['y']}) {bx['w']}x{bx['h']} dark={dark:.1f}%")
        else:
            print(f"   ✗ r{m['row']}_{m['field']}: empty cell at ({bx['x']},{bx['y']})")
