# 采购单 OCR 数据采集与校对工具

## 目录结构

```
tools/
  qwen_batch_crop.py       ← 用 Qwen 百分比坐标批量裁格子
  cross_verify_proto.py     ← Qwen + RapidOCR 交叉验证原型
  final_proto.py            ← Qwen + PaddleOCR 检测框定位原型
  data-review/
    review.html             ← 网页校对工具（双击打开）
    index.json              ← 格子清单（review.html 自动加载）
    qwen_sample/            ← 38 张样本格子图
```

## 当前状态

- Qwen3-VL-8B 可返回单元格百分比坐标 ✅
- 坐标转像素裁切基本可用，但偶尔会截到邻格内容 ⚠️
- 校对工具已就绪，可在浏览器中逐格修正标签

## 下一步

1. 打开 data-review/review.html 校对 38 个样本
2. 导出 corrections.json
3. 全量跑所有 manifest 采数据
4. 训练 CRNN
