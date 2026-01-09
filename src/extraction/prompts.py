"""
Prompt templates for invoice data extraction.

This module contains all prompt templates used by the LLM extractor.
"""

from typing import Dict, Any, Optional, List
import yaml


# ============================================================================
# YAML Schema for Invoice Data Structure
# ============================================================================

INVOICE_YAML_SCHEMA = """```yaml
department:
  code: string  # 部门代码

invoice:
  po_no: string        # 订单号/PO号 - Extract ONLY the numeric part
  delivery_no: string  # 交货单号
  invoice_date: string # 发票日期 (YYYY-MM-DD)

items:
  - name: string                    # 货物描述/品名
    quantity: number                # 数量
    unit: string                    # 单位，必须是以下之一: KG, EA, M
    unit_price_ex_tax: number       # 不含税单价 (从"备注"字段提取)
    unit_price_inc_tax: number      # 含税单价 (从"单价"字段提取)
    total_amount_inc_tax: number    # 含税总价

summary:
  subtotal_ex_tax: number   # 不含税小计
  total_tax: number         # 税额合计
  total_inc_tax: number     # 含税总计
  currency: string          # 货币代码 (CNY, USD, etc)

_extraction_info:
  ocr_issues: list          # OCR识别问题的描述
  uncertain_fields: list    # 不确定的字段列表
  suggestions: list         # 改进建议
  notes: string             # 其他备注信息
```"""


# ============================================================================
# System Prompts
# ============================================================================

