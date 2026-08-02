# 双引擎验证设计文档

**日期**: 2026-08-02
**项目**: pytoya（采购单 OCR 提取）
**范围**: 在项目 2（`pytoya-prompt-test`）验证"VL 逐页 + inference-OCR + 置信度路由"双引擎的真实准确率，并端到端跑通 CorrectionPanel 低置信校对。

## 背景与动机

- 生产 schema 14 为纯 VL（Qwen3-VL-8B）单引擎，无 inference-OCR。
- 此前 /tmp/eval 评估（30 样本 × 4 范式）显示双引擎 D 范式准确率最高（45.5%），但其评估脚本存在缺陷：多页图片共享 max_tokens 预算导致 VL 崩溃率虚高（67%）。
- 历史生产（478 样本，逐页调用，max_tokens 10240）崩溃率仅 15.3%，且为轻度（标题重复后恢复）。
- 用户实测：API `max_tokens=2048` 更稳，10240 易发散。
- 目标：在真实生产链路（逐页 + 2048）下量化双引擎真实价值，验证 `_human_review` 置信度路由端到端可用。

## 关键前提（已核实）

1. **GT 基线**：生产库 529 个 `human_verified=true` 样本中，仅 **397 个** 在 restore 库（7-19 快照）也 verified=true 且有 extracted_data。**抽样严格限制在 397 交集内**，排除 human_verified=false 及 restore 后新确认者。
2. **PDF 可复用**：397 交集样本的 PDF 在生产 uploads 全部存在（storage_path 是绝对路径，crops/pages 读取不受 project 隔离限制）。
3. **提取链路自动读 schema**：`extraction.service.ts:246` 从 `project.defaultSchemaId` 取 schema，`extraction.service.ts:252` 读 `schema.validationSettings.ocrExtractors`。改 schema 10 后批量提取自动用新配置。
4. **双引擎拼接已存在**：`extractMultiple` 并行跑多引擎，markdown 拼接保留置信度标签、bbox、layout elements、raw boxes。
5. **置信度路由闭环已存在**：`_human_review` → `crops.service.ts` 生成 pending crops（bbox 裁切/verified 去重）→ 前端 `CorrectionPanel` 校对 → `verifyCrop` 回写 extractedData + `onCorrection` 钩子。

## 决策点（已确认）

| 决策 | 选择 | 理由 |
|------|------|------|
| 验证环境 | 项目 2 + 新建 group + 复用 PDF | 测试项目，零生产风险 |
| 样本规模 | 40 个（从 397 交集随机抽） | 统计意义 + 时间可控 |
| 基线保存 | 不写生产库，GT 从 restore 库读 | 防重跑覆盖问题消失 |
| VL 崩溃重试 | **方案 A：不加重试** | 先暴露生产真实水平 |
| VL max_tokens | **2048** | 用户实测更稳 |
| schema 10 双引擎格式 | 冒烟验证，必要时 `type`→`extractorId` | schema 10 现用 `type` 字段，代码要 `extractorId` |

## 操作环境

### 服务器与入口
- **生产服务器**: `root@47.107.92.78`（SSH 直连）
- **前端**: https://pytoya.fshine.site （项目 2 = `/projects/2`）
- **API**: 服务器本机 `localhost:3001`（前端同域代理）
- **评估环境**: `/tmp/eval/`（脚本）、`/tmp/evalenv/`（venv，python3.6 + requests）
- **训练工作区**: `/mnt/e/pytoya-workspace`（只读参考，不改动）

### 容器（docker，服务器上）
| 容器 | 用途 |
|------|------|
| `pytoya-postgres` | PostgreSQL 15（生产库 `pytoya` + restore 快照库 `pytoya_restore`）|
| `pytoya-api` | API 服务（node v20，无 python）|
| `pytoya-worker` | 后台队列 worker（提取 job 在此执行）|
| `pytoya-web` | 前端静态服务 |
| `pytoya-redis` | 队列/缓存 |
| `ocr-service` | inference-OCR 本地服务，`http://ocr-service:8090/infer`（容器内）/ `localhost:8090`（宿主机）|

### 数据库访问
```bash
# 生产库
docker exec pytoya-postgres psql -U postgres -d pytoya
# restore 快照库（GT 权威来源）
docker exec pytoya-postgres psql -U postgres -d pytoya_restore
```

### 关键路径
- **PDF 宿主机根目录**: `/root/pytoya/data/uploads`（对应容器 `/app/uploads`）
- **PDF 路径映射**: 数据库 `storage_path` 形如 `/app/uploads/projects/1/groups/{gid}/manifests/{file}.pdf` → 宿主机 `/root/pytoya/data/uploads/projects/1/groups/{gid}/manifests/{file}.pdf`
- **当前生产提取结果备份**: `/tmp/prod_current_backup.tsv`

### 关键 extractor（生产 extractors 表）
| id | 名称 | 类型 | 说明 |
|----|------|------|------|
| `eaa203b7-4e51-4b7c-b2f9-b811a62ac174` | Qwen/Qwen3-VL-8B-Instruct | vision-llm | VL 引擎（siliconflow），本方案 config: maxTokens=2048/temp=0/detail=high |
| `4ca3e9e3-2318-4669-ba49-d50e217631a8` | OCR Service (Local) | inference-ocr | inference-OCR 引擎，默认 `http://localhost:8090` |
| `61d036a4-...` | Qwen/Qwen3-VL-32B-Instruct | vision-llm | 32B 备用（已测也崩溃，不用于本方案）|

