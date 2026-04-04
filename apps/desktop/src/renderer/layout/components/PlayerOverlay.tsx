import { cn } from "@/lib/utils";
import { PlayerScene } from "@renderer/components/PlayerScene";

export const PlayerOverlay = ({
  isOpen,
  onClose
}: {
  isOpen: boolean;
  onClose: () => void;
}) => (
  <div
    className={cn(
      "pointer-events-none absolute inset-0 z-50 transition-opacity duration-300",
      isOpen ? "opacity-100" : "opacity-0"
    )}
    aria-hidden={!isOpen}
  >
    <button
      type="button"
      className={cn(
        "absolute inset-0 bg-[linear-gradient(180deg,rgba(5,7,16,0.18),rgba(5,7,16,0.7))] backdrop-blur-sm transition-opacity duration-300",
        isOpen ? "pointer-events-auto opacity-100" : "opacity-0"
      )}
      onClick={onClose}
      aria-label="Close now playing drawer"
    />

    <div
      className={cn(
        "absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)]",
        isOpen ? "translate-y-0" : "translate-y-full"
      )}
    >
      <div className="flex h-full flex-col justify-end p-0">
        <PlayerScene onClose={onClose} className="pointer-events-auto h-full min-h-0" />
      </div>
    </div>
  </div>
);
