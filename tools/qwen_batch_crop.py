"""
Batch crop cells from manifests using Qwen percentage coordinates.
Small batch for user review.
"""
import base64, json, urllib.request, cv2, numpy as np, os, sys, re, subprocess

API_KEY = "sk-hsgodohacyuipxvjfnhjmueuqilxozajrxltabdpcllcurtr"

def r(cmd):
    return subprocess.run(cmd, shell=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True).stdout.strip()

def get_page(manifest_id):
    """Get rendered page for a manifest. Returns local path."""
    spath = r('ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \\"SELECT storage_path FROM manifests WHERE id=' + str(manifest_id) + ';\\""')
    if not spath or "/app/uploads/" not in spath:
        return None
    pdf_path = spath.replace("/app/uploads/", "/root/pytoya/data/uploads/", 1)
    
    r('ssh root@47.107.92.78 "pdftoppm -png -r 200 -f 1 -l 1 \\"' + pdf_path + '\\" /tmp/qcrop_p' + str(manifest_id) + ' 2>/dev/null"')
    r('scp root@47.107.92.78:/tmp/qcrop_p' + str(manifest_id) + '-1.png /tmp/qcrop_' + str(manifest_id) + '.png 2>/dev/null')
    
    local = f"/tmp/qcrop_{manifest_id}.png"
    if os.path.exists(local):
        return local
    return None

def extract_table(image_path):
    """Qwen extracts table with percentage coordinates."""
    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()
    
    prompt = '''以JSON数组输出采购单第1页表格数据行的值和坐标。只输出4列：品名、数量、单价、总额。格式：[{"row":1,"cells":[{"field":"品名","value":"xx","x1_pct":0,"y1_pct":0,"x2_pct":0,"y2_pct":0},...]}]
坐标是百分比(0-1)。只输出JSON不要其他文字。无表格则输出[]。'''
    
    payload = {
        "model": "Qwen/Qwen3-VL-8B-Instruct",
        "messages": [{"role": "user", "content": [
            {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{b64}", "detail": "high"}},
            {"type": "text", "text": prompt}
        ]}],
        "max_tokens": 4096,
        "temperature": 0
    }
    
    req = urllib.request.Request(
        "https://api.siliconflow.cn/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"}
    )
    
    with urllib.request.urlopen(req, timeout=180) as resp:
        result = json.loads(resp.read())
        text = result["choices"][0]["message"]["content"]
        return text

def parse_table(text):
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*', '', text)
    start = text.find('[')
    end = text.rfind(']')
    if start >= 0 and end > start:
        return json.loads(text[start:end+1])
    return None

# ============ Pick manifests ============
# Select a few with known correction records (handwritten data)
mids = [615, 690, 692, 635, 636]
out_dir = "/tmp/qwen_sample"
os.makedirs(out_dir, exist_ok=True)

total = 0
for mid in mids:
    print(f"\n=== Manifest {mid} ===")
    
    page = get_page(mid)
    if not page:
        print("  No page")
        continue
    
    img = cv2.imread(page, cv2.IMREAD_GRAYSCALE)
    if img is None:
        continue
    
    result = extract_table(page)
    table = parse_table(result)
    if not table:
        print(f"  Qwen parse failed: {result[:200]}")
        continue
    
    h, w = img.shape
    count = 0
    for row in table:
        rn = row.get("row", "?")
        for cell in row.get("cells", []):
            value = cell.get("value")
            field = cell.get("field", "")
            if not value or value == "null":
                continue
            
            x1 = int(float(cell["x1_pct"]) * w)
            y1 = int(float(cell["y1_pct"]) * h)
            x2 = int(float(cell["x2_pct"]) * w)
            y2 = int(float(cell["y2_pct"]) * h)
            
            if x2 <= x1 or y2 <= y1:
                continue
            
            pad = 3
            crop = img[max(0,y1-pad):min(h,y2+pad), max(0,x1-pad):min(w,x2+pad)]
            if crop.size == 0:
                continue
            
            safe_field = re.sub(r'[\\/:*?"<>|]', '_', field)
            safe_val = str(value).replace('.', 'p').replace('/', '_')
            fname = f"m{mid}_r{rn}_{safe_field}_{safe_val}.png"
            cv2.imwrite(f"{out_dir}/{fname}", crop)
            count += 1
    
    print(f"  {count} cells")
    total += count
    os.remove(page)

# Stats
print(f"\n{'='*40}")
print(f"Total cells: {total}")
print(f"Location: {out_dir}/")

# Check file sizes
import os as _os
sizes = [(_os.path.getsize(f"{out_dir}/{f}"), f) for f in _os.listdir(out_dir) if f.endswith(".png")]
sizes.sort()
print(f"\nSmallest 5:")
for sz, fn in sizes[:5]:
    print(f"  {fn}: {sz}B")
print(f"\nLargest 5:")
for sz, fn in sizes[-5:]:
    print(f"  {fn}: {sz}B")
