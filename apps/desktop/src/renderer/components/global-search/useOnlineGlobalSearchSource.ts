import type { PlayableItem } from "@aural/domain";
import { bridge } from "@renderer/lib/bridge";

const ONLINE_TRACK_LIMIT = 6;

const searchOnlineGlobal = async (term: string): Promise<PlayableItem[]> =>
  bridge.online.searchTracks({
    term,
    limit: ONLINE_TRACK_LIMIT
  });

export const useOnlineGlobalSearchSource = () => searchOnlineGlobal;
