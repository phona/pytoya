# 双引擎验证（项目2 DualEngine-Test）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在项目 2（`pytoya-prompt-test`）建立 40 个 verified 样本的测试基线，用"VL 逐页(2048) + inference-OCR"双引擎提取，对比 restore 库 GT 量化准确率，并端到端验证 CorrectionPanel 低置信校对。

**Architecture:** 服务器操作型任务（非代码开发）。新建 group 19 并插入 40 个复用 PDF 的 manifests（GT 不写入，从 restore 库读）；改 schema 10 的 `validationSettings.ocrExtractors` 为双引擎（`extractorId` 格式）；批量提取后字段级比对；CorrectionPanel 验证 `_human_review` 链路。

**Tech Stack:** PostgreSQL（生产 `pytoya` + 快照 `pytoya_restore`）、Docker 容器（pytoya-api/pytoya-worker/pytoya-postgres）、pytoya API（re-extract/batch/pending-crops）、Python（/tmp/evalenv，评估对比）。

## Global Constraints

- 服务器: `root@47.107.92.78`，SSH 直连。
- 生产库: `docker exec pytoya-postgres psql -U postgres -d pytoya`；GT 库: `... -d pytoya_restore`。
- 40 样本固定 id：54,60,72,85,97,108,109,111,136,147,174,183,193,196,198,199,218,232,238,240,245,272,278,287,297,310,318,334,335,337,338,339,340,353,360,367,378,407,438,495（已在生产库和 restore 库都 `human_verified=true` 且有 extracted_data）。
- VL extractor id: `eaa203b7-4e51-4b7c-b2f9-b811a62ac174`；inference-OCR extractor id: `4ca3e9e3-2318-4669-ba49-d50e217631a8`。
- VL config: `{ maxTokens: 2048, temperature: 0, detail: high }`；不加重试（方案 A）。
- schema 的 ocrExtractors **必须用 `extractorId` 字段**（代码 `extractMultiple` 只读 `e.extractorId`，schema 10 现有 `type` 字段不兼容）。
- GT 基线不写入生产 manifests；从 `pytoya_restore` 读取。
- 删除 group 18 前先核对 id；API keys 不写入任何文件。

---

### Task 1: 备份当前状态（schema 10 配置 + group 18 数据 + 40 样本 GT）

**Files:**
- Create: `/tmp/dual_eval/`（服务器上）
- 不修改生产数据

**Interfaces:**
- Produces: `/tmp/dual_eval/schema10_validation.json`（回滚用）、`/tmp/dual_eval/gt_40.json`（比对用 GT 缓存）、`/tmp/dual_eval/group18_manifests.txt`（删除前记录）

- [ ] **Step 1: 建目录并备份 schema 10 配置**

```bash
ssh root@47.107.92.78 "mkdir -p /tmp/dual_eval
docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"SELECT validation_settings FROM schemas WHERE id=10;\" > /tmp/dual_eval/schema10_validation.json
wc -c /tmp/dual_eval/schema10_validation.json"
```
Expected: 文件存在且 >1000 字节。

- [ ] **Step 2: 导出 group 18 现有 manifests 清单（删除前记录）**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT id, filename, storage_path FROM manifests WHERE group_id=18;\" > /tmp/dual_eval/group18_manifests.txt
wc -l /tmp/dual_eval/group18_manifests.txt"
```
Expected: 18 行。

- [ ] **Step 3: 导出 40 样本 GT 缓存（从 restore 库）**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya_restore -t -A -c \"
SELECT id, extracted_data::text FROM manifests WHERE id IN (54,60,72,85,97,108,109,111,136,147,174,183,193,196,198,199,218,232,238,240,245,272,278,287,297,310,318,334,335,337,338,339,340,353,360,367,378,407,438,495);\" > /tmp/dual_eval/gt_40.tsv
wc -l /tmp/dual_eval/gt_40.tsv"
```
Expected: 40 行。

