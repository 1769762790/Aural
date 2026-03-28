import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export const hashFile = async (filePath: string) => {
  const hash = createHash("sha1");
  const stream = createReadStream(filePath);

  for await (const chunk of stream) {
    hash.update(chunk as Buffer);
  }

  return hash.digest("hex");
};

