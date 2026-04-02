import type { Track } from "@aural/domain";
import { Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from "@/components/ui/alert-dialog";

export const DeleteTrackDialog = ({
  trackToDelete,
  isDeletingTrack,
  onOpenChange,
  onDelete
}: {
  trackToDelete: Track | null;
  isDeletingTrack: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (track: Track) => Promise<void>;
}) => (
  <AlertDialog open={Boolean(trackToDelete)} onOpenChange={onOpenChange}>
    <AlertDialogContent className="rounded-[24px] border border-border bg-popover/98">
      <AlertDialogHeader>
        <AlertDialogTitle>Delete local source file?</AlertDialogTitle>
        <AlertDialogDescription>
          {trackToDelete
            ? `This will permanently delete "${trackToDelete.title}" from your device. The file will be removed from the Songs library and cannot be restored by Aural.`
            : "This will permanently delete the selected file from your device."}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel disabled={isDeletingTrack}>Cancel</AlertDialogCancel>
        <AlertDialogAction
          className="bg-rose-500 text-white hover:bg-rose-400 focus-visible:ring-rose-300"
          disabled={isDeletingTrack || !trackToDelete}
          onClick={(event) => {
            event.preventDefault();
            if (trackToDelete) {
              void onDelete(trackToDelete);
            }
          }}
        >
          {isDeletingTrack ? <Loader2 className="size-4 animate-spin" /> : null}
          Delete file
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);
