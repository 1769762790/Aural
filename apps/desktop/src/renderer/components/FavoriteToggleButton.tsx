import { Heart } from "lucide-react";
import { cn } from "@/lib/utils";

interface FavoriteToggleButtonProps {
  isFavorite: boolean;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  className?: string;
}

export const FavoriteToggleButton = ({
  isFavorite,
  onClick,
  className
}: FavoriteToggleButtonProps) => (
  <button
    type="button"
    aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
    className={cn(
      className,
      "flex size-9 min-h-9 min-w-9 items-center justify-center rounded-full border transition-colors",
      isFavorite
        ? "border-primary/24 bg-primary/16 text-primary"
        : "border-border bg-background/65 text-muted-foreground hover:bg-accent/45 hover:text-foreground"
    )}
    onClick={onClick}
  >
    <Heart className={cn("size-4 shrink-0", isFavorite && "fill-current")} />
  </button>
);
