import { useCallback, useEffect, useRef, useState } from "react";
import type { OnlineQrLoginSession, OnlineQrLoginStatus, OnlineUserProfile } from "@aural/contracts";
import { bridge } from "@renderer/lib/bridge";

interface UseQrLoginSessionOptions {
  open: boolean;
  enabled: boolean;
  onAuthorized: (user: OnlineUserProfile | null) => void | Promise<void>;
}

type QrLoginViewState = "idle" | "creating" | "waiting" | "scanned" | "authorized" | "expired" | "error";

export const useQrLoginSession = ({ open, enabled, onAuthorized }: UseQrLoginSessionOptions) => {
  const [session, setSession] = useState<OnlineQrLoginSession | null>(null);
  const [state, setState] = useState<QrLoginViewState>("idle");
  const [message, setMessage] = useState("使用网易云音乐 App 扫码登录。");
  const [error, setError] = useState<string | null>(null);
  const authorizedKeyRef = useRef<string | null>(null);

  const createSession = useCallback(async () => {
    if (!open || !enabled) {
      return;
    }

    setState("creating");
    setError(null);
    setMessage("正在生成二维码...");

    try {
      const nextSession = await bridge.online.createQrLoginSession();
      setSession(nextSession);
      authorizedKeyRef.current = null;
      setState("waiting");
      setMessage("请使用网易云音乐 App 扫码。");
    } catch (createError) {
      const nextMessage = createError instanceof Error ? createError.message : "二维码生成失败，请稍后重试。";
      setSession(null);
      setState("error");
      setError(nextMessage);
      setMessage("二维码暂时不可用。");
    }
  }, [enabled, open]);

  useEffect(() => {
    if (!open || !enabled) {
      setSession(null);
      setState("idle");
      setError(null);
      setMessage("使用网易云音乐 App 扫码登录。");
      authorizedKeyRef.current = null;
      return;
    }

    void createSession();
  }, [createSession, enabled, open]);

  useEffect(() => {
    if (!open || !enabled || !session?.key) {
      return;
    }

    if (state === "expired" || state === "error" || state === "authorized") {
      return;
    }

    const timer = window.setInterval(() => {
      void (async () => {
        try {
          const nextStatus: OnlineQrLoginStatus = await bridge.online.checkQrLoginSession(session.key);

          if (nextStatus.state === "waiting") {
            setState("waiting");
            setMessage("请使用网易云音乐 App 扫码。");
            return;
          }

          if (nextStatus.state === "scanned") {
            setState("scanned");
            setMessage("已扫码，请在手机上确认登录。");
            return;
          }

          if (nextStatus.state === "expired") {
            setState("expired");
            setMessage("二维码已过期，请刷新后重试。");
            return;
          }

          if (nextStatus.state === "authorized") {
            if (authorizedKeyRef.current === session.key) {
              return;
            }

            authorizedKeyRef.current = session.key;
            setState("authorized");
            setMessage("登录成功，正在同步账号信息...");
            await onAuthorized(nextStatus.user);
          }
        } catch (pollError) {
          const nextMessage = pollError instanceof Error ? pollError.message : "扫码状态检查失败。";
          setState("error");
          setError(nextMessage);
          setMessage("登录状态检查失败，请刷新后重试。");
        }
      })();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [enabled, onAuthorized, open, session?.key, state]);

  return {
    session,
    state,
    message,
    error,
    refreshSession: createSession
  };
};
