# PDF Image Scale 配置化实现计划

> **For agentic workers:** Sub-steps use checkbox (`- [ ]`) syntax for tracking.

**目标:** 将 PDF 转图片的 DPI 从硬编码 144（scale=2）改为 config.yaml 可配置，默认 72 DPI（scale=1）

**架构:** 在 config.yaml 新增 `pdf.imageScale: 1`，`PdfToImageService` 注入 `ConfigService` 读取该值替代硬编码常量

**涉及文件:**
- 修改: `src/apps/api/config.yaml`
- 修改: `src/apps/api/src/pdf-to-image/pdf-to-image.service.ts`

---

### Task 1: config.yaml 新增配置项

**文件:** `src/apps/api/config.yaml`

在 `server` 和 `database` 段之间新增：

```yaml
pdf:
  imageScale: 1
```

- 缩进 2 空格，与同级 key 对齐
- scale=1 对应 72 DPI

- [ ] 打开 `src/apps/api/config.yaml`，在 `server:` 块后、`database:` 块前插入

```yaml
pdf:
  imageScale: 1
```

- [ ] 验证：确认 YAML 缩进正确（2 空格），与前后块对齐

- [ ] commit

```bash
git add src/apps/api/config.yaml
git commit -m "feat: add pdf.imageScale config (default 72 DPI)"
```

---

### Task 2: PdfToImageService 注入 ConfigService

**文件:** `src/apps/api/src/pdf-to-image/pdf-to-image.service.ts`

- [ ] 添加 `ConfigService` 导入

```typescript
import { ConfigService } from '@nestjs/config';
```

- [ ] 构造器注入 `ConfigService`，移除硬编码常量

```typescript
export class PdfToImageService {
  private readonly defaultScale: number;

  constructor(
    @Inject('IPdfConverterAdapter')
    private readonly pdfAdapter: IPdfConverterAdapter,
    @Inject('IFileAccessService')
    private readonly fileSystem: IFileAccessService,
    private readonly configService: ConfigService,
  ) {
    this.defaultScale = this.configService.get<number>('pdf.imageScale', 1);
  }
```

- [ ] 替换 `convertPdfToImages` 方法中 `DEFAULT_SCALE` 引用

```typescript
    const { scale = this.defaultScale } = options;
```

- [ ] 替换 `convertPdfPageToImage` 方法中 `DEFAULT_SCALE` 引用

```typescript
    const { scale = this.defaultScale } = options;
```

- [ ] 删除旧的 `DEFAULT_SCALE` 常量行

```typescript
// 删除这行:
  private readonly DEFAULT_SCALE = 2; // 144 DPI for good quality
```

- [ ] 验证：确认没有残留的 `DEFAULT_SCALE` 引用

```bash
grep -rn 'DEFAULT_SCALE' src/apps/api/src/pdf-to-image/
# 应返回空
```

- [ ] 确认 `ConfigModule` 是全局注册的，无需改 module 文件

```bash
grep 'isGlobal' src/apps/api/src/app.module.ts
# 应输出: isGlobal: true,
```

- [ ] 运行编译检查

```bash
npx tsc --noEmit 2>&1 | head -20
```

- [ ] commit

```bash
git add src/apps/api/src/pdf-to-image/pdf-to-image.service.ts
git commit -m "feat: read pdf.imageScale from config instead of hardcoded 144 DPI"
```

---

### Task 3: 部署到生产

- [ ] 确认生产服务器 config.yaml 已有 `pdf.imageScale: 1`（在 docker-compose 部署的 `/root/pytoya/config.yaml` 中）

```bash
ssh root@47.107.92.78 'grep -A2 "pdf:" /root/pytoya/config.yaml'
```

- [ ] 重启 API + Worker 容器

```bash
ssh root@47.107.92.78 'cd /root/pytoya && docker compose down && docker compose up -d'
```

- [ ] 验证服务健康

```bash
curl -s https://pytoya.fshine.site/api/health
```

- [ ] 选择一个之前识别错误的清单验证修复效果（如 manifest 588）

```bash
TOKEN="..."
curl -s -X POST "https://pytoya.fshine.site/api/manifests/588/extract" \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json"
sleep 30
curl -s "https://pytoya.fshine.site/api/manifests/588" \
  -H "Authorization: Bearer $TOKEN" | python3 -c "import sys,json;d=json.load(sys.stdin);items=d['extractedData']['items'];print(f'Items: {len(items)}, Price: {items[0][\"unit_price_inc_tax\"]}')"
```
