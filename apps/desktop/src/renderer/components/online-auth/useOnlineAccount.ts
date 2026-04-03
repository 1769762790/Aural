import { useCallback, useEffect, useState } from "react";
import type { OnlineUserProfile } from "@aural/contracts";
import { bridge } from "@renderer/lib/bridge";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

export const useOnlineAccount = () => {
  const [user, setUser] = useState<OnlineUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    try {
      const nextUser = await bridge.online.getCurrentUser();
      setUser(nextUser);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    void refreshUser();
  }, [menuOpen, refreshUser]);

  const applyAuthenticatedUser = useCallback(async (nextUser: OnlineUserProfile | null) => {
    const cookieSetting = await bridge.settings.getSetting("online.neteaseCookie");
    const normalizedCookie = typeof cookieSetting === "string" && cookieSetting.trim().length ? cookieSetting.trim() : null;

    usePreferencesStore.getState().update("online.neteaseCookie", normalizedCookie);
    setUser(nextUser);
    setDialogOpen(false);
    setMenuOpen(false);
  }, []);

  return {
    user,
    isLoading,
    menuOpen,
    setMenuOpen,
    dialogOpen,
    setDialogOpen,
    refreshUser,
    applyAuthenticatedUser
  };
};