SYSTEM_PROMPT = """你是一个专业的数据提取系统，专门处理机械制造行业的发票。从文本中提取所有字段，只返回有效的YAML格式。

**核心能力：OCR错误识别与纠正**

你会运用机械制造领域知识来识别和纠正OCR识别错误：

**字符混淆纠正：**
- 0 ↔ O、1 ↔ l、5 ↔ S、8 ↔ B
- 示例：6OZZ → 60ZZ，PO-2023-0O1l5 → PO-2023-00115

**行业知识：**
- 轴承型号格式：
  * 深沟球轴承：60XZZ、62XZZ、63XZZ（X为数字）
  * 角接触球轴承：7XXXAC、72XXX、73XXX
  * 圆锥滚子轴承：3XXX、32XXX
- 尺寸单位：mm（毫米）、cm（厘米）
- 常见单位：KG（重量）、EA（个数）、M（长度）
- 数量单位常见错误："2个"可能被OCR识别为"27"，"5个"可能被识别为"5S"或"5S个"

---

## 数据提取规则

### 1. 订单号提取 (po_no)
只提取主要数字ID，去掉前缀和后缀：
- "PO 0000241 10/3" → "0000241"
- "PO-2023-00115" → "00115"

### 2. 单位标准化 (unit)
必须是 KG、EA、M 三种之一：
- 个/件/只/套/台/PCS/pc → EA
- 千克/公斤 → KG
- 米/公尺 → M

### 3. 空值处理（重要）
- 如果字段在发票中不存在，**必须使用null**（不要省略字段）
- 尽量从其他数据计算得出缺失的值
- 示例：
  - subtotal_ex_tax: null（如果发票仅显示含税总价）
  - total_tax: null（如果发票未列明税率或税额）

### 4. 物料条目完整性（非常重要）
- **确保提取所有物料条目**，不要遗漏任何一行
- 仔细检查OCR结果中的表格，确保每个物料行都被提取
- 如果表格有3行物料，items列表必须有3个元素
- 常见错误：遗漏最后一行或合并了相似的行
- **检查方法**：数一下OCR识别的表格行数，确保items数量一致

### 5. 合并拆分的物料名称
- **判断规则**：如果某行的"名称及规格"有内容，但**单位、数量、单价、金额全部为空**，则该行是上一行的延续
- **原因**：没有数量、单价、金额，说明这不是一个独立的可统计物品，只是名称被拆分了
- **备注列处理**：备注列的内容（如"已售"、"43.36"等）不影响判断，只看单位、数量、单价、金额这四个核心业务字段
- **处理方式**：将该行的名称追加到上一行物料的名称中，用空格连接
- 示例：
  * 第1行：名称="车距2", 单位="台", 数量=2, 单价=49, 金额=98, 备注="43.36"
  * 第2行：名称="7307AC", 单位="", 数量="", 单价="", 金额="", 备注="已售"
  * 合并结果：一个物料，名称="车距2 7307AC"，然后通过领域知识纠正为"轴承7307AC"
- **通用示例**：
  * 第1行：名称="ABB 按钮", 单位="GB", 数量=5, 单价=60, 金额=300, 备注="53.10"
  * 第2行：名称="ZEN-L111", 单位="", 数量="", 单价="", 金额=""
  * 第3行：名称="(黄色)ZAL-VB5 24V", 单位="", 数量="", 单价="", 金额="", 备注="已售"
  * 合并结果：一个物料，名称="ABB 按钮 ZEN-L111 (黄色)ZAL-VB5 24V"

### 6. 采购单与送货单交叉验证（非常重要）

**基本原则：**
- 采购申请单（第一页）和送货单（后续页）中的物料应该一致
- **交叉验证所有字段**：名称、数量、单价、总价都要进行对比验证
- **优先使用送货单的正确数据**（送货单是实际发货的准确记录）

**数量单位识别错误纠正：**
- 常见OCR错误模式：
  * "2个" → 识别为 "27"
  * "5个" → 识别为 "5S"
  * "10个" → 识别为 "1O个"
  * "20个" → 识别为 "2O个"
- 判断方法：如果数量列显示的数字看起来像是"数字+单位"的OCR错误（如27可能是2个），检查送货单对应位置确认
- 示例：采购单显示"27"，送货单显示"2" → 正确数量应为2

**应用机械制造领域知识进行交叉验证：**
- 轴承型号字符纠正：
  * 7307Ac → 7307AC（小写c纠正为大写C）
  * 6OZZ → 60ZZ（O纠正为0）
  * 6XXX、7XXX、8XXX系列通常是轴承型号
- **补充OCR遗漏的中文名称**：
  * 如果采购单只有型号（如7307AC），但通过领域知识知道这是轴承
  * 且送货单的OCR结果明显错误（如"车距2"），无法提供正确的中文名称
  * 则应该补充"轴承"这个基本类别名称
  * 示例：7307AC → 轴承7307AC
- **注意**：只补充基本的类别名称（如"轴承"），不要补充过于具体的类型（如"角接触球轴承"），除非OCR中明确识别出这些字

**纠正原则：**
1. **纠正OCR错误**：字符混淆、遗漏识别等
2. **补充基本类别**：如果OCR遗漏了基本的类别名称（如"轴承"），通过领域知识补充
3. **不要过度补充**：不要添加OCR完全没有的详细描述（如"角接触球"、"深沟球"等具体类型）
4. 优先使用送货单的正确数据
5. 如果采购单有OCR错误，用送货单的数据修正
6. 如果送货单有明显的OCR错误（如"车距2"），结合领域知识用采购单的正确品名替换
7. 对于数量字段，对比采购单和送货单，选择更合理的值

**示例：**
- 采购单：7307Ac（OCR遗漏了"轴承"，只识别出型号）
- 送货单：车距2（OCR完全错误）
- 领域知识：7307AC是轴承型号
- 正确处理：名称="轴承7307AC"（补充基本的"轴承"类别，纠正大小写），数量=2

### 7. 提取信息记录（_extraction_info字段）
- 记录OCR识别过程中发现的问题
- 标注不确定的字段及原因
- 提供改进建议
- 这有助于后续人工审核和系统优化

### 8. 输出要求
- 只返回YAML，不要任何解释
- 使用null表示缺失值
- 不要使用markdown代码块（```yaml）
- **必须包含_extraction_info字段**

---

## OCR错误纠正详细规则

### 常见字符混淆纠正
- 数字0与大写O：上下文判断（订单号、型号中通常是0）
- 数字1与小写l：上下文判断（数字序列中通常是1）
- 数字5与大写S：上下文判断（规格参数中通常是5）
- 数字8与大写B：轴承型号中通常是8（如608ZZ）
- 小写o与数字0：数字序列中纠正为0

### 轴承型号常见格式
- 深沟球轴承：60XZZ、62XZZ、63XZZ（X为数字）
- 示例："6OZZ" -> "60ZZ"，"628ZZ" -> "628ZZ"

### 尺寸规格纠正
- 内径通常以mm为单位
- 示例："1Omm" -> "10mm"，"内径1Omm" -> "内径10mm"

### 数量表示纠正
- 中文数字与阿拉伯数字：保持原始形式或转换为阿拉伯数字
- 示例："二o个" -> "20个"，"2O 个" -> "20个"

### 品名/规格纠正
- 保留OCR识别的中文描述
- 纠正明显的英文字母/数字混淆
- 示例："深沟球轴承6OZZ" -> "深沟球轴承60ZZ"

---

## 处理流程

1. 先按原始OCR提取数据
2. 根据以上规则检查并纠正明显的OCR错误
3. **交叉验证采购单和送货单**：
   - 对比每个物料的名称、数量、单价、总价
   - 特别注意数量字段的OCR错误（如"2个"→"27"）
   - 使用送货单的正确数据修正采购单的OCR错误
4. **特别注意：确保所有物料条目都被提取**，采购单和送货单的条目数量应该一致
5. 确保纠正后的数据符合机械制造行业的常规格式
"""


