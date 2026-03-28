declare module "node:crypto" {
  interface HashLike {
    update(data: string): HashLike;
    digest(encoding: "hex"): string;
  }

  export function createHash(algorithm: string): HashLike;
}

