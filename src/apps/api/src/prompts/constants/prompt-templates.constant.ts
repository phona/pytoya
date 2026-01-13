export const OCR_SECTION = '{markdown_text}';

export const RETURN_YAML_INSTRUCTION = [
  "返回以下YAML格式的结构化数据：",
  "{schema}",
  "",
  "提取所有项目。只返回YAML，不要使用markdown代码块。",
].join('\n');

export const FEEDBACK_TEMPLATE = [
  "** 之前的错误：{error}",
  "",
  "** 缺失的字段：",
  "{missing_fields}",
  "",
  "** 指示：",
  "- 仔细重新检查发票文本",
  "- 确保所有必填字段都存在",
  "- 使用发票中的准确值",
  "- 只返回有效的YAML，不要markdown代码块",
  "",
  "",
].join('\n');

export const PREVIOUS_RESULT_TEMPLATE = [
  "之前的提取结果（供参考）：",
  "```yaml",
  "{previous_yaml}",
  "```",
].join('\n');

export const RE_EXTRACT_RETURN_INSTRUCTION = [
  "返回以下YAML格式的结构化数据：",
  "{schema}",
  "",
  "提取所有项目。确保所有必填字段都存在。",
  "只返回YAML，不要使用markdown代码块。",
].join('\n');