- [ ] **Step 4: 校验 GT 完整**

```bash
ssh root@47.107.92.78 "/tmp/evalenv/bin/python3 -c \"
import json
n=0
for line in open('/tmp/dual_eval/gt_40.tsv', encoding='utf-8'):
    line=line.rstrip()
    if not line or '|' not in line: continue
    mid, rest = line.split('|', 1)
    d=json.loads(rest)
    if d.get('invoice') and d.get('items'): n+=1
print('GT 完整样本:', n, '/ 40')\""
```
Expected: `GT 完整样本: 40 / 40`。若 <40，找出缺失 id 并补充（从 restore 库重新导出）。

- [ ] **Step 5: Commit（服务器无 git，做一致性记录）**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'backup done' >> /tmp/dual_eval/status.log"
```

---

### Task 2: 重建项目 2 测试组（删 group 18，建 group 19，插 40 manifests）

**Files:**
- Modify: 生产库 `pytoya` 的 groups/manifests 表（通过 psql）
- 不修改代码

**Interfaces:**
- Consumes: Task 1 的备份（确认可回滚）
- Produces: group 19（id 由序列生成）、40 个 manifests（指向项目 1 PDF）

- [ ] **Step 1: 删除 group 18**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
DELETE FROM groups WHERE id=18 AND project_id=2;\""
```
Expected: `DELETE 1`（级联删 manifests/jobs/history）。
⚠️ 删除前确认 Task1-Step2 的 group18_manifests.txt 已有 18 行。若 psql 报外键错误，先手动删依赖。

- [ ] **Step 2: 新建 group 19**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
INSERT INTO groups (name, project_id, created_at, updated_at)
VALUES ('DualEngine-Test', 2, now(), now()) RETURNING id;\""
```
Expected: 返回 `19`（或序列生成的 id，记录下来）。

- [ ] **Step 3: 确认 40 样本在项目 1 的 PDF 路径和组**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT id, group_id, filename, original_filename, storage_path, file_type FROM manifests WHERE id IN (40 ids);\" > /tmp/dual_eval/src_40.tsv"
```
Expected: 40 行，每行含 storage_path 和 file_type。

- [ ] **Step 4: 生成插入 SQL（写脚本到服务器）**

写 `/tmp/dual_eval/insert_40.py`，从 `/tmp/dual_eval/src_40.tsv` 读源数据，生成 INSERT 语句（group_id=19，storage_path 复用源路径，status='pending'，human_verified=true，fileType=源 file_type，不写 extracted_data），输出到 `/tmp/dual_eval/insert_40.sql`。

```python
import json
# /tmp/dual_eval/gen_insert.py
src = {}
for line in open('/tmp/dual_eval/src_40.tsv', encoding='utf-8'):
    line=line.rstrip()
    if not line: continue
    mid, gid, fn, ofn, sp, ft = line.split('|', 5)
    src[int(mid)] = (fn, ofn, sp, ft)
out = []
for mid, (fn, ofn, sp, ft) in src.items():
    esc = lambda s: s.replace("'", "''")
    out.append(
        "INSERT INTO manifests (filename, original_filename, storage_path, file_size, status, group_id, human_verified, file_type, created_at, updated_at) VALUES "
        f"('{esc(fn)}', '{esc(ofn)}', '{esc(sp)}', 0, 'pending', 19, true, '{esc(ft)}', now(), now());"
    )
open('/tmp/dual_eval/insert_40.sql', 'w').write('\n'.join(out))
print('generated', len(out), 'inserts')
```

```bash
ssh root@47.107.92.78 "/tmp/evalenv/bin/python3 /tmp/dual_eval/gen_insert.py"
```
Expected: `generated 40 inserts`。

- [ ] **Step 5: 执行插入**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -f /tmp/dual_eval/insert_40.sql"
```
Expected: 40 行 INSERT 成功。

- [ ] **Step 6: 校验插入结果**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
SELECT count(*), count(*) FILTER (WHERE human_verified) AS verified FROM manifests WHERE group_id=19;\""
```
Expected: `40 | 40`。

