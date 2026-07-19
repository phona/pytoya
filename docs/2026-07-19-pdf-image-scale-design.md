# PDF Image Scale 配置化设计

## 问题

`PdfToImageService.DEFAULT_SCALE = 2`（144 DPI）产生超大 PNG 图片（~2MB base64），
导致 Qwen3-VL-8B 模型的 prompt tokens 暴涨至 ~8,493，图像 token 占比过高，
表格列对齐精度下降，出现幻觉价格（`1327` 而非 `327`）。

## 改动

### 1. config.yaml 新增配置

```yaml
pdf:
  imageScale: 1
```

与 `server`、`database`、`redis` 同级。`imageScale` 含义：
- `1` = 72 DPI（默认，修复幻觉）
- `2` = 144 DPI（原值，需要更高分辨率时可恢复）
- 支持小数，如 `1.5`

### 2. PdfToImageService 接入 ConfigService

- 注入 `ConfigService`，构造器中读取 `pdf.imageScale`，兜底值 `1`
- `convertPdfToImages` 和 `convertPdfPageToImage` 中 `scale` 默认值从硬编码常量改为实例字段

### 验证数据（实测）

| scale | base64 | prompt tokens | 单价识别 | token 费用节省 |
|-------|--------|:---:|:---:|:---:|
| 2（改前） | 2,465 KB | 8,493 | ❌ 1.327 | — |
| 1（改后） | 775 KB  | 2,168 | ✅ 327   | ~74% |

## 涉及文件

- `src/apps/api/config.yaml` — 加一段配置
- `src/apps/api/src/pdf-to-image/pdf-to-image.service.ts` — 注入 ConfigService，替换硬编码
- `src/apps/api/src/pdf-to-image/pdf-to-image.module.ts` — 检查 ConfigModule 是否需要显式 import

## 不涉及

- 不改调用链路透传（`TextExtractionInput` 等）
- 不改提取器配置
- 不改数据库