### API keys（不写入仓库，运行时从配置读取）
- **VL（siliconflow）**: 从 `extractors.config.apiKey` 读取（eaa203b7 的 config 内）
- **DeepSeek**: 从服务器环境/配置读取（/tmp/eval 脚本中有引用）
- 设计文档**不包含明文 secret**；实现时通过现有配置链获取

### 触发提取的 API
- 单个重提取: `POST /api/extraction/re-extract/:manifestId`
- 批量提取: `POST /api/manifests/groups/:groupId/manifests/batch`（body: `{ manifestIds: [...] }`）
- 低置信校对: `GET /api/manifests/:manifestId/pending-crops`、`POST /api/manifests/:manifestId/crops/verify`

## 架构

```
项目 2 (pytoya-prompt-test)   default_schema_id = 10
├── group 18 (VAT-Test-A)  → 删除（18 个旧测试单据）
└── group 19 (DualEngine-Test)  ← 新建
    └── 40 manifests
        ├── storage_path → 项目1 uploads 的 PDF（复用）
        ├── human_verified = true
        └── extracted_data = 空（GT 从 restore 读）

schema 10 (改后)
└── validationSettings.ocrExtractors =
    [{ extractorId: eaa203b7 (VL-8B), config: { maxTokens: 2048, temperature: 0, detail: high } },
     { extractorId: 4ca3e9e3 (inference-OCR), config: {} }]

提取流程：
PDF → 逐页转图 → VL 逐页(mt=2048) + inference-OCR 并行
      → extractMultiple 拼接 markdown（含 [H]/[M]/[L] + bbox）
      → DeepSeek 提取 + _human_review（prompts.service 收集各 extractor promptContribution）
      → 存 manifests.extractedData + ocrResult
```

## 执行步骤

### Step 1：项目 2 重建测试组
1. 删除 group 18 及其 18 个 manifests（及其 jobs/history 级联）。
2. 新建 group 19，name=`DualEngine-Test`，project_id=2。
3. 用固定 40 样本 id 列表（54,60,72,85,97,108,109,111,136,147,174,183,193,196,198,199,218,232,238,240,245,272,278,287,297,310,318,334,335,337,338,339,340,353,360,367,378,407,438,495）插入 manifests：
   - `storage_path` = 项目 1 原 PDF 绝对路径（从生产库读）
   - `original_filename`、`file_type`、`group_id` 正确填充
   - `human_verified = true`
   - **不写 extracted_data**

### Step 2：改 schema 10 为双引擎
1. 读取当前 validation_settings 存档到 /tmp（便于回滚，虽非必需）。
2. `ocrExtractors` 改为双引擎配置（见上）。
3. **冒烟验证**：对 1 个样本触发 re-extract，确认：
   - 双 extractor 都执行（extractors 数组含 2 个 id）
   - markdown 含 inference-OCR 的 `[H]/[M]/[L]` + bbox
   - DeepSeek 输出含 `_human_review`
   - 若 `type` 字段导致第二个 extractor 未执行 → 统一改为 `extractorId` 字段

### Step 3：批量提取 40 个
- 用 `POST /manifests/groups/:groupId/manifests/batch`（body: manifestIds）触发。
- 后台 queue 处理（VL 逐页 + OCR 并行），预计 1-2 小时。
- 监控 job 状态，记录崩溃/失败样本。

### Step 4：对比评估
1. 从 restore 库读 40 个 GT（human_verified=true 的 extracted_data）。
2. 从生产库读 40 个新提取结果。
3. 复用 /tmp/eval 的 `compare.py` 做字段级比对（po_no/name/quantity/unit/price_ex/price_inc/total/cost/usage/date/dept）。
4. 输出准确率矩阵，对比：
   - 评估脚本基线：C（OCR单独 37%）、D（旧双引擎 45.5%）
   - 40 样本单 VL 历史 GT（若有）
5. 记录 VL 崩溃率（短输出 <100B / 循环）——方案 A 不重试，如实暴露。

### Step 5：CorrectionPanel 端到端验证
1. 前端打开 group 19 某 manifest → CorrectionPage。
2. 确认 `pending-crops` 返回 `_human_review` 低置信字段的 crop 图、confidence、reason。
3. verify 提交一个字段 → 确认回写 extractedData + 记录 manual_crop_verification。

## 验证指标

| 指标 | 说明 |
|------|------|
| 双引擎字段级准确率 | vs restore GT，全字段 + 核心字段 |
| 与旧 D（45.5%）对比 | 生产逐页+2048 下双引擎是否更优 |
| VL 崩溃率 | 40 样本中短输出/循环占比（不重试）|
| `_human_review` 命中率 | 低置信字段是否正确标记 |
| CorrectionPanel 闭环 | 校对→回写 extractedData 成功 |

## 风险与对策

| 风险 | 对策 |
|------|------|
| schema 10 `type` 字段不兼容双引擎 | Step 2 冒烟验证，失败则改 `extractorId` |
| VL 崩溃污染 `_human_review` | 方案 A 如实暴露；后续再决定是否加重试 |
| 批量提取覆盖已有 extracted_data | 40 个新 manifests 不写 GT，无覆盖问题 |
| PDF 跨项目引用异常 | 已确认绝对路径 + 文件存在 |
| 删除 group 18 误删其它数据 | 仅删 group 18 及其 manifests，操作前核对 id |

## 成功标准

1. 40 个样本双引擎提取完成，无阻塞性失败。
2. 得到双引擎 vs 基线 vs 历史单 VL 的准确率对比结论。
3. CorrectionPanel 低置信校对端到端可用（pending-crops → verify → 回写）。
4. 明确"接回 inference-OCR 是否值得"的结论，供生产 schema 14 决策。