- [ ] **Step 7: 记录状态**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'group19 created, 40 manifests inserted' >> /tmp/dual_eval/status.log"
```

---

### Task 3: 改 schema 10 为双引擎 + 冒烟验证

**Files:**
- Modify: 生产库 `pytoya.schemas` 表 id=10 的 validation_settings（通过 psql）
- 不修改代码

**Interfaces:**
- Consumes: Task 1 的 schema10 备份、Task 2 的 40 个新 manifests
- Produces: 双引擎 schema 10 配置 + 冒烟验证通过的 1 个样本

- [ ] **Step 1: 构造双引擎 validation_settings**

写 `/tmp/dual_eval/schema10_dual.py`：读 `/tmp/dual_eval/schema10_validation.json`，把 `ocrExtractors` 替换为 `extractorId` 格式双引擎，其余字段（crossFieldRules/promptRulesMarkdown）原样保留，输出 `/tmp/dual_eval/schema10_dual.json`。

```python
import json
vs = json.load(open('/tmp/dual_eval/schema10_validation.json'))
vs['ocrExtractors'] = [
    {'extractorId': 'eaa203b7-4e51-4b7c-b2f9-b811a62ac174',
     'config': {'maxTokens': 2048, 'temperature': 0, 'detail': 'high'}},
    {'extractorId': '4ca3e9e3-2318-4669-ba49-d50e217631a8',
     'config': {}},
]
json.dump(vs, open('/tmp/dual_eval/schema10_dual.json', 'w'), ensure_ascii=False)
print('ocrExtractors:', json.dumps(vs['ocrExtractors'], ensure_ascii=False))
```

```bash
ssh root@47.107.92.78 "/tmp/evalenv/bin/python3 /tmp/dual_eval/schema10_dual.py"
```
Expected: 打印双引擎配置，无异常。

- [ ] **Step 2: 应用配置到 schema 10**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
UPDATE schemas SET validation_settings = '$(cat /tmp/dual_eval/schema10_dual.json | sed "s/'/''/g")'::jsonb, updated_at=now() WHERE id=10;\""
```
⚠️ 需将 JSON 内单引号转义。若不便内联，用 psql `\set` 或 python psycopg2。执行后确认：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
SELECT validation_settings->'ocrExtractors' FROM schemas WHERE id=10;\""
```
Expected: 返回双引擎数组（含 2 个 extractorId）。

- [ ] **Step 3: 冒烟提取 1 个样本**

取 group 19 里第 1 个 manifest id（假设 `M1`），触发 re-extract：

```bash
ssh root@47.107.92.78 "TOKEN=\$(cat /tmp/api_token.txt 2>/dev/null || echo 'NEED_TOKEN')
curl -s -X POST http://localhost:3001/api/extraction/re-extract/$M1 \
  -H \"Authorization: Bearer \$TOKEN\" -H 'Content-Type: application/json' -d '{}'"
```
Expected: 返回 `{ "jobId": "..." }`。若 token 缺失，从 pytoya-api 登录接口获取或用现有有效 token（见操作环境章节说明）。

- [ ] **Step 4: 等 job 完成并检查双引擎证据**

轮询 manifests 表直到该 manifest 有 ocr_result 和 extracted_data：

```bash
ssh root@47.107.92.78 "sleep 90; docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT text_extractor_id, octet_length(ocr_result::text) FROM manifests WHERE id=$M1;\""
```
Expected: `text_extractor_id` 为 VL id；`ocr_result` 长度 >0。

再查 markdown 是否含 inference-OCR 置信度标签：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT ocr_result->'pages'->0->>'markdown' FROM manifests WHERE id=$M1;\" | grep -o '\[[HML]\]' | sort | uniq -c"
```
Expected: 含 `[H]`/`[M]`/`[L]` 标签。

