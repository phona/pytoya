import { Injectable, Logger } from '@nestjs/common';
import {
  createContext,
  runInContext,
  Script,
} from 'vm';
import { format } from 'util';
import { ValidationIssue } from '../entities/manifest.entity';
import { ScriptExecutionException } from './exceptions/script-execution.exception';
import type { ValidationScriptConsoleEntry, ValidationScriptConsoleLevel } from './dto/test-validation-script.dto';

const SCRIPT_TIMEOUT = 5000; // 5 seconds
const MAX_EXTRACTED_DATA_JSON_LENGTH = 1_000_000; // 1MB
const MAX_LOG_ENTRIES = 200;
const MAX_LOG_MESSAGE_LENGTH = 4000;

interface SandboxContext {
  extractedData: Record<string, any>;
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
  validate?: (data: Record<string, any>) => ValidationIssue[];
}

@Injectable()
export class ScriptExecutorService {
  private readonly logger = new Logger(ScriptExecutorService.name);

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
    const scriptFrames = lines.filter((line) => line.includes('validation-script'));
    const keep = [header, ...scriptFrames].slice(0, 10);
    return keep.join('\n');
  }

  private truncateLogMessage(message: string): string {
    if (message.length <= MAX_LOG_MESSAGE_LENGTH) return message;
    return `${message.slice(0, MAX_LOG_MESSAGE_LENGTH)}…(truncated)`;
  }

  private buildSandboxConsole(options: {
    captureLogs: boolean;
    logs: ValidationScriptConsoleEntry[];
  }): Console {
    const push = (level: ValidationScriptConsoleLevel, args: unknown[]) => {
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

  private sanitizeExtractedData(
    extractedData: Record<string, any>,
    options?: { maxJsonLength?: number },
  ): Record<string, any> {
    let json: string;
    try {
      json = JSON.stringify(extractedData);
    } catch {
      throw new ScriptExecutionException('extractedData must be JSON-serializable');
    }

    if (typeof options?.maxJsonLength === 'number' && json.length > options.maxJsonLength) {
      throw new ScriptExecutionException('extractedData is too large for this operation');
    }

    return JSON.parse(json) as Record<string, any>;
  }

  /**
   * Validates JavaScript syntax without executing the script
   */
  validateSyntax(script: string): { valid: boolean; error?: string } {
    try {
      const functionMatch = script.match(/function\s+validate\s*\(/);
      if (!functionMatch) {
        return {
          valid: false,
          error: 'Script must contain a function named "validate"',
        };
      }

      // Compile only (no execution) so we can provide line/caret details on syntax failures.
      // vm.Script SyntaxError stacks include code frames like:
      //   validation-script.js:4
      //     const x = ;
      //               ^
      new Script(script, { filename: 'validation-script.js' });

      return { valid: true };
    } catch (error) {
      if (error instanceof SyntaxError) {
        const stack = typeof error.stack === 'string' ? error.stack : '';
        const stackLines = stack ? stack.split('\n') : [];

        const firstAtIndex = stackLines.findIndex((line) => line.trimStart().startsWith('at '));
        const frameLines =
          firstAtIndex === -1 ? stackLines : stackLines.slice(0, Math.max(0, firstAtIndex));

        const frameSnippet = frameLines.slice(0, 4).join('\n').trim();
        const message = error.message;

        return {
          valid: false,
          error: frameSnippet ? `${message}\n${frameSnippet}` : message,
        };
      }
      return { valid: false, error: error instanceof Error ? error.message : 'Unknown syntax error' };
    }
  }

  /**
   * Executes a validation script in an isolated VM context
   */
  async executeScript(
    script: string,
    extractedData: Record<string, any>,
  ): Promise<ValidationIssue[]> {
    const { issues } = await this.executeScriptInternal(script, extractedData, {
      captureLogs: false,
      preserveErrorStack: false,
      logs: [],
    });
    return issues;
  }

  /**
   * Executes a validation script and captures console output + runtime error details for debugging.
   *
   * This method never throws; it returns runtimeError instead.
   */
  async executeScriptWithDebug(
    script: string,
    extractedData: Record<string, any>,
  ): Promise<{
    issues: ValidationIssue[];
    logs: ValidationScriptConsoleEntry[];
    runtimeError?: { message: string; stack?: string };
  }> {
    const logs: ValidationScriptConsoleEntry[] = [];
    try {
      const { issues } = await this.executeScriptInternal(script, extractedData, {
        captureLogs: true,
        preserveErrorStack: true,
        logs,
        maxExtractedDataJsonLength: MAX_EXTRACTED_DATA_JSON_LENGTH,
      });
      return { issues, logs };
    } catch (error) {
      const message = this.getErrorMessage(error);
      const stack = this.sanitizeStack(this.getErrorStack(error));
      return { issues: [], logs, runtimeError: { message, stack } };
    }
  }

  private async executeScriptInternal(
    script: string,
    extractedData: Record<string, any>,
    options: {
      captureLogs: boolean;
      preserveErrorStack: boolean;
      logs: ValidationScriptConsoleEntry[];
      maxExtractedDataJsonLength?: number;
    },
  ): Promise<{ issues: ValidationIssue[] }> {
    try {
      // Deep copy extracted data to prevent mutations
      const sanitizedData = this.sanitizeExtractedData(extractedData, {
        maxJsonLength: options.maxExtractedDataJsonLength,
      });

      // Create an isolated sandbox context with only safe utilities
      const context: SandboxContext = {
        extractedData: sanitizedData,
        console: this.buildSandboxConsole(options),
        Math,
        Date,
        Object: {
          keys: Object.keys,
          values: Object.values,
          entries: Object.entries,
          assign: Object.assign,
        },
        Array: {
          isArray: Array.isArray,
          from: Array.from,
        },
        Number: this.buildSandboxNumber(),
      };

      // Create a VM context from the sandbox
      const vmContext = createContext(context);

      // First, compile and run the function definition
      const functionScript = new Script(script, { filename: 'validation-script.js' });
      functionScript.runInContext(vmContext);

      // Check if validate function was defined
      if (typeof context.validate !== 'function') {
        throw new ScriptExecutionException(
          'Script must export a validate function',
        );
      }

      // Execute the validate function with timeout
      let timeoutId: NodeJS.Timeout | undefined;
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Script execution timeout')),
          SCRIPT_TIMEOUT,
        );
        if (typeof timeoutId.unref === 'function') {
          timeoutId.unref();
        }
      });

      const executionPromise = Promise.resolve().then(() => {
        const result = runInContext(
          'validate(extractedData)',
          vmContext,
          { timeout: SCRIPT_TIMEOUT },
        );
        return result as unknown;
      });

      let result: unknown;
      try {
        result = await Promise.race([executionPromise, timeoutPromise]);
      } finally {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
      }

      // Validate the result format
      if (!Array.isArray(result)) {
        throw new ScriptExecutionException(
          'Script must return an array of validation issues',
        );
      }

      // Validate each issue has the required fields
      for (const issue of result) {
        if (
          typeof issue !== 'object' ||
          issue === null ||
          !('field' in issue) ||
          !('message' in issue) ||
          !('severity' in issue)
        ) {
          throw new ScriptExecutionException(
            'Each validation issue must have field, message, and severity properties',
          );
        }
        if (issue.severity !== 'warning' && issue.severity !== 'error') {
          throw new ScriptExecutionException(
            `Invalid severity: ${issue.severity}. Must be 'warning' or 'error'`,
          );
        }
      }

      return { issues: result as ValidationIssue[] };
    } catch (error) {
      if (error instanceof ScriptExecutionException) {
        throw error;
      }

      this.logger.error(`Script execution failed:`, error);
      if (options.preserveErrorStack) {
        throw error;
      }
      throw new ScriptExecutionException(this.getErrorMessage(error));
    }
  }
}
