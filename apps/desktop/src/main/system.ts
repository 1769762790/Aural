import { dialog, shell } from "electron";

export const chooseFolders = async () => {
  const result = await dialog.showOpenDialog({
    title: "选择音乐文件夹",
    properties: ["openDirectory", "multiSelections"]
  });

  return result.canceled ? [] : result.filePaths;
};

export const openPath = async (targetPath: string) => {
  if (!targetPath) {
    return;
  }
  const result = await shell.openPath(targetPath);
  if (result) {
    throw new Error(result);
  }
};
