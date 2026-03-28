import { Volume2, VolumeOff } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { usePlayerStore } from "@renderer/stores/playerStore";

interface VolumeControlProps {
  className?: string;
  buttonClassName?: string;
  iconClassName?: string;
  trackClassName?: string;
}

export const VolumeControl = ({
  className,
  buttonClassName,
  iconClassName,
  trackClassName
}: VolumeControlProps) => {
  const playback = usePlayerStore((state) => state.playback);
  const isMuted = usePlayerStore((state) => state.isMuted);
  const setVolumeLevel = usePlayerStore((state) => state.setVolumeLevel);
  const toggleMute = usePlayerStore((state) => state.toggleMute);

  const volumePercent = Math.max(0, Math.min(100, Math.round(playback.volume * 100)));
  const displayPercent = isMuted ? 0 : volumePercent;
  const Icon = isMuted || volumePercent <= 0 ? VolumeOff : Volume2;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <button
        type="button"
        className={cn("transition-colors", buttonClassName)}
        onClick={() => toggleMute()}
        aria-label={isMuted || volumePercent <= 0 ? "Unmute audio" : "Mute audio"}
      >
        <Icon className={cn("size-4", iconClassName)} />
      </button>
      <Slider
        min={0}
        max={100}
        step={1}
        value={[displayPercent]}
        onValueChange={(values) => {
          const next = values[0];
          if (typeof next === "number" && Number.isFinite(next)) {
            setVolumeLevel(next / 100);
          }
        }}
        aria-label="Adjust volume"
        className={cn("w-24", trackClassName)}
      />
    </div>
  );
};
