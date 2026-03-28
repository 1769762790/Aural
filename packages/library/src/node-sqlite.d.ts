declare module "node:sqlite" {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare<T = unknown>(sql: string): {
      get(...params: unknown[]): T | undefined;
      all(...params: unknown[]): T[];
      run(...params: unknown[]): { changes: number };
    };
    close(): void;
  }
}
