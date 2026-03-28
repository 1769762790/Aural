import { Button } from "@aural/ui";

interface CollectionPlaylistComposerProps {
  value: string;
  error: string | null;
  isSubmitting: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

const fieldStyle = {
  minHeight: 48,
  borderRadius: 18,
  border: "1px solid rgba(171, 205, 255, 0.14)",
  background: "rgba(7, 13, 20, 0.56)",
  color: "var(--aural-text)",
  padding: "0 16px"
};

export const CollectionPlaylistComposer = ({
  value,
  error,
  isSubmitting,
  onChange,
  onSubmit
}: CollectionPlaylistComposerProps) => (
  <form
    className="aural-card"
    onSubmit={(event) => {
      event.preventDefault();
      void onSubmit();
    }}
    style={{
      display: "grid",
      gap: 12,
      padding: 18
    }}
  >
    <div style={{ display: "grid", gap: 6 }}>
      <strong style={{ fontSize: 16 }}>Create playlist</strong>
      <p style={{ margin: 0, color: "var(--aural-text-muted)", lineHeight: 1.6 }}>
        Create a local playlist and keep it inside the same collection workflow.
      </p>
    </div>

    <label style={{ display: "grid", gap: 8 }}>
      <span
        style={{
          color: "var(--aural-text-muted)",
          fontSize: 12,
          letterSpacing: "0.16em",
          textTransform: "uppercase"
        }}
      >
        Playlist name
      </span>
      <input
        value={value}
        placeholder="New playlist"
        onChange={(event) => onChange(event.target.value)}
        style={fieldStyle}
      />
    </label>

    {error ? (
      <p style={{ margin: 0, color: "#ffb9a6", lineHeight: 1.6 }}>
        {error}
      </p>
    ) : null}

    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
      <Button type="submit" disabled={isSubmitting || value.trim().length === 0}>
        {isSubmitting ? "Creating..." : "Create"}
      </Button>
      <span style={{ color: "var(--aural-text-muted)", fontSize: 13 }}>
        Changes sync immediately after save.
      </span>
    </div>
  </form>
);