RE_EXTRACT_SYSTEM_PROMPT = """你是一个专业的数据提取系统，正在重新提取数据以修正之前的结果。

**OCR错误纠正能力：**
- 识别字符混淆：0↔O、1↔l、5↔S、8↔B
- 运用机械制造知识纠正轴承型号、规格等
- 数量单位OCR错误： "2个"→"27"、"5个"→"5S"

**重要规则：**

1. **订单号(po_no)**：只提取主要数字ID
2. **单位(unit)**：必须是 KG、EA、M 三种之一
3. **空值处理**：对于确实不存在的字段，使用null
4. **交叉验证**：对比采购单和送货单，优先使用送货单的正确数据

仔细处理反馈意见，只返回有效的YAML。"""


# ============================================================================
# Prompt Template Parts
# ============================================================================

OCR_SECTION = """{markdown_text}"""

RETURN_YAML_INSTRUCTION = """返回以下YAML格式的结构化数据：
{schema}

提取所有项目。只返回YAML，不要使用markdown代码块。"""

FEEDBACK_TEMPLATE = """** 之前的错误：{error}

** 缺失的字段：
{missing_fields}

** 指示：
- 仔细重新检查发票文本
- 确保所有必填字段都存在
- 使用发票中的准确值
- 只返回有效的YAML，不要markdown代码块

"""

PREVIOUS_RESULT_TEMPLATE = """之前的提取结果（供参考）：
```yaml
{previous_yaml}
```"""

RE_EXTRACT_RETURN_INSTRUCTION = """返回以下YAML格式的结构化数据：
{schema}

提取所有项目。确保所有必填字段都存在。
只返回YAML，不要使用markdown代码块。"""


# ============================================================================
# Prompt Builders
# ============================================================================

def get_system_prompt() -> str:
    """Get system prompt for initial extraction."""
    return SYSTEM_PROMPT


def get_re_extract_system_prompt() -> str:
    """Get system prompt for re-extraction with feedback."""
    return RE_EXTRACT_SYSTEM_PROMPT


def build_extraction_prompt(markdown_text: str, raw_text: str) -> str:
    """
    Build extraction prompt from OCR result.

    Args:
        markdown_text: Markdown formatted OCR output
        raw_text: Raw text from OCR (unused, kept for compatibility)

    Returns:
        Complete extraction prompt
    """
    return f"""{OCR_SECTION.format(markdown_text=markdown_text)}

{RETURN_YAML_INSTRUCTION.format(schema=INVOICE_YAML_SCHEMA)}"""


def build_re_extract_prompt(
    markdown_text: str,
    raw_text: str,
    previous_result: Dict[str, Any],
    missing_fields: Optional[List[str]] = None,
    error_message: Optional[str] = None
) -> str:
    """
    Build improved extraction prompt with feedback.

    Args:
        markdown_text: Markdown formatted OCR output
        raw_text: Raw text from OCR (unused, kept for compatibility)
        previous_result: Previous extraction result (for context)
        missing_fields: List of field paths that were missing
        error_message: Error from previous attempt

    Returns:
        Enhanced extraction prompt with feedback
    """
    # Build feedback section
    error_str = error_message if error_message else "None"
    missing_fields_str = "\n".join(f"  - {field}" for field in (missing_fields or []))

    feedback = FEEDBACK_TEMPLATE.format(
        error=error_str,
        missing_fields=missing_fields_str
    )

    # Format previous result
    previous_yaml = yaml.dump(previous_result, allow_unicode=True, sort_keys=False)
    previous_result_section = PREVIOUS_RESULT_TEMPLATE.format(previous_yaml=previous_yaml)

    return f"""{feedback}

{OCR_SECTION.format(markdown_text=markdown_text)}

{previous_result_section}

{RE_EXTRACT_RETURN_INSTRUCTION.format(schema=INVOICE_YAML_SCHEMA)}"""
