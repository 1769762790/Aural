export const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) {
    return "--:--";
  }

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
};

export const formatRuntimeCompact = (seconds: number) => {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return "0m";
  }

  const safeSeconds = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m`;
  }

  return "<1m";
};

export const formatCount = (value: number, label: string) =>
  `${Intl.NumberFormat("en-US").format(value)} ${label}`;

export const formatDateTime = (value: string | null) => {
  if (!value) {
    return "Not played yet";
  }

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));
};