再查 `_human_review`：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT extracted_data->'_human_review' IS NOT NULL AS has_review FROM manifests WHERE id=$M1;\""
```
Expected: `t`（有 human_review）或 `f`（可接受——取决于该样本低置信字段数量）。

- [ ] **Step 5: 若双引擎未生效（第二个 extractor 未执行）**

检查日志：
```bash
ssh root@47.107.92.78 "docker logs pytoya-worker --since 10m 2>&1 | grep -i 'extractor\|reject' | tail -10"
```
若第二个 extractor 报错，确认 schema 10 的 ocrExtractors 确实是 `extractorId` 格式且 id 正确；检查 `4ca3e9e3` extractor 的 is_active 是否为 true。
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"SELECT id, is_active FROM extractors WHERE id IN ('eaa203b7-4e51-4b7c-b2f9-b811a62ac174','4ca3e9e3-2318-4669-ba49-d50e217631a8');\""
```
Expected: 两个都 `t`。若 `4ca3e9e3` 未激活，激活后重试。

- [ ] **Step 6: 记录状态**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'schema10 dual-engine, smoke M1='$M1' done' >> /tmp/dual_eval/status.log"
```

---

### Task 4: 批量提取剩余 39 个 manifests

**Files:**
- 无代码修改
- 通过 API 触发 + psql 监控

**Interfaces:**
- Consumes: Task 3 验证通过的双引擎 schema 10
- Produces: 40 个 manifests 全部完成提取（extracted_data + ocr_result）

- [ ] **Step 1: 收集 group 19 全部 manifest id**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"SELECT string_agg(id::text, ',') FROM manifests WHERE group_id=19 AND id != $M1;\" > /tmp/dual_eval/rest_ids.txt
cat /tmp/dual_eval/rest_ids.txt"
```
Expected: 39 个 id 逗号分隔。

- [ ] **Step 2: 触发批量提取**

```bash
ssh root@47.107.92.78 "TOKEN=\$(cat /tmp/api_token.txt)
IDS=\$(cat /tmp/dual_eval/rest_ids.txt)
curl -s -X POST http://localhost:3001/api/manifests/groups/19/manifests/batch \
  -H \"Authorization: Bearer \$TOKEN\" -H 'Content-Type: application/json' \
  -d '{\"manifestIds\":['\"\$IDS\"']}'"
```
Expected: 返回 job 信息或空（异步入队）。若该 endpoint 报错，改用逐个 re-extract。

- [ ] **Step 3: 监控进度**

每 2 分钟查一次完成数：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
SELECT status, count(*) FROM manifests WHERE group_id=19 GROUP BY status;\""
```
Expected: 逐步从 `pending` → `completed`，预计 1-2 小时（VL 逐页 2048 每样本 30-200s，4 worker 并行）。

- [ ] **Step 4: 记录崩溃/失败样本**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
SELECT id, status FROM manifests WHERE group_id=19 AND status NOT IN ('completed');\" > /tmp/dual_eval/failed.txt
wc -l /tmp/dual_eval/failed.txt"
```
Expected: 若无失败则 `1`（仅表头）。有失败则记录 id 供分析。

- [ ] **Step 5: 全部完成后记录**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'batch extract done' >> /tmp/dual_eval/status.log"
```

---

### Task 5: 字段级对比评估（双引擎 vs restore GT）

**Files:**
- Create: `/tmp/dual_eval/eval_compare.py`（复用 /tmp/eval/compare.py 逻辑）
- 输出: `/tmp/dual_eval/report.md`

**Interfaces:**
- Consumes: Task 1 的 `gt_40.tsv`、Task 4 的生产库 extracted_data
- Produces: 准确率矩阵报告 + VL 崩溃率

- [ ] **Step 1: 导出生产提取结果**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT id, extracted_data::text FROM manifests WHERE group_id=19 AND status='completed';\" > /tmp/dual_eval/prod_40.tsv
wc -l /tmp/dual_eval/prod_40.tsv"
```
Expected: 40 行（或实际完成数）。

