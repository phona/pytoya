# 单 VL 对照实验（SingleVL-Control）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. 本计划是 `2026-08-02-dual-engine-eval.md` 的补充对照实验，执行模式沿用前者（SSH 直连、`docker exec -i ... psql`、token 不落报告、status.log 记录）。

**Goal:** 在同一 40 PDF、同一 GT（pytoya_restore）、同一 compare 脚本、同一生产链路下，仅改变"有无 inference-OCR"一个变量，量化双引擎 vs 单 VL 字段级准确率差异，供 schema 14 决策。

**Architecture:** 新建 group 20（SingleVL-Control，复用 group 19 同一批 PDF）→ schema 10 临时改单 VL（逐页 2048，与双引擎 VL 臂配置逐字一致）→ 提取 group 20 → 立即恢复 schema 10 双引擎 → 字段级 + 配对样本对比。group 19 双引擎结果原样保留为 A 臂。

## Global Constraints

- 沿用双引擎计划全部约束：服务器 root@47.107.92.78；生产库 `docker exec pytoya-postgres psql -U postgres -d pytoya`；GT 只从 pytoya_restore 读（缓存 /tmp/dual_eval/gt_40.tsv）；40 样本固定 id 列表不变；token/密钥不写入任何报告。
- 单 VL ocrExtractors 必须只含一个元素：`[{"extractorId":"eaa203b7-4e51-4b7c-b2f9-b811a62ac174","config":{"maxTokens":2048,"temperature":0,"detail":"high"}}]`（extractorId 格式，与双引擎 VL 臂逐字一致）。
- schema 10 单引擎窗口尽量短：提取完成立即用 /tmp/dual_eval/schema10_dual_before_control.json 恢复双引擎并验证。
- 批量接口 404 已知，直接用逐个 `POST /api/extraction/re-extract/:id`；token 在 /tmp/api_token.txt（7d，2026-08-02 签发）。
- 每个任务完成追加 /tmp/dual_eval/status.log。

---

### Task 1: 建 group 20 + 备份当前双引擎配置

- [ ] Step 1: 重新 dump 当前 schema 10 配置 → /tmp/dual_eval/schema10_dual_before_control.json（Expected: >4000B，ocrExtractors 为 2 元素双引擎数组）。
- [ ] Step 2: `INSERT INTO groups (name, project_id, created_at, updated_at) VALUES ('SingleVL-Control', 2, now(), now()) RETURNING id;` → 记录实际 id（下称 G20）。
- [ ] Step 3: 导出 group 19 的 40 条源数据 `SELECT id, filename, original_filename, storage_path, "fileType" FROM manifests WHERE group_id=19;` → /tmp/dual_eval/src_g20.tsv（40 行）。
- [ ] Step 4: 生成 INSERT（python：split('|',4)、转义单引号、group_id=G20、status='pending'、human_verified=true、file_size=0、now() 时间戳、**不含 extracted_data**）→ insert_g20.sql；`docker exec -i pytoya-postgres psql -U postgres -d pytoya -v ON_ERROR_STOP=1 < /tmp/dual_eval/insert_g20.sql`。
- [ ] Step 5: 校验 `SELECT count(*), count(*) FILTER (WHERE human_verified), count(*) FILTER (WHERE extracted_data IS NOT NULL) FROM manifests WHERE group_id=G20;` → 40 | 40 | 0。导出 group20_ids.txt（string_agg）。
- [ ] Step 6: status.log：'control: group G20 created, 40 manifests'。

### Task 2: schema 10 改单 VL + 冒烟（负对照）

