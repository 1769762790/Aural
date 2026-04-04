import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { MetadataDraft } from "./song-library.utils";

export const EditMetadataDialog = ({
  open,
  onOpenChange,
  metadataDraft,
  setMetadataDraft,
  metadataError,
  isSavingMetadata,
  onSubmit
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  metadataDraft: MetadataDraft | null;
  setMetadataDraft: (updater: (current: MetadataDraft | null) => MetadataDraft | null) => void;
  metadataError: string | null;
  isSavingMetadata: boolean;
  onSubmit: () => Promise<void>;
}) => (
  <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="rounded-[28px] border border-border bg-popover/98 sm:max-w-xl">
      <DialogHeader>
        <DialogTitle>Edit metadata</DialogTitle>
        <DialogDescription>Write updated title, artist, album, genre, and year back to the local file.</DialogDescription>
      </DialogHeader>

      {metadataDraft ? (
        <div className="grid gap-4">
          <Input
            value={metadataDraft.title}
            onChange={(event) => setMetadataDraft((current) => (current ? { ...current, title: event.target.value } : current))}
            placeholder="Title"
            className="h-11 rounded-2xl"
          />
          <Input
            value={metadataDraft.artist}
            onChange={(event) => setMetadataDraft((current) => (current ? { ...current, artist: event.target.value } : current))}
            placeholder="Artist"
            className="h-11 rounded-2xl"
          />
          <Input
            value={metadataDraft.album}
            onChange={(event) => setMetadataDraft((current) => (current ? { ...current, album: event.target.value } : current))}
            placeholder="Album"
            className="h-11 rounded-2xl"
          />
          <div className="grid gap-4 sm:grid-cols-[1fr_140px]">
            <Input
              value={metadataDraft.genre}
              onChange={(event) => setMetadataDraft((current) => (current ? { ...current, genre: event.target.value } : current))}
              placeholder="Genre"
              className="h-11 rounded-2xl"
            />
            <Input
              value={metadataDraft.year}
              onChange={(event) => setMetadataDraft((current) => (current ? { ...current, year: event.target.value } : current))}
              placeholder="Year"
              className="h-11 rounded-2xl"
            />
          </div>
          {metadataError ? <p className="text-sm text-rose-400">{metadataError}</p> : null}
        </div>
      ) : null}

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSavingMetadata}>
          Cancel
        </Button>
        <Button onClick={() => void onSubmit()} disabled={isSavingMetadata}>
          {isSavingMetadata ? <Loader2 className="size-4 animate-spin" /> : null}
          Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);
