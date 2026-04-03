import type { OnlineQrLoginSession, OnlineQrLoginStatus, OnlineUserProfile } from "@aural/contracts";
import type { AuralRepository } from "@aural/data";
import { createEnhancedClient } from "../enhanced-client";

interface OnlineAuthServiceOptions {
  repository: AuralRepository;
}

export const createOnlineAuthService = ({ repository }: OnlineAuthServiceOptions) => {
  const enhancedClient = createEnhancedClient();

  const resolveCookie = () => {
    const value = repository.getSetting("online.neteaseCookie")?.value;
    return typeof value === "string" && value.trim().length ? value.trim() : null;
  };

  const getCurrentUser = async (): Promise<OnlineUserProfile | null> => {
    const cookie = resolveCookie();
    if (!cookie) {
      return null;
    }

    return enhancedClient.getCurrentUser(cookie).catch(() => null);
  };

  const createQrLoginSession = async (): Promise<OnlineQrLoginSession> => enhancedClient.createQrLoginSession();

  const checkQrLoginSession = async (key: string): Promise<OnlineQrLoginStatus> => {
    const payload = await enhancedClient.checkQrLoginSession(key);
    const code = Number(payload.code ?? 0);

    if (code === 803) {
      const cookie = typeof payload.cookie === "string" && payload.cookie.trim().length ? payload.cookie.trim() : null;
      if (cookie) {
        repository.setSetting("online.neteaseCookie", cookie);
      }

      const user = cookie ? await enhancedClient.getCurrentUser(cookie).catch(() => null) : await getCurrentUser();
      return {
        state: "authorized",
        code,
        user
      };
    }

    if (code === 802) {
      return {
        state: "scanned",
        code,
        user: null
      };
    }

    if (code === 800) {
      return {
        state: "expired",
        code,
        user: null
      };
    }

    return {
      state: "waiting",
      code,
      user: null
    };
  };

  return {
    getCurrentUser,
    createQrLoginSession,
    checkQrLoginSession
  };
};
