export const toFileUrl = (targetPath: string) =>
  `aural-media://local?path=${encodeURIComponent(targetPath)}`;
