import { create } from "zustand";

interface LibraryStoreState {
  revision: number;
  markLibraryChanged: () => void;
}

export const useLibraryStore = create<LibraryStoreState>((set) => ({
  revision: 0,
  markLibraryChanged: () => {
    set((state) => ({
      revision: state.revision + 1
    }));
  }
}));
