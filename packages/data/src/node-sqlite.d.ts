declare module "node:sqlite" {
  export class StatementSync<T = unknown> {
    all(...params: unknown[]): T[];
    get(...params: unknown[]): T | undefined;
    run(...params: unknown[]): { changes: number; lastInsertRowid: number };
    columns(): Array<{ name: string }>;
    setAllowBareNamedParameters(value: boolean): void;
    setAllowUnknownNamedParameters(value: boolean): void;
    setReadBigInts(value: boolean): void;
    setReturnArrays(value: boolean): void;
  }

  export class DatabaseSync {
    constructor(path: string);
    aggregate(...params: unknown[]): void;
    applyChangeset(...params: unknown[]): void;
    close(): void;
    createSession(...params: unknown[]): void;
    createTagStore(...params: unknown[]): void;
    enableLoadExtension(...params: unknown[]): void;
    exec(sql: string): void;
    function(...params: unknown[]): void;
    loadExtension(...params: unknown[]): void;
    location: string;
    open(): void;
    prepare<T = unknown>(sql: string): StatementSync<T>;
    setAuthorizer(...params: unknown[]): void;
  }
}