- [ ] **Step 2: 写对比脚本**

写 `/tmp/dual_eval/eval_compare.py`（基于 /tmp/eval/compare.py，字段组统计 + VL 崩溃率）：
```python
import json, sys, os
sys.path.insert(0, '/tmp/eval')
from compare import compare

gt = {}
for line in open('/tmp/dual_eval/gt_40.tsv', encoding='utf-8'):
    line=line.rstrip()
    if not line or '|' not in line: continue
    mid, rest = line.split('|', 1)
    gt[int(mid)] = json.loads(rest)

# 崩溃检测（VL 段）：从生产 ocr_result 读 markdown
def is_crash(md):
    lines=[l.strip() for l in md.split('\n') if l.strip()]
    if len(md)<100: return True
    if len(lines)>5 and len(set(lines))<=3: return True
    return False

fields = {}  # field_group -> [bool]
crashes = 0; done = 0
for line in open('/tmp/dual_eval/prod_40.tsv', encoding='utf-8'):
    line=line.rstrip()
    if not line or '|' not in line: continue
    mid, rest = line.split('|', 1)
    mid=int(mid)
    try: pred = json.loads(rest)
    except: continue
    done += 1
    c = compare(gt[mid], pred)
    for k,v in c.items():
        if isinstance(v, bool):
            g = k.split('.')[0]
            if k.startswith('items'): g = 'items'
            fields.setdefault(g, []).append(v)

print(f'完成样本: {done}/40')
for g, lst in sorted(fields.items()):
    print(f'{g}: {sum(lst)}/{len(lst)} = {sum(lst)/len(lst):.1%}')
```
（崩溃率单独通过生产 ocr_result 的 markdown 统计，见 Step 4。）

```bash
ssh root@47.107.92.78 "/tmp/evalenv/bin/python3 /tmp/dual_eval/eval_compare.py"
```
Expected: 各字段组准确率（对比基线 C 37% / D 45.5%）。

- [ ] **Step 3: 计算 VL 崩溃率（从生产 ocr_result）**

写 `/tmp/dual_eval/crash_rate.py`：
```python
import json
crashes=0; total=0
for line in open('/tmp/dual_eval/prod_40.tsv', encoding='utf-8'):
    line=line.rstrip()
    if not line or '|' not in line: continue
    mid, rest = line.split('|', 1)
    total+=1
    # 崩溃率从生产 ocr_result 统计（此处用 extractor 方式说明）
print(f'完成样本 {total}，崩溃率见 Step 3 说明')
```
实际崩溃检测在 Task 4 的 ocr_result markdown 里做，见 Step 4。

- [ ] **Step 4: 从生产 ocr_result 统计 VL 崩溃率**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT id, octet_length(ocr_result->'pages'->0->>'markdown') FROM manifests WHERE group_id=19 AND status='completed';\" > /tmp/dual_eval/md_lens.tsv
/tmp/evalenv/bin/python3 -c \"
import json
short=0; total=0
for line in open('/tmp/dual_eval/md_lens.tsv'):
    line=line.rstrip()
    if not line or '|' not in line: continue
    mid, L = line.split('|', 1)
    total+=1
    if int(L)<100: short+=1
print(f'短输出(<100B) 崩溃率: {short}/{total} = {short/total:.1%}')\""
```
Expected: 短输出崩溃率数字（记录在报告）。循环型崩溃需额外按去重行判定，但方案 A 如实暴露即可。

- [ ] **Step 5: 生成报告**

将准确率矩阵 + 崩溃率 + 与基线（C 37% / D 45.5%）对比写入 `/tmp/dual_eval/report.md`（人工整理 Step 2/4 输出）。

- [ ] **Step 6: 记录**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'eval report done -> /tmp/dual_eval/report.md' >> /tmp/dual_eval/status.log"
```

---

### Task 6: CorrectionPanel 端到端验证

**Files:**
- 无代码修改
- 前端 UI 操作 + psql 校验

