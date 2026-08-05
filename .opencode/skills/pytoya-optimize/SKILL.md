---
name: pytoya-optimize
description: Use when running an optimization round on the pytoya extraction system (server 47.107.92.78) - scanning operation_logs corrections, applying deterministic fixes (tax column swap, junk rows), re-triggering failed extractions, curating promptRulesMarkdown from correction patterns, or producing the human review queue. Triggers: pytoya 优化轮, 扫描纠正日志, 提取质量优化, extraction quality round.
---

# pytoya-optimize — 提取质量优化轮

## Overview

一轮 = 扫描 → 确定性修复 → 提示词更新提案（需人批准）→ 待审清单 → 轮次报告。
核心原则：**算术与修复一律确定性 SQL/API 执行，LLM 不猜数；schema/提示词变更一律先出 diff 提案等人批准。**

## 连接与入口

- 服务器：`ssh root@47.107.92.78`（key 直连）
- 生产库：`docker exec pytoya-postgres psql -U postgres -d pytoya`
- GT 快照库（只读，永不写生产）：`docker exec pytoya-postgres psql -U postgres -d pytoya_restore`
- API（服务器本机）：`http://localhost:3001`；token 签发（内容不打印、不入报告）：
  `docker exec pytoya-api node -e "console.log(require('jsonwebtoken').sign({userId:1,role:'admin'},process.env.JWT_SECRET,{expiresIn:'7d'}))" > /tmp/api_token.txt`
- Python：`/tmp/evalenv/bin/python3`（3.6）
- 轮次产物：`/tmp/dual_eval/rounds/`（报告 + last_round.txt）；评估遗产在 `/tmp/dual_eval/`
- 设计依据：`docs/superpowers/specs/2026-08-02-accuracy-evolution-design.md`（证据链 + 废弃方向存档）

## 每轮流程

0. **准备**：把本 skill 的 scripts/ 拷到服务器 `scp <skill_dir>/scripts/*.sql root@47.107.92.78:/tmp/dual_eval/skill/`；读 `/tmp/dual_eval/rounds/last_round.txt` 得上轮时间戳（首轮用 `2026-03-01`）。
   **执行 SQL 的统一方式**（psql 在容器内、脚本在宿主机，不能用 `psql -f 宿主路径`）：
   `ssh root@47.107.92.78 "docker exec -i pytoya-postgres psql -U postgres -d pytoya -v ON_ERROR_STOP=1 [-v var=val ...] < /tmp/dual_eval/skill/<file>.sql"`
1. **扫描（只读）**：执行 scan.sql（`-v last_round='<ts>'`）→ 新增纠正 diff、纠正分布、failed 单据、新完成数、schema 14 现状。
2. **确定性修复**（每项先 preview 写进报告，再执行）：
   a. 税价串列：执行 fix_preview.sql 看命中行（含零税率守卫）→ **不自动修复**（提取口径是原文锚定：严禁 ÷1.13 反算，见 promptRulesMarkdown 规则 6/9）→ 命中行列入轮次报告"待人工"节，由人核对单据原文后经 audit page 纠正。
   b. 垃圾行：preview 中 junk/duplicate 清单 → **逐条目检**（防误伤 '25-15' 类合法型号）→ 按 manifest 执行 fix_junk_apply.sql（`-v mid=<id>`）。**顺序：垃圾行删除只在税价人工核对之后做**（删行会移动下标）。
   c. failed 单据：逐个 `curl -s -X POST http://localhost:3001/api/extraction/re-extract/<id> -H "Authorization: Bearer $(cat /tmp/api_token.txt)" -H 'Content-Type: application/json' -d '{}'`（OCR 已缓存，重跑 LLM 阶段）。
3. **提示词更新提案（不直接应用）**：聚类新纠正 diff 成错误模式（如"行尾型号丢失"、"φ→3 混淆"）+ 易错品名 top-k（≤20 条）→ 生成对 schema 14 `validation_settings->>'promptRulesMarkdown'` 的 **diff 提案**写入报告。**等人批准**；批准后先备份原值再用 jsonb_set 写回。
4. **待审清单**：新完成 manifest 的全部 `items[i].name` + 未能自动修复的校验问题 → 输出 `manifest_id | 字段 | 当前值 | 原因`，人拿清单去 audit page 改。
5. **轮次报告**：写 `/tmp/dual_eval/rounds/round_<YYYY-MM-DD>.md`（格式见下），更新 last_round.txt，追加 `/tmp/dual_eval/status.log` 一行。

**首轮/空跑模式**：只做步骤 1、3 的提案部分、4、5——不执行任何修复与 API 调用。

## 硬约束（红线）

- API key / token 不写入任何文件或报告（token 只在服务器 /tmp/api_token.txt）。
- GT 只从 pytoya_restore 读；永不向生产 manifests 写 GT。
- schema 14 只改 config 值（ocrExtractors[0].config、promptRulesMarkdown）；**不改 ocrExtractors 结构、不加 extractor**。
- **禁止重走已否定方向**：双引擎/inference-OCR 提准确率、32B 替换、裁切放大级联——均被实验否定，见 spec"废弃方向存档"。有怀疑先读证据链，不要直接试。
- cost 是人工知识字段（PDF 上无真值），不为 cost 建识别规则。
- 所有 UPDATE 先 preview 后事务执行（ON_ERROR_STOP）；改 schema 前必备份原值。
- 日期/usage 非重要字段（用户确认），不进优化目标。

## 轮次报告格式

```
# Round <date>
## 扫描摘要（新纠正 N 条 / failed N 个 / 新完成 N 个）
## 修复明细（preview → 执行结果，逐条 before/after）
## 提示词更新提案（diff，待批准）
## 待审清单
## 异常与备注
```

## 常见错误

| 错误 | 正确做法 |
|---|---|
| LLM 心算/猜测字段值后直接 UPDATE | 数字只来自确定性 SQL 计算结果 |
| 税价命中 → ÷1.13 反算自动修 | **严禁**：原文锚定口径（规则 6/9），转人工核对 |
| 直接改 promptRulesMarkdown | 先出 diff 提案，等人批准 |
| 建议"接回 inference-OCR 试试" | 禁止，见红线；先读 spec 废弃方向存档 |
| 删垃圾行在税价修复之前 | 先税价（按下标），后删行 |
| 忘记写轮次报告/更新 last_round.txt | 报告是轮的交付物，必须落盘 |
