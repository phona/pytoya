import { Injectable, Logger } from '@nestjs/common';
import { createContext, runInContext, Script } from 'vm';
import { format } from 'util';
import { ExportScriptExecutionException } from './exceptions/export-script-execution.exception';
import type { ExportScriptConsoleEntry, ExportScriptConsoleLevel, ExportScriptFormat } from './dto/test-export-script.dto';

const SCRIPT_TIMEOUT = 5000;
const MAX_EXTRACTED_DATA_JSON_LENGTH = 1_000_000;
const MAX_LOG_ENTRIES = 200;
const MAX_LOG_MESSAGE_LENGTH = 4000;
const MAX_ROWS_PER_MANIFEST = 5000;

export type ExportScriptContext = {
  format: ExportScriptFormat;
  schemaColumns: string[];
  project: { id: number; name?: string };
  manifest: {
    id: number;
    groupName?: string;
    createdAt?: string;
    originalFilename?: string;
    status?: string;
    confidence?: number | null;
    humanVerified?: boolean;
    extractionCost?: number | null;
    extractionCostCurrency?: string | null;
  };
  utils: {
    get: (obj: unknown, path: string) => unknown;
    set: (obj: unknown, path: string, value: unknown) => void;
    trimToNull: (value: unknown) => string | null;
    normalizeWhitespace: (value: unknown) => string | null;
    toNumberOrNull: (value: unknown) => number | null;
  };
};

interface SandboxContext {
  extractedData: Record<string, any>;
  ctx: ExportScriptContext;
  console: Console;
  Math: typeof Math;
  Date: DateConstructor;
  Object: {
    keys: typeof Object.keys;
    values: typeof Object.values;
    entries: typeof Object.entries;
    assign: typeof Object.assign;
  };
  Array: {
    isArray: typeof Array.isArray;
    from: typeof Array.from;
  };
  Number: ((value: unknown) => number) & {
    isFinite: typeof Number.isFinite;
    isInteger: typeof Number.isInteger;
    isNaN: typeof Number.isNaN;
    parseFloat: typeof Number.parseFloat;
    parseInt: typeof Number.parseInt;
  };
  exportRows?: (data: Record<string, any>, ctx: ExportScriptContext) => unknown;
}

@Injectable()
export class ExportScriptExecutorService {
  private readonly logger = new Logger(ExportScriptExecutorService.name);

