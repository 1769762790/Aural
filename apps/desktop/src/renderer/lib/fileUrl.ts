export const toFileUrl = (targetPath: string) =>
  `aural-media://local?path=${encodeURIComponent(targetPath)}`;

export const toStreamProxyUrl = (targetUrl: string) =>
  `aural-media://stream?url=${encodeURIComponent(targetUrl)}`;
