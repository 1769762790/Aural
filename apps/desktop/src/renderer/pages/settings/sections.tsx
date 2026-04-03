import { Check, Cloud, FolderSearch, Loader2, PlayCircle, Plus, RefreshCw, Sparkles, Trash2, Volume2, X } from "lucide-react";
import type { SettingKey, SettingValue } from "@aural/domain";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ColorPicker, ColorPickerHex, ColorPickerInput } from "@/components/ui/color-picker";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { Draft } from "./settings-page.utils";
import { Intro, RangeRow, SegmentRow, SelectRow, SettingsCard, TextInputRow, ToggleRow } from "./section-primitives";

export const SettingsAppearanceSection = ({
  sectionId,
  setSectionRef,
  followSystemTheme,
  resolvedTheme,
  appearanceMode,
  accent,
  accentOptions,
  isAccentPickerOpen,
  setIsAccentPickerOpen,
  normalizedCustomAccent,
  customAccentDraft,
  setCustomAccentDraft,
  activeAccentLabel,
  saveCustomAccent,
  removeCustomAccent,
  setDraftValue,
  draft,
  motion,
  coverColor,
  dynamicCoverGradient,
  playerArtworkBreathing,
  setPersistent
}: {
  sectionId: string;
  setSectionRef: (node: HTMLElement | null) => void;
  followSystemTheme: boolean;
  resolvedTheme: "light" | "dark";
  appearanceMode: string;
  accent: string;
  accentOptions: Array<{ value: string; label: string; swatch: string; isCustom: boolean }>;
  isAccentPickerOpen: boolean;
  setIsAccentPickerOpen: (value: boolean) => void;
  normalizedCustomAccent: string;
  customAccentDraft: string;
  setCustomAccentDraft: (value: string) => void;
  activeAccentLabel: string;
  saveCustomAccent: () => void;
  removeCustomAccent: (value: string) => void;
  setDraftValue: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  draft: Draft;
  motion: boolean;
  coverColor: boolean;
  dynamicCoverGradient: boolean;
  playerArtworkBreathing: boolean;
  setPersistent: (key: SettingKey, value: SettingValue) => void;
}) => (
  <section id={sectionId} data-settings-tab="appearance" ref={setSectionRef} className="scroll-mt-28 space-y-6">
    <Intro
      icon={Sparkles}
      eyebrow="Interface"
      description="Only presentation-layer preferences live here. Theme mode, system following, accent color, and language remain aligned across the app."
    />
    <div className="grid gap-5 xl:grid-cols-2">
      <SettingsCard title="Theme and display" description="Control color, mode, motion, and interface density in one place.">
        <ToggleRow
          label="Follow system theme"
          desc="Automatically switch between light and dark with the OS."
          checked={followSystemTheme}
          onChange={(value) => setPersistent("appearance.mode", value ? "system" : "dark")}
          live
        />
        <SegmentRow
          label="Light / dark mode"
          desc="Manual theme mode when system following is disabled."
          value={followSystemTheme ? resolvedTheme : appearanceMode}
          options={[["Dark", "dark"], ["Light", "light"]]}
          onChange={(value) => setPersistent("appearance.mode", value)}
          disabled={followSystemTheme}
          live
        />
        <div className="rounded-[24px] border border-border bg-background/50 p-5">
          <div className="mb-4 space-y-1">
            <p className="text-sm font-semibold text-foreground">Custom accent color</p>
            <p className="text-sm leading-6 text-muted-foreground">Drive primary controls, highlights, and brand atmosphere.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            {accentOptions.map((option) => (
              <div
                key={option.value}
                className={cn(
                  "flex items-center gap-1 rounded-full border pr-2 text-sm",
                  accent === option.value
                    ? "border-primary/30 bg-primary/12 text-foreground"
                    : "border-border bg-background/55 text-muted-foreground hover:text-foreground"
                )}
              >
                <button
                  type="button"
                  className="flex min-w-0 items-center gap-3 rounded-full px-3 py-2"
                  onClick={() => setPersistent("appearance.accent", option.value)}
                >
                  <span className="size-5 rounded-full border border-black/5 dark:border-white/10" style={{ background: option.swatch }} />
                  <span className="max-w-[108px] truncate">{option.label}</span>
                  {accent === option.value ? <Check className="size-4 text-primary" /> : null}
                </button>
                {option.isCustom && accent !== option.value ? (
                  <button
                    type="button"
                    aria-label={`Delete ${option.label}`}
                    className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent/55 hover:text-foreground"
                    onClick={() => removeCustomAccent(option.value)}
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
            ))}
            <Popover open={isAccentPickerOpen} onOpenChange={setIsAccentPickerOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-3 rounded-full border border-dashed border-primary/30 bg-background/55 px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent/45 hover:text-foreground"
                >
                  <span className="flex size-5 items-center justify-center rounded-full bg-primary/12 text-primary">
                    <Plus className="size-3.5" />
                  </span>
                  Add custom
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                side="bottom"
                sideOffset={12}
                className="w-[292px] rounded-[24px] border-border bg-popover/96 p-4 shadow-[0_20px_48px_rgba(0,0,0,0.18)] backdrop-blur-xl"
              >
                <div className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-foreground">Pick a custom accent</p>
                    <p className="text-sm leading-6 text-muted-foreground">This color will join the preset swatches and stay selectable later.</p>
                  </div>
                  <ColorPicker className="w-full overflow-hidden rounded-[20px] border-border bg-background/70 shadow-none">
                    <ColorPickerHex color={normalizedCustomAccent} onChange={setCustomAccentDraft} />
                  </ColorPicker>
                  <div className="flex items-center gap-3 rounded-[18px] border border-border bg-background/70 px-3 py-2">
                    <span className="size-7 rounded-full border border-black/5 dark:border-white/10" style={{ background: normalizedCustomAccent }} />
                    <ColorPickerInput value={customAccentDraft.toUpperCase()} onChange={(event) => setCustomAccentDraft(event.target.value)} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current: {activeAccentLabel}</span>
                    <Button type="button" className="rounded-full" disabled={!normalizedCustomAccent} onClick={saveCustomAccent}>
                      Save color
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <SelectRow
          label="Interface language"
          desc="Pick a specific UI language manually."
          value={draft.language}
          options={[
            { label: "简体中文", value: "zh-CN" },
            { label: "English", value: "en-US" },
            { label: "Japanese", value: "ja-JP" }
          ]}
          onChange={(value) => setDraftValue("language", value as Draft["language"])}
          disabled={draft.followSystemLanguage}
        />
        <div className="grid gap-4 xl:grid-cols-2">
          <ToggleRow label="Motion" desc="Reduce global transitions and animation." checked={motion} onChange={(value) => setPersistent("appearance.motion", value)} live />
          <ToggleRow label="Cover ambience" desc="Allow cover colors to tint the player atmosphere." checked={coverColor} onChange={(value) => setPersistent("appearance.coverColor", value)} live />
          <ToggleRow label="Dynamic cover gradient" desc="Follow cover art with a dual-tone gradient inside the main player scene." checked={dynamicCoverGradient} onChange={(value) => setPersistent("appearance.dynamicCoverGradient", value)} live />
          <ToggleRow label="Artwork breathing" desc="Let the main player cover shadow breathe gently while playback is active." checked={playerArtworkBreathing} onChange={(value) => setPersistent("appearance.playerArtworkBreathing", value)} live />
        </div>
      </SettingsCard>
    </div>
  </section>
);

export const SettingsPlaybackSection = ({
  sectionId,
  setSectionRef,
  resume,
  startupAutoplay,
  fadeEnabled,
  fadeMode,
  crossfadeSeconds,
  playbackMode,
  shuffleStrategy,
  playbackRate,
  draft,
  otherAudioPolicy,
  headphoneInsertAction,
  headphoneRemoveAction,
  setPersistent,
  flushPersistent,
  setDraftValue
}: {
  sectionId: string;
  setSectionRef: (node: HTMLElement | null) => void;
  resume: boolean;
  startupAutoplay: boolean;
  fadeEnabled: boolean;
  fadeMode: "fade" | "crossfade";
  crossfadeSeconds: number;
  playbackMode: string;
  shuffleStrategy: "true-random" | "anti-repeat";
  playbackRate: number;
  draft: Draft;
  otherAudioPolicy: "pause" | "duck" | "ignore";
  headphoneInsertAction: "play" | "ignore";
  headphoneRemoveAction: "pause" | "ignore";
  setPersistent: (key: SettingKey, value: SettingValue) => void;
  flushPersistent: (key: SettingKey) => void;
  setDraftValue: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) => (
  <section id={sectionId} data-settings-tab="playback" ref={setSectionRef} className="scroll-mt-28 space-y-6">
    <Intro
      icon={PlayCircle}
      eyebrow="Playback"
      description="Startup restore, random strategy, speed defaults, and headset actions are grouped into one stable control surface."
    />
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <SettingsCard title="Core playback behavior" description="Control startup state, speed rules, and default queue behavior.">
        <div className="space-y-2">
          <ToggleRow label="Startup autoplay" desc="Automatically resume and play the last paused song on app launch." checked={resume && startupAutoplay} onChange={(value) => setPersistent("player.startupAutoplay", value)} live disabled={!resume} />
          {!resume ? <p className="px-2 text-xs leading-6 text-muted-foreground">需开启 “从上次位置继续” 才能启用</p> : null}
        </div>
        <Accordion type="single" collapsible value={fadeEnabled ? "fade-settings" : undefined} className="rounded-[24px] border border-border bg-background/55">
          <AccordionItem value="fade-settings" className="border-b-0">
            <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
              <div className="max-w-2xl space-y-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-foreground">Enable fade in / out</p>
                  <Badge variant="secondary">Live</Badge>
                </div>
                <p className="text-sm leading-6 text-muted-foreground">Smoothly fade playback when songs start, pause, resume, or switch.</p>
              </div>
              <Switch checked={fadeEnabled} onCheckedChange={(value) => setPersistent("player.fadeEnabled", Boolean(value))} className="data-checked:bg-primary data-unchecked:bg-input/90" />
            </div>
            <AccordionContent className="px-5 pb-5">
              <div className="grid gap-4 rounded-[20px] p-4">
                <SegmentRow label="Fade mode" desc="Choose between a normal fade and a crossfade-style switch." value={fadeMode} options={[["Normal fade", "fade"], ["Crossfade", "crossfade"]]} onChange={(value) => setPersistent("player.fadeMode", value)} live />
                <RangeRow label="Fade duration" desc="Adjust the transition time from 300ms to 1500ms." value={Math.round(crossfadeSeconds * 1000)} min={300} max={1500} step={100} suffix="ms" onChange={(value) => setPersistent("player.crossfadeSeconds", Number((value / 1000).toFixed(1)))} onCommit={() => flushPersistent("player.crossfadeSeconds")} live />
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
        <ToggleRow label="Resume from last position" desc="Continue from the last stopped position after restart." checked={resume} onChange={(value) => { setPersistent("player.resume", value); if (!value) { setPersistent("player.startupAutoplay", false); } }} live />
        <SegmentRow label="Default playback mode" desc="Set queue, repeat-one, or shuffle as the default." value={playbackMode} options={[["Queue", "queue"], ["Repeat one", "repeat-one"], ["Shuffle", "shuffle"]]} onChange={(value) => setPersistent("player.playbackMode", value)} live />
        <SegmentRow label="Shuffle strategy" desc="Switch between true random and anti-repeat shuffle." value={shuffleStrategy} options={[["True random", "true-random"], ["Anti-repeat", "anti-repeat"]]} onChange={(value) => setPersistent("player.shuffleStrategy", value)} live />
        <RangeRow label="Default speed" desc="Default playback speed from 0.5x to 3.0x." value={playbackRate} min={0.5} max={3} step={0.1} suffix="x" onChange={(value) => setPersistent("player.playbackRate", Number(value.toFixed(1)))} onCommit={() => flushPersistent("player.playbackRate")} live />
        <div className="grid gap-4 xl:grid-cols-2">
          <ToggleRow label="Remember per-track speed" desc="Store the last used speed for each track." checked={draft.rememberTrackSpeed} onChange={(value) => setDraftValue("rememberTrackSpeed", value)} />
          <ToggleRow label="Pitch compensation" desc="Keep pitch steadier when playback speed changes." checked={draft.pitchCompensation} onChange={(value) => setDraftValue("pitchCompensation", value)} />
        </div>
      </SettingsCard>
      <SettingsCard title="Audio focus and devices" description="Make Aural predictable when other apps play sound or when headsets change state.">
        <SegmentRow label="Other app audio policy" desc="Pause, duck, or ignore when other apps produce sound." value={otherAudioPolicy} options={[["Pause", "pause"], ["Duck", "duck"], ["Ignore", "ignore"]]} onChange={(value) => setPersistent("player.otherAppAudioPolicy", value)} live />
        <SegmentRow label="Headphone insert" desc="Auto play or ignore when headphones are inserted." value={headphoneInsertAction} options={[["Auto play", "play"], ["Ignore", "ignore"]]} onChange={(value) => setPersistent("player.headphoneInsertAction", value)} live />
        <SegmentRow label="Headphone remove" desc="Pause or ignore when headphones are removed." value={headphoneRemoveAction} options={[["Pause", "pause"], ["Ignore", "ignore"]]} onChange={(value) => setPersistent("player.headphoneRemoveAction", value)} live />
      </SettingsCard>
    </div>
  </section>
);

export const SettingsLibrarySection = ({
  sectionId,
  setSectionRef,
  isFolderMutationBusy,
  addFolders,
  rescanFolders,
  isScanning,
  folders,
  folderNote,
  isRemovingFolderPath,
  setFolderPathToConfirmRemoval,
  blacklistInput,
  setBlacklistInput,
  draft,
  setDraftValue,
  autoScanOnStartup,
  setPersistent,
  formats,
  scanAllowedFormats,
  scanMinFileMb,
  scanExcludeHiddenFiles,
  folderPathToConfirmRemoval,
  removeFolderFromWhitelist,
  tagEncoding,
  allowMetadataEditing,
  confirmLocalSourceDeletion,
  historyLimit,
  clearHistoryOnExit
}: {
  sectionId: string;
  setSectionRef: (node: HTMLElement | null) => void;
  isFolderMutationBusy: boolean;
  addFolders: () => Promise<void>;
  rescanFolders: () => Promise<void>;
  isScanning: boolean;
  folders: { data: Array<{ path: string; trackCount: number; missingCount: number }> | null; isLoading: boolean };
  folderNote: (folder: { path: string; trackCount: number; missingCount: number }) => string;
  isRemovingFolderPath: string | null;
  setFolderPathToConfirmRemoval: (value: string | null) => void;
  blacklistInput: string;
  setBlacklistInput: (value: string) => void;
  draft: Draft;
  setDraftValue: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  autoScanOnStartup: boolean;
  setPersistent: (key: SettingKey, value: SettingValue) => void;
  formats: Set<string>;
  scanAllowedFormats: string[];
  scanMinFileMb: number;
  scanExcludeHiddenFiles: boolean;
  folderPathToConfirmRemoval: string | null;
  removeFolderFromWhitelist: (folderPath: string) => Promise<void>;
  tagEncoding: "auto" | "utf-8" | "gbk";
  allowMetadataEditing: boolean;
  confirmLocalSourceDeletion: boolean;
  historyLimit: number;
  clearHistoryOnExit: boolean;
}) => (
  <section id={sectionId} data-settings-tab="library" ref={setSectionRef} className="scroll-mt-28 space-y-6">
    <Intro
      icon={FolderSearch}
      eyebrow="Library"
      description="Whitelist folders remain the core, blacklist and scanning rules stay nearby, and higher-risk file actions are isolated."
    />
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <SettingsCard
        title="Folder scan management"
        description="Manage whitelist folders, blacklist folders, and scan triggers."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" disabled={isFolderMutationBusy} onClick={() => void addFolders()}>
              Add folder
            </Button>
            <Button className="rounded-full" disabled={isFolderMutationBusy} onClick={() => void rescanFolders()}>
              <RefreshCw className={cn("size-4", isScanning && "animate-spin")} />
              Manual scan
            </Button>
          </div>
        }
      >
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Scan whitelist</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Folders currently included in library scanning.</p>
          </div>
          <div className="space-y-2">
            {folders.data?.length ? (
              folders.data.map((folder) => {
                const isRemoving = isRemovingFolderPath === folder.path;
                return (
                  <div key={folder.path} className="flex items-center justify-between gap-3 rounded-[20px] border border-border bg-background/55 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{folder.path}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{folderNote(folder)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-[12px]"
                      disabled={isFolderMutationBusy}
                      onClick={() => setFolderPathToConfirmRemoval(folder.path)}
                      aria-label={`Remove ${folder.path}`}
                    >
                      {isRemoving ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
                    </Button>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[20px] border border-dashed border-border bg-background/35 px-4 py-5 text-sm text-muted-foreground">
                {folders.isLoading ? "Loading folders..." : "Empty"}
              </div>
            )}
          </div>
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Scan blacklist</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Exclude cache folders, recordings, and other unwanted folders.</p>
          </div>
          <div className="flex gap-3">
            <Input value={blacklistInput} onChange={(event) => setBlacklistInput(event.target.value)} placeholder="Add blacklist path" className="rounded-[18px]" />
            <Button
              variant="outline"
              className="rounded-[18px]"
              onClick={() => {
                const next = blacklistInput.trim();
                if (!next) {
                  return;
                }
                setDraftValue("blacklistFolders", [...draft.blacklistFolders, next]);
                setBlacklistInput("");
              }}
            >
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {draft.blacklistFolders.length ? (
              draft.blacklistFolders.map((folder) => (
                <button
                  key={folder}
                  type="button"
                  className="rounded-full border border-border bg-background/60 px-3 py-2 text-xs text-foreground/80 hover:bg-accent/45"
                  onClick={() => setDraftValue("blacklistFolders", draft.blacklistFolders.filter((item) => item !== folder))}
                >
                  {folder} <span className="text-muted-foreground">×</span>
                </button>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Empty</span>
            )}
          </div>
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <ToggleRow label="Auto scan on startup" desc="Check selected folders for changes during app launch." checked={autoScanOnStartup} onChange={(value) => setPersistent("library.autoScanOnStartup", value)} live />
          <ToggleRow label="Incremental scan on folder changes" desc="Sync only changed files when folder contents change." checked={draft.incrementalScan} onChange={(value) => setDraftValue("incrementalScan", value)} />
        </div>
        <div className="space-y-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Scan rules</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Filter by audio format, minimum size, and hidden files.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {["mp3", "flac", "wav", "ape", "m4a", "aac", "ogg", "wma"].map((format) => {
              const nextFormats = formats.has(format)
                ? scanAllowedFormats.filter((item) => item !== format)
                : [...scanAllowedFormats, format];

              return (
                <button
                  key={format}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em]",
                    formats.has(format)
                      ? "border-primary/30 bg-primary/14 text-primary"
                      : "border-border bg-background/55 text-muted-foreground hover:text-foreground"
                  )}
                  onClick={() => setPersistent("library.scanAllowedFormats", JSON.stringify(nextFormats))}
                >
                  {format}
                </button>
              );
            })}
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            <RangeRow label="Minimum file size" desc="Ignore files smaller than this limit." value={scanMinFileMb} min={0} max={20} step={1} suffix="MB" onChange={(value) => setPersistent("library.minFileMb", Math.max(0, Math.round(value)))} />
            <ToggleRow label="Exclude hidden files" desc="Skip hidden audio files during scanning." checked={scanExcludeHiddenFiles} onChange={(value) => setPersistent("library.excludeHiddenFiles", value)} />
          </div>
        </div>
      </SettingsCard>
      <AlertDialog open={Boolean(folderPathToConfirmRemoval)} onOpenChange={(open) => !open && setFolderPathToConfirmRemoval(null)}>
        <AlertDialogContent className="rounded-[20px] border border-border bg-popover/98">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove folder from scan whitelist?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this folder from scanning? This does not delete local files. Tracks that are no longer inside any whitelist folder will be removed from library, playlists, favorites, and history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={Boolean(isRemovingFolderPath)}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              disabled={!folderPathToConfirmRemoval || Boolean(isRemovingFolderPath)}
              onClick={() => {
                if (!folderPathToConfirmRemoval) {
                  return;
                }
                void removeFolderFromWhitelist(folderPathToConfirmRemoval);
              }}
            >
              {isRemovingFolderPath ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="size-4 animate-spin" />
                  Removing...
                </span>
              ) : (
                "Remove folder"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <div className="grid gap-5">
        <SettingsCard title="Metadata and file management" description="Encoding, metadata write access, and file-level safeguards live together.">
          <SelectRow label="Tag encoding" desc="Fix legacy metadata text corruption." value={tagEncoding} options={[{ label: "Auto detect", value: "auto" }, { label: "UTF-8", value: "utf-8" }, { label: "GBK", value: "gbk" }]} onChange={(value) => setPersistent("library.tagEncoding", value)} />
          <ToggleRow label="Allow metadata editing" desc="Only enable edit actions inside the Songs list." checked={allowMetadataEditing} onChange={(value) => setPersistent("library.allowMetadataEditing", value)} />
          <ToggleRow label="Auto organize same-name items" desc="Planned for a later pass. Duplicate grouping is not active yet." checked={false} onChange={() => undefined} disabled />
          <ToggleRow label="Confirm local source deletion" desc="Only applies to the Songs list when deleting source files from device." checked={confirmLocalSourceDeletion} onChange={(value) => setPersistent("library.confirmLocalSourceDeletion", value)} />
        </SettingsCard>
        <SettingsCard title="Playback history and favorites" description="Control history persistence, capacity, and cleanup behavior.">
          <RangeRow label="Max history items" desc="Limit the amount of history kept in the app." value={historyLimit} min={50} max={500} step={20} suffix=" items" onChange={(value) => setPersistent("history.maxItems", Math.min(500, Math.max(50, Math.round(value / 20) * 20)))} />
          <ToggleRow label="Clear history on exit" desc="Automatically purge recent history when the app closes." checked={clearHistoryOnExit} onChange={(value) => setPersistent("history.clearOnExit", value)} />
        </SettingsCard>
      </div>
    </div>
  </section>
);

export const SettingsAudioSection = ({
  sectionId,
  setSectionRef,
  replayGainEnabled,
  draft,
  setDraftValue,
  channelMode,
  setPersistent,
  flushPersistent,
  channelBalance,
  crossfadeSeconds,
  outputDeviceSupported,
  outputDeviceId,
  outputDeviceOptions,
  handleOutputDeviceChange
}: {
  sectionId: string;
  setSectionRef: (node: HTMLElement | null) => void;
  replayGainEnabled: boolean;
  draft: Draft;
  setDraftValue: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
  channelMode: "stereo" | "mono";
  setPersistent: (key: SettingKey, value: SettingValue) => void;
  flushPersistent: (key: SettingKey) => void;
  channelBalance: number;
  crossfadeSeconds: number;
  outputDeviceSupported: boolean;
  outputDeviceId: string;
  outputDeviceOptions: Array<{ label: string; value: string }>;
  handleOutputDeviceChange: (value: string) => Promise<void>;
}) => (
  <section id={sectionId} data-settings-tab="audio" ref={setSectionRef} className="scroll-mt-28 space-y-6">
    <Intro
      icon={Volume2}
      eyebrow="Audio"
      description="ReplayGain, EQ, channel control, and fade timing stay visible. Decoder and output routing remain folded under advanced controls."
    />
    <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <SettingsCard title="Base quality settings" description="Keep perceived loudness, EQ color, and stereo behavior under control.">
        <ToggleRow label="ReplayGain" desc="Balance loudness between tracks automatically." checked={replayGainEnabled} onChange={(value) => setPersistent("player.replayGainEnabled", value)} live />
        <SegmentRow label="EQ preset" desc="Switch between common tonal presets or custom mode." value={draft.eqPreset} options={[["Off", "off"], ["Pop", "pop"], ["Rock", "rock"], ["Classical", "classical"], ["Vocal", "vocal"], ["Custom", "custom"]]} onChange={(value) => setDraftValue("eqPreset", value as Draft["eqPreset"])} />
        <SegmentRow label="Channel mode" desc="Switch between stereo and mono." value={channelMode} options={[["Stereo", "stereo"], ["Mono", "mono"]]} onChange={(value) => setPersistent("player.channelMode", value)} live />
        <div className="grid gap-4 xl:grid-cols-2">
          <RangeRow label="Left / right balance" desc="Shift playback center left or right." value={channelBalance} min={-100} max={100} step={5} suffix="%" onChange={(value) => setPersistent("player.channelBalance", Math.min(100, Math.max(-100, Math.round(value / 5) * 5)))} onCommit={() => flushPersistent("player.channelBalance")} live />
          <RangeRow label="Fade duration" desc="Control the crossfade duration from 0 to 5 seconds." value={crossfadeSeconds} min={0} max={5} step={0.5} suffix="s" onChange={(value) => setPersistent("player.crossfadeSeconds", Number(value.toFixed(1)))} onCommit={() => flushPersistent("player.crossfadeSeconds")} live />
        </div>
      </SettingsCard>
      <SettingsCard title="Advanced quality settings" description="Decoder behavior, output routing, and plugin hooks stay hidden until needed.">
        <div className="grid gap-4 xl:grid-cols-2">
          <SegmentRow label="Decoder mode" desc="Switch between hardware and software decode." value={draft.decoderMode} options={[["Hardware", "hardware"], ["Software", "software"]]} onChange={(value) => setDraftValue("decoderMode", value as Draft["decoderMode"])} />
          <SelectRow label="Preferred decode profile" desc="Bias toward lossless or compatibility." value={draft.preferredDecoder} options={[{ label: "Auto", value: "auto" }, { label: "Lossless first", value: "lossless" }, { label: "Compatibility first", value: "compatibility" }]} onChange={(value) => setDraftValue("preferredDecoder", value as Draft["preferredDecoder"])} />
        </div>
        <ToggleRow label="Automatic downgrade" desc="Fallback to safer decode path when formats are incompatible." checked={draft.decodeFallback} onChange={(value) => setDraftValue("decodeFallback", value)} />
        <div className="grid gap-4 xl:grid-cols-3">
          <SelectRow label="Output device" desc={outputDeviceSupported ? "Pick the audio output channel." : "Output device switching is not supported in this runtime."} value={outputDeviceId} options={outputDeviceOptions} onChange={(value) => { void handleOutputDeviceChange(value); }} disabled={!outputDeviceSupported} />
          <SelectRow label="Sample rate" desc="Choose the output sample rate." value={draft.sampleRate} options={[{ label: "Auto", value: "auto" }, { label: "44.1 kHz", value: "44.1k" }, { label: "48 kHz", value: "48k" }, { label: "96 kHz", value: "96k" }]} onChange={(value) => setDraftValue("sampleRate", value as Draft["sampleRate"])} />
          <SelectRow label="Bit depth" desc="Choose output bit depth." value={draft.bitDepth} options={[{ label: "16 bit", value: "16" }, { label: "24 bit", value: "24" }, { label: "32 bit", value: "32" }]} onChange={(value) => setDraftValue("bitDepth", value as Draft["bitDepth"])} />
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          <ToggleRow label="Bit perfect" desc="Keep a cleaner direct output path when possible." checked={draft.bitPerfect} onChange={(value) => setDraftValue("bitPerfect", value)} />
          <ToggleRow label="VST plugin management" desc="Enable desktop VST effect expansion." checked={draft.vstEnabled} onChange={(value) => setDraftValue("vstEnabled", value)} />
          <ToggleRow label="Noise reduction" desc="Reduce low-level background noise." checked={draft.noiseReduction} onChange={(value) => setDraftValue("noiseReduction", value)} />
        </div>
      </SettingsCard>
    </div>
  </section>
);

export const SettingsOnlineSection = ({
  sectionId,
  setSectionRef,
  onlineDownloadDirectoryDraft,
  onlineDefaultDownloadDirectory,
  onlineEffectiveDownloadDirectory,
  onlineNeteaseCookieDraft,
  setOnlineDownloadDirectoryDraft,
  setOnlineNeteaseCookieDraft,
  commitOnlineDownloadDirectory,
  commitOnlineNeteaseCookie,
  chooseOnlineDownloadDirectory,
  openOnlineDownloadDirectory,
  onlinePreferDownloadedCopy,
  setPersistent
}: {
  sectionId: string;
  setSectionRef: (node: HTMLElement | null) => void;
  onlineDownloadDirectoryDraft: string;
  onlineDefaultDownloadDirectory: string;
  onlineEffectiveDownloadDirectory: string;
  onlineNeteaseCookieDraft: string;
  setOnlineDownloadDirectoryDraft: (value: string) => void;
  setOnlineNeteaseCookieDraft: (value: string) => void;
  commitOnlineDownloadDirectory: () => void;
  commitOnlineNeteaseCookie: () => void;
  chooseOnlineDownloadDirectory: () => Promise<void>;
  openOnlineDownloadDirectory: () => Promise<void>;
  onlinePreferDownloadedCopy: boolean;
  setPersistent: (key: SettingKey, value: SettingValue) => void;
}) => (
  <section id={sectionId} data-settings-tab="online" ref={setSectionRef} className="scroll-mt-28 space-y-6">
    <Intro
      icon={Cloud}
      eyebrow="Online"
      description="Configure offline download location and cache preference without mixing these controls into local-library playback settings."
    />
    <div className="grid gap-5">
      <SettingsCard title="Offline cache policy" description="Decide where downloads are stored and whether cached files take priority during playback.">
        <TextInputRow
          label="Netease cookie"
          desc="Optional login cookie used to read account-bound data such as liked songs and daily recommendations."
          value={onlineNeteaseCookieDraft}
          placeholder="Paste NETEASE_COOKIE here"
          onChange={setOnlineNeteaseCookieDraft}
          onCommit={commitOnlineNeteaseCookie}
          actionLabel="Save"
        />
        <TextInputRow
          label="Download directory"
          desc="Manual path for downloaded online tracks. Leave empty to use the default userData online-cache directory."
          value={onlineDownloadDirectoryDraft}
          placeholder={onlineDefaultDownloadDirectory || "Loading default online-cache path..."}
          onChange={setOnlineDownloadDirectoryDraft}
          onCommit={commitOnlineDownloadDirectory}
          actionLabel="Open"
          onAction={() => {
            void openOnlineDownloadDirectory();
          }}
          secondaryActionLabel="Change"
          onSecondaryAction={() => {
            void chooseOnlineDownloadDirectory();
          }}
        />
        <div className="rounded-[20px] border border-dashed border-border bg-background/40 px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Effective directory</p>
          <p className="mt-2 break-all text-sm leading-6 text-foreground">
            {onlineEffectiveDownloadDirectory || "Resolving default online-cache directory..."}
          </p>
        </div>
        <ToggleRow
          label="Prefer downloaded copy"
          desc="Use an offline cached file first when the same online track has already been downloaded."
          checked={onlinePreferDownloadedCopy}
          onChange={(value) => setPersistent("online.preferDownloadedCopy", value)}
          live
        />
      </SettingsCard>
    </div>
  </section>
);
