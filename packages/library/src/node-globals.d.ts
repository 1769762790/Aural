declare class Buffer extends Uint8Array {
  static from(data: string | ArrayBuffer | ArrayBufferView): Buffer;
}

declare const process: {
  platform: string;
};

interface NodeHash {
  update(data: string | Uint8Array): NodeHash;
  digest(encoding: "hex"): string;
}

declare module "node:crypto" {
  export function createHash(algorithm: string): NodeHash;
}

declare module "node:path" {
  export function dirname(path: string): string;
  export function extname(path: string): string;
  export function join(...parts: string[]): string;
  export function normalize(path: string): string;
  export function resolve(...parts: string[]): string;
}

declare module "node:fs" {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): string | undefined;
  export function createReadStream(path: string): AsyncIterable<Uint8Array>;
}

declare module "node:fs/promises" {
  export function stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; size: number }>;
  export function opendir(path: string): Promise<AsyncIterable<{ name: string; isDirectory(): boolean; isFile(): boolean }>>;
}

declare module "node:child_process" {
  export function execFile(
    file: string,
    args: string[],
    options: { windowsHide?: boolean },
    callback: (error: unknown, stdout: string, stderr: string) => void
  ): void;
}