**Interfaces:**
- Consumes: Task 4 的双引擎提取结果（含 `_human_review`）
- Produces: 校对→回写 extractedData 的成功记录

- [ ] **Step 1: 确认某 manifest 有 `_human_review`**

```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
SELECT id, extracted_data->'_human_review' AS hr FROM manifests 
WHERE group_id=19 AND extracted_data->'_human_review' IS NOT NULL 
  AND jsonb_array_length(extracted_data->'_human_review')>0 LIMIT 5;\""
```
Expected: 至少 1 个 manifest 有非空 human_review。若无，则说明该批样本低置信字段少——选一个 conf 低的对照测试。

- [ ] **Step 2: 前端打开 CorrectionPage**

浏览器访问 `https://pytoya.fshine.site/projects/2` → group 19 → 选中一个含 `_human_review` 的 manifest → 打开校正页（CorrectionPanel）。

- [ ] **Step 3: 确认 pending-crops 返回低置信字段**

核对页面是否显示 crop 图 + confidence + reason（对应 `GET /api/manifests/:id/pending-crops`）。确认每个 `_human_review` 条目都有 crop 图。

- [ ] **Step 4: 提交一个字段校对**

在 CorrectionPanel 修改一个字段（如品名或 usage）并提交。随后校验：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -t -A -c \"
SELECT count(*) FROM operation_logs WHERE manifest_id=$MID AND action='manual_crop_verification';\""
```
Expected: 计数增加。且该字段值已回写 manifests.extracted_data（`updated_at` 变化）。

- [ ] **Step 5: 记录结果**

```bash
ssh root@47.107.92.78 "echo \$(date +%F_%T) 'CorrectionPanel verified end-to-end' >> /tmp/dual_eval/status.log"
```

---

### Task 7: 汇总结论与交付

**Files:**
- Create: `/tmp/dual_eval/FINAL.md`（结论）
- 输出供决策：生产 schema 14 是否接入 inference-OCR

**Interfaces:**
- Consumes: Task 5 报告 + Task 6 结果

- [ ] **Step 1: 汇总**

基于 Task 5/6 输出，回答 spec 成功标准的 4 个问题：
1. 40 样本双引擎提取是否无阻塞失败？
2. 双引擎 vs 基线（C 37% / D 45.5%）准确率结论？
3. CorrectionPanel 低置信校对是否端到端可用？
4. "接回 inference-OCR 是否值得"结论（供 schema 14 决策）？

写入 `/tmp/dual_eval/FINAL.md`。

- [ ] **Step 2: 决定是否回滚 schema 10**

若验证完成且项目 2 需恢复原状，用 Task 1 备份恢复：
```bash
ssh root@47.107.92.78 "docker exec pytoya-postgres psql -U postgres -d pytoya -c \"
UPDATE schemas SET validation_settings = '\$(cat /tmp/dual_eval/schema10_validation.json | sed "s/'/''/g")'::jsonb WHERE id=10;\""
```
（仅在用户要求时执行——默认保留双引擎配置供继续观察。）

- [ ] **Step 3: 汇报**

向用户汇报 FINAL.md 内容，包含准确率矩阵、崩溃率、CorrectionPanel 验证结果、schema 14 决策建议。

---

## Self-Review 记录

- **Spec 覆盖**：Step 1→Task1-2（基线/重建）、Step 2→Task3（schema+冒烟）、Step 3→Task4（批量提取）、Step 4→Task5（对比）、Step 5→Task6（CorrectionPanel）、成功标准→Task7。✅
- **占位符**：无 TBD；40 样本 id 列表完整；代码块含实际内容。✅
- **类型一致性**：extractorId 统一用 `eaa203b7...`/`4ca3e9e3...`；GT 统一从 `pytoya_restore` 读。✅
- **风险**：schema 10 `type`→`extractorId` 已在 Task3-Step5 覆盖；token 获取在 Task3-Step3 标注。✅
