export class ExportScriptExecutionException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ExportScriptExecutionException';
  }
}

