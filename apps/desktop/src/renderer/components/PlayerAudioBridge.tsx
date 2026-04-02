import { useEffect, useMemo, useRef } from "react";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";

let hydrated = false;

type AudioPolicy = "pause" | "duck" | "ignore";
type HeadphoneInsertAction = "play" | "ignore";
type HeadphoneRemoveAction = "pause" | "ignore";

const toAudioPolicy = (value: unknown): AudioPolicy =>
  value === "pause" || value === "duck" || value === "ignore" ? value : "duck";

const toHeadphoneInsertAction = (value: unknown): HeadphoneInsertAction =>
  value === "play" || value === "ignore" ? value : "play";

const toHeadphoneRemoveAction = (value: unknown): HeadphoneRemoveAction =>
  value === "pause" || value === "ignore" ? value : "pause";

const isHeadphoneLikeDevice = (label: string) => {
  const normalized = label.toLowerCase();
  return /headphone|headset|earbud|earphone|airpods|ear pods|耳机/.test(normalized);
};

const toDeviceSignature = (device: MediaDeviceInfo) => `${device.deviceId}::${device.groupId}::${device.label}`;

export const PlayerAudioBridge = () => {
  const hydrateAudio = usePlayerStore((state) => state.hydrateAudio);
  const setRuntimeDuck = usePlayerStore((state) => state.setRuntimeDuck);
  const snapshot = usePreferencesStore((state) => state.snapshot);
  const previousOutputDevicesRef = useRef<Array<{ signature: string; label: string }>>([]);

  const otherAudioPolicy = useMemo(
    () => toAudioPolicy(snapshot["player.otherAppAudioPolicy"]),
    [snapshot]
  );

  const headphoneInsertAction = useMemo(
    () => toHeadphoneInsertAction(snapshot["player.headphoneInsertAction"]),
    [snapshot]
  );

  const headphoneRemoveAction = useMemo(
    () => toHeadphoneRemoveAction(snapshot["player.headphoneRemoveAction"]),
    [snapshot]
  );

  useEffect(() => {
    if (hydrated) {
      return;
    }

    hydrateAudio();
    hydrated = true;
  }, [hydrateAudio]);

  useEffect(() => {
    // Clear runtime duck immediately when policy is not duck.
    // Note: detecting "other app is currently producing sound" is not reliably available
    // through browser-level events in Electron renderer, so we intentionally avoid
    // blur/visibility-driven approximations to prevent false triggers.
    if (otherAudioPolicy !== "duck") {
      setRuntimeDuck(false);
    }
    return undefined;
  }, [otherAudioPolicy, setRuntimeDuck]);

  useEffect(() => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    let cancelled = false;

    const snapshotOutputDevices = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        if (cancelled) {
          return [];
        }

        return devices
          .filter((device) => device.kind === "audiooutput")
          .map((device) => ({
            signature: toDeviceSignature(device),
            label: device.label ?? ""
          }));
      } catch {
        return [];
      }
    };

    const handleDeviceChange = async () => {
      const previous = previousOutputDevicesRef.current;
      const next = await snapshotOutputDevices();
      if (cancelled) {
        return;
      }

      const previousSignatures = new Set(previous.map((item) => item.signature));
      const nextSignatures = new Set(next.map((item) => item.signature));
      const added = next.filter((item) => !previousSignatures.has(item.signature));
      const removed = previous.filter((item) => !nextSignatures.has(item.signature));

      const likelyInserted =
        added.some((item) => isHeadphoneLikeDevice(item.label)) || next.length > previous.length;
      const likelyRemoved =
        removed.some((item) => isHeadphoneLikeDevice(item.label)) || next.length < previous.length;

      const state = usePlayerStore.getState();

      if (likelyInserted && headphoneInsertAction === "play" && state.currentItem && !state.playback.isPlaying) {
        void state.togglePlay();
      }

      if (likelyRemoved && headphoneRemoveAction === "pause" && state.playback.isPlaying) {
        void state.togglePlay();
      }

      previousOutputDevicesRef.current = next;
    };

    void snapshotOutputDevices().then((initialDevices) => {
      if (!cancelled) {
        previousOutputDevicesRef.current = initialDevices;
      }
    });

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    return () => {
      cancelled = true;
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
    };
  }, [headphoneInsertAction, headphoneRemoveAction]);

  return null;
};
