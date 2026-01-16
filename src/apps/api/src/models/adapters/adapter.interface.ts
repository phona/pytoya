export type AdapterCategory = 'ocr' | 'llm';

export interface AdapterSchema {
  type: string;
  name: string;
  description: string;
  category: AdapterCategory;
  parameters: Record<string, ParameterDefinition>;
  capabilities: string[];
}

export type ParameterType = 'string' | 'number' | 'boolean' | 'enum';

export interface ParameterDefinition {
  type: ParameterType;
  required: boolean;
  default?: unknown;
  label: string;
  placeholder?: string;
  secret?: boolean;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    enum?: string[];
  };
  helpText?: string;
}
