import { Injectable, Logger } from '@nestjs/common';
import {
  createContext,
  runInContext,
  Script,
} from 'vm';
import { ValidationIssue } from '../entities/manifest.entity';
import { ScriptSyntaxException } from './exceptions/script-syntax.exception';
import { ScriptExecutionException } from './exceptions/script-execution.exception';

const SCRIPT_TIMEOUT = 5000; // 5 seconds

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
  Number: {
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

  /**
   * Validates JavaScript syntax without executing the script
   */
  validateSyntax(script: string): { valid: boolean; error?: string } {
    try {
      // Try to parse as a function declaration
      const functionMatch = script.match(/^function\s+validate\s*\(/);
      if (!functionMatch) {
        return {
          valid: false,
          error: 'Script must contain a function named "validate"',
        };
      }

      // Try to create a function from the script to validate syntax
      // This will throw a SyntaxError if the script is invalid
      new Function('return ' + script);

      return { valid: true };
    } catch (error) {
      if (error instanceof SyntaxError) {
        return { valid: false, error: error.message };
      }
      return { valid: false, error: 'Unknown syntax error' };
    }
  }

  /**
   * Executes a validation script in an isolated VM context
   */
  async executeScript(
    script: string,
    extractedData: Record<string, any>,
  ): Promise<ValidationIssue[]> {
    try {
      // Deep copy extracted data to prevent mutations
      const sanitizedData = JSON.parse(JSON.stringify(extractedData));

      // Create an isolated sandbox context with only safe utilities
      const context: SandboxContext = {
        extractedData: sanitizedData,
        console: {
          log: (...args: unknown[]) => this.logger.debug(`Script console.log:`, args),
          warn: (...args: unknown[]) => this.logger.warn(`Script console.warn:`, args),
          error: (...args: unknown[]) => this.logger.error(`Script console.error:`, args),
          debug: (...args: unknown[]) => this.logger.debug(`Script console.debug:`, args),
          info: (...args: unknown[]) => this.logger.log(`Script console.info:`, args),
        } as unknown as Console,
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
        Number: {
          isFinite: Number.isFinite,
          isInteger: Number.isInteger,
          isNaN: Number.isNaN,
          parseFloat: Number.parseFloat,
          parseInt: Number.parseInt,
        },
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

      return result as ValidationIssue[];
    } catch (error) {
      if (error instanceof ScriptExecutionException) {
        throw error;
      }

      this.logger.error(`Script execution failed:`, error);
      throw new ScriptExecutionException(
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }
}