  private buildSandboxNumber(): SandboxContext['Number'] {
    const convert = (value: unknown) => Number(value);
    return Object.freeze(
      Object.assign(convert, {
        isFinite: Number.isFinite,
        isInteger: Number.isInteger,
        isNaN: Number.isNaN,
        parseFloat: Number.parseFloat,
        parseInt: Number.parseInt,
      }),
    ) as SandboxContext['Number'];
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
      const message = (error as { message?: unknown }).message;
      if (typeof message === 'string') return message;
    }
    return 'Unknown error';
  }

  private getErrorStack(error: unknown): string | undefined {
    if (error instanceof Error) return error.stack;
    if (error && typeof error === 'object' && 'stack' in error) {
      const stack = (error as { stack?: unknown }).stack;
      if (typeof stack === 'string') return stack;
    }
    return undefined;
  }

  private sanitizeStack(stack?: string): string | undefined {
    if (!stack) return undefined;
    const lines = stack.split('\n').map((l) => l.trimEnd());
    if (lines.length === 0) return undefined;
    const header = lines[0];
    const scriptFrames = lines.filter((line) => line.includes('export-script'));
    const keep = [header, ...scriptFrames].slice(0, 10);
    return keep.join('\n');
  }

  private truncateLogMessage(message: string): string {
    if (message.length <= MAX_LOG_MESSAGE_LENGTH) return message;
    return `${message.slice(0, MAX_LOG_MESSAGE_LENGTH)}…(truncated)`;
  }

  private buildSandboxConsole(options: { captureLogs: boolean; logs: ExportScriptConsoleEntry[] }): Console {
    const push = (level: ExportScriptConsoleLevel, args: unknown[]) => {
      const message = this.truncateLogMessage(format(...args));
      options.logs.push({ level, message });
      if (options.logs.length > MAX_LOG_ENTRIES) {
        options.logs.splice(0, options.logs.length - MAX_LOG_ENTRIES);
      }
    };

    const loggerConsole: Console = {
      log: (...args: unknown[]) => this.logger.debug(`Script console.log:`, args),
      warn: (...args: unknown[]) => this.logger.warn(`Script console.warn:`, args),
      error: (...args: unknown[]) => this.logger.error(`Script console.error:`, args),
      debug: (...args: unknown[]) => this.logger.debug(`Script console.debug:`, args),
      info: (...args: unknown[]) => this.logger.log(`Script console.info:`, args),
    } as unknown as Console;

    if (!options.captureLogs) {
      return loggerConsole;
    }

    return {
      log: (...args: unknown[]) => push('log', args),
      warn: (...args: unknown[]) => push('warn', args),
      error: (...args: unknown[]) => push('error', args),
      debug: (...args: unknown[]) => push('debug', args),
      info: (...args: unknown[]) => push('info', args),
    } as unknown as Console;
  }

  private sanitizeExtractedData(extractedData: Record<string, any>, options?: { maxJsonLength?: number }): Record<string, any> {
    let json: string;
    try {
      json = JSON.stringify(extractedData);
    } catch {
      throw new ExportScriptExecutionException('extractedData must be JSON-serializable');
    }

    if (typeof options?.maxJsonLength === 'number' && json.length > options.maxJsonLength) {
      throw new ExportScriptExecutionException('extractedData is too large for this operation');
    }

    return JSON.parse(json) as Record<string, any>;
  }

  validateSyntax(script: string): { valid: boolean; error?: string } {
    try {
      const functionMatch = script.match(/function\s+exportRows\s*\(/);
      if (!functionMatch) {
        return { valid: false, error: 'Script must contain a function named "exportRows"' };
      }

      new Script(script, { filename: 'export-script.js' });
      return { valid: true };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const stack = typeof error.stack === 'string' ? error.stack : '';
        const stackLines = stack ? stack.split('\n') : [];
        const firstAtIndex = stackLines.findIndex((line) => line.trimStart().startsWith('at '));
        const frameLines = firstAtIndex === -1 ? stackLines : stackLines.slice(0, Math.max(0, firstAtIndex));
        const frameSnippet = frameLines.slice(0, 4).join('\n').trim();
        const message = error.message;
        return { valid: false, error: frameSnippet ? `${message}\n${frameSnippet}` : message };
      }
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown syntax error' };
    }
  }

  async executeExportRows(script: string, extractedData: Record<string, any>, ctx: ExportScriptContext): Promise<Array<Record<string, unknown>>> {
    const { rows } = await this.executeInternal(script, extractedData, ctx, {
      captureLogs: false,
      preserveErrorStack: false,
      logs: [],
    });
    return rows;
  }

  async executeExportRowsWithDebug(
    script: string,
    extractedData: Record<string, any>,
    ctx: ExportScriptContext,
  ): Promise<{ rows: Array<Record<string, unknown>>; logs: ExportScriptConsoleEntry[]; runtimeError?: { message: string; stack?: string } }> {
    const logs: ExportScriptConsoleEntry[] = [];
    try {
      const { rows } = await this.executeInternal(script, extractedData, ctx, {
        captureLogs: true,
        preserveErrorStack: true,
        logs,
        maxExtractedDataJsonLength: MAX_EXTRACTED_DATA_JSON_LENGTH,
      });
      return { rows, logs };
    } catch (error) {
      const message = this.getErrorMessage(error);
      const stack = this.sanitizeStack(this.getErrorStack(error));
      return { rows: [], logs, runtimeError: { message, stack } };
    }
  }

  private async executeInternal(
    script: string,
    extractedData: Record<string, any>,
    ctx: ExportScriptContext,
    options: { captureLogs: boolean; preserveErrorStack: boolean; logs: ExportScriptConsoleEntry[]; maxExtractedDataJsonLength?: number },
  ): Promise<{ rows: Array<Record<string, unknown>> }> {
    try {
      const sanitizedData = this.sanitizeExtractedData(extractedData, { maxJsonLength: options.maxExtractedDataJsonLength });

      const context: SandboxContext = {
        extractedData: sanitizedData,
        ctx,
        console: this.buildSandboxConsole(options),
        Math,
        Date,
        Object: { keys: Object.keys, values: Object.values, entries: Object.entries, assign: Object.assign },
        Array: { isArray: Array.isArray, from: Array.from },
        Number: this.buildSandboxNumber(),
      };

      const vmContext = createContext(context);
      const functionScript = new Script(script, { filename: 'export-script.js' });
      functionScript.runInContext(vmContext);

      if (typeof context.exportRows !== 'function') {
        throw new ExportScriptExecutionException('Script must export an exportRows function');
      }

      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error('Script execution timeout')), SCRIPT_TIMEOUT);
        if (typeof timeoutId.unref === 'function') {
          timeoutId.unref();
        }
      });

      const executionPromise = Promise.resolve().then(() => {
        const result = runInContext('exportRows(extractedData, ctx)', vmContext, { timeout: SCRIPT_TIMEOUT });
        return result as unknown;
      });

      let result: unknown;
      try {
        result = await Promise.race([executionPromise, timeoutPromise]);
      } finally {
        if (timeoutId) clearTimeout(timeoutId);
      }

      if (!Array.isArray(result)) {
        throw new ExportScriptExecutionException('exportRows must return an array of row objects');
      }
      if (result.length > MAX_ROWS_PER_MANIFEST) {
        throw new ExportScriptExecutionException(`exportRows returned too many rows (max ${MAX_ROWS_PER_MANIFEST})`);
      }

      for (const row of result) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new ExportScriptExecutionException('Each exported row must be a plain object');
        }
        try {
          JSON.stringify(row);
        } catch {
          throw new ExportScriptExecutionException('Each exported row must be JSON-serializable');
        }
      }

      return { rows: result as Array<Record<string, unknown>> };
    } catch (error) {
      if (error instanceof ExportScriptExecutionException) {
        throw error;
      }
      this.logger.error(`Export script execution failed:`, error);
      if (options.preserveErrorStack) {
        throw error;
      }
      throw new ExportScriptExecutionException(this.getErrorMessage(error));
    }
  }
}