- [ ] Step 1: 服务器端 python 读 schema10_dual_before_control.json，替换 ocrExtractors 为单 VL 数组（见 Global Constraints），其余键原样 → schema10_single.json → 生成 update SQL（单引号加倍）→ `docker exec -i ... psql -v ON_ERROR_STOP=1 <`（Expected: UPDATE 1）。
- [ ] Step 2: 验证 `SELECT validation_settings->'ocrExtractors' FROM schemas WHERE id=10;` → 单元素数组；`jsonb_object_keys` 仍为 3 键。
- [ ] Step 3: M = G20 首个 manifest id；`curl -s -X POST http://localhost:3001/api/extraction/re-extract/$M -H "Authorization: Bearer $(cat /tmp/api_token.txt)" -H 'Content-Type: application/json' -d '{}'`（token 失效则重新签发）。
- [ ] Step 4: 轮询（每 30s，上限 15min）至 ocr_result+extracted_data 非空。负对照证据：text_extractor_id = eaa203b7...；`ocr_result::text NOT LIKE '%inference-ocr%'`（Expected: 0 匹配）；page-0 markdown 无 [H]/[M]/[L] 标签（Expected: 0）。
- [ ] Step 5: 若出现 inference-ocr 痕迹 → BLOCKED 排查（配置未生效/缓存）。
- [ ] Step 6: status.log：'control: schema10 single-VL, smoke M=$M done'。

### Task 3: 提取剩余 39 + 监控

- [ ] Step 1: rest_ids = group20_ids 去掉 M；逐个 re-extract（0.5s 间隔）。
- [ ] Step 2: 服务器端循环每 2min 查 `SELECT status, count(*) FROM manifests WHERE group_id=G20 GROUP BY status;`，in-progress=0 或 75 轮（~2.5h）退出。
- [ ] Step 3: failed 重试一轮（OCR 已缓存，重跑 LLM 阶段）；再监控至稳定。
- [ ] Step 4: 最终 failed → /tmp/dual_eval/failed_sv.txt；worker 错误摘要（脱敏）。
- [ ] Step 5: status.log：'control: single-VL extract done, N completed / F failed'。

### Task 4: 恢复 schema 10 双引擎

- [ ] Step 1: python 用 schema10_dual_before_control.json 生成 update SQL → 执行（UPDATE 1）。
- [ ] Step 2: 验证 ocrExtractors 恢复 2 元素双引擎数组（extractorId 格式、VL config 2048/0/high、OCR config {}）；crossFieldRules/promptRulesMarkdown 与备份一致（python JSON 相等）。
- [ ] Step 3: status.log：'control: schema10 restored to dual-engine (single window: START..END)'。

### Task 5: 对比评估（A=双引擎 group19 / B=单VL group20）

- [ ] Step 1: 导出 B 臂完成样本 `SELECT id, extracted_data::text FROM manifests WHERE group_id=G20 AND status='completed';` → /tmp/dual_eval/prod_sv.tsv。
- [ ] Step 2: id_map_sv.tsv：`SELECT n.id, s.id FROM manifests n JOIN manifests s ON s.storage_path=n.storage_path WHERE n.group_id=G20 AND s.id IN (40 fixed ids);`（Expected: 40 行）。
- [ ] Step 3: 泛化 /tmp/dual_eval/eval_compare.py 接受参数（prod 文件、id_map 文件、输出前缀），对 B 臂出字段矩阵 + 崩溃率（短输出<100B / 循环）。
- [ ] Step 4: 配对对比脚本：按 source_id join 两臂都完成的样本，输出配对集 A vs B 全字段/分组准确率 + 逐字段 delta + 每样本胜负。
- [ ] Step 5: 写 /tmp/dual_eval/control_report.md：两臂各自矩阵、配对矩阵、delta、崩溃率、_human_review 命中数对比（信息项）、结论段落。
- [ ] Step 6: status.log：'control: eval done -> control_report.md'。

### Task 6: 更新 FINAL.md + 汇报

- [ ] Step 1: FINAL.md 增补"对照实验"章节：单 VL 绝对准确率、配对 delta、提升归因结论（inference-OCR 边际贡献 vs VL 调用修复）、修订 schema 14 建议。
- [ ] Step 2: 向用户汇报结论（含 A/B 矩阵与归因）。
