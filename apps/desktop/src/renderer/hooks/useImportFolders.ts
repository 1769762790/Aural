import { useNavigate } from "react-router-dom";
import { bridge } from "@renderer/lib/bridge";
import { useLibraryStore } from "@renderer/stores/libraryStore";

export const useImportFolders = () => {
  const navigate = useNavigate();
  const markLibraryChanged = useLibraryStore((state) => state.markLibraryChanged);

  return async () => {
    const folders = await bridge.system.chooseFolders();
    if (folders.length === 0) {
      return false;
    }

    await bridge.library.importFolders(folders);
    markLibraryChanged();
      navigate("/songs");
    return true;
  };
};
