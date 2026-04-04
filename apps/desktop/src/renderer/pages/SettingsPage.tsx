import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useLocation, useNavigate } from "react-router-dom";
import { useSettingsController } from "@renderer/hooks/useSettingsController";
import { useLibraryStore } from "@renderer/stores/libraryStore";
import { usePlayerStore } from "@renderer/stores/playerStore";
import { usePreferencesStore } from "@renderer/stores/preferencesStore";
import {
  SettingsAppearanceSection,
  SettingsAudioSection,
  SettingsLibrarySection,
  SettingsOnlineSection,
  SettingsPlaybackSection
} from "./settings/sections";
import { TAB_SECTION_IDS, TABS } from "./settings/settings-page.utils";
import { useSettingsPageState } from "./settings/useSettingsPageState";

export const SettingsPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { getValue, updateSetting } = useSettingsController();
  const revision = useLibraryStore((state) => state.revision);
  const markLibraryChanged = useLibraryStore((state) => state.markLibraryChanged);
  const currentTrack = usePlayerStore((state) => state.currentTrack);
  const clearPlayback = usePlayerStore((state) => state.clearPlayback);
  const resolvedTheme = usePreferencesStore((state) => state.resolvedTheme);

  const state = useSettingsPageState({
    getValue,
    updateSetting,
    revision,
    markLibraryChanged,
    currentTrack,
    clearPlayback
  });

  const handleBrowseModeChange = async (mode: "local" | "online") => {
    await updateSetting("online.lastMode", mode);

    if (mode === "online") {
      if (!location.pathname.startsWith("/online")) {
        void navigate("/online");
      }
      return;
    }

    if (location.pathname.startsWith("/online")) {
      void navigate("/");
    }
  };

  return (
    <div ref={state.pageRef} className="flex flex-col gap-6">
      <div ref={state.stickyTabsRef} className="sticky top-0 z-20 px-6 pb-4 pt-5">
        <Tabs value={state.activeTab} orientation="vertical" onValueChange={(value) => state.scrollTo(value as keyof typeof TAB_SECTION_IDS)} className="w-full">
          <TabsList className="grid w-full grid-cols-1 gap-3 rounded-[22px] border border-border bg-background/55 p-1.5 backdrop-blur-xl sm:grid-cols-2 xl:grid-cols-5">
            {TABS.map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "h-auto min-w-[180px] flex-1 justify-start rounded-[18px] border border-transparent border-b-0 px-4 py-3 text-left normal-case tracking-normal md:flex-none",
                  "transform-gpu transition-[transform,background-color,border-color,color,box-shadow] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none",
                  "data-[state=active]:translate-x-1",
                  "data-[state=active]:border-primary/35 data-[state=active]:border-b data-[state=active]:bg-primary data-[state=active]:text-foreground data-[state=active]:shadow-[0_18px_36px_rgba(120,89,255,0.12)]"
                )}
              >
                <div>
                  <p className="text-sm font-semibold tracking-[-0.02em]">{tab.label}</p>
                  <p className="mt-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">{tab.hint}</p>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-10 px-6 pb-8">
        <SettingsAppearanceSection
          sectionId={TAB_SECTION_IDS.appearance}
          setSectionRef={(node) => {
            state.sectionRefs.current.appearance = node;
          }}
          followSystemTheme={state.followSystemTheme}
          resolvedTheme={resolvedTheme}
          appearanceMode={state.appearanceMode}
          appearanceLayout={state.appearanceLayout}
          accent={state.accent}
          accentOptions={state.accentOptions}
          isAccentPickerOpen={state.isAccentPickerOpen}
          setIsAccentPickerOpen={state.setIsAccentPickerOpen}
          normalizedCustomAccent={state.normalizedCustomAccent}
          customAccentDraft={state.customAccentDraft}
          setCustomAccentDraft={state.setCustomAccentDraft}
          activeAccentLabel={state.activeAccentLabel}
          saveCustomAccent={state.saveCustomAccent}
          removeCustomAccent={state.removeCustomAccent}
          setDraftValue={state.setDraftValue}
          draft={state.draft}
          motion={state.motion}
          coverColor={state.coverColor}
          dynamicCoverGradient={state.dynamicCoverGradient}
          playerArtworkBreathing={state.playerArtworkBreathing}
          setPersistent={state.setPersistent}
        />

        <SettingsPlaybackSection
          sectionId={TAB_SECTION_IDS.playback}
          setSectionRef={(node) => {
            state.sectionRefs.current.playback = node;
          }}
          resume={state.resume}
          startupAutoplay={state.startupAutoplay}
          fadeEnabled={state.fadeEnabled}
          fadeMode={state.fadeMode}
          crossfadeSeconds={state.crossfadeSeconds}
          playbackMode={state.playbackMode}
          shuffleStrategy={state.shuffleStrategy}
          playbackRate={state.playbackRate}
          draft={state.draft}
          otherAudioPolicy={state.otherAudioPolicy}
          headphoneInsertAction={state.headphoneInsertAction}
          headphoneRemoveAction={state.headphoneRemoveAction}
          setPersistent={state.setPersistent}
          flushPersistent={state.flushPersistent}
          setDraftValue={state.setDraftValue}
        />

        <SettingsLibrarySection
          sectionId={TAB_SECTION_IDS.library}
          setSectionRef={(node) => {
            state.sectionRefs.current.library = node;
          }}
          isFolderMutationBusy={state.isFolderMutationBusy}
          addFolders={state.addFolders}
          rescanFolders={state.rescanFolders}
          isScanning={state.isScanning}
          folders={state.folders}
          folderNote={state.folderNote}
          isRemovingFolderPath={state.isRemovingFolderPath}
          setFolderPathToConfirmRemoval={state.setFolderPathToConfirmRemoval}
          blacklistInput={state.blacklistInput}
          setBlacklistInput={state.setBlacklistInput}
          draft={state.draft}
          setDraftValue={state.setDraftValue}
          autoScanOnStartup={state.autoScanOnStartup}
          setPersistent={state.setPersistent}
          formats={state.formats}
          scanAllowedFormats={state.scanAllowedFormats}
          scanMinFileMb={state.scanMinFileMb}
          scanExcludeHiddenFiles={state.scanExcludeHiddenFiles}
          folderPathToConfirmRemoval={state.folderPathToConfirmRemoval}
          removeFolderFromWhitelist={state.removeFolderFromWhitelist}
          tagEncoding={state.tagEncoding}
          allowMetadataEditing={state.allowMetadataEditing}
          confirmLocalSourceDeletion={state.confirmLocalSourceDeletion}
          historyLimit={state.historyLimit}
          clearHistoryOnExit={state.clearHistoryOnExit}
        />

        <SettingsAudioSection
          sectionId={TAB_SECTION_IDS.audio}
          setSectionRef={(node) => {
            state.sectionRefs.current.audio = node;
          }}
          replayGainEnabled={state.replayGainEnabled}
          draft={state.draft}
          setDraftValue={state.setDraftValue}
          channelMode={state.channelMode}
          setPersistent={state.setPersistent}
          flushPersistent={state.flushPersistent}
          channelBalance={state.channelBalance}
          crossfadeSeconds={state.crossfadeSeconds}
          outputDeviceSupported={state.outputDeviceSupported}
          outputDeviceId={state.outputDeviceId}
          outputDeviceOptions={state.outputDeviceOptions}
          handleOutputDeviceChange={state.handleOutputDeviceChange}
        />

        <SettingsOnlineSection
          sectionId={TAB_SECTION_IDS.online}
          setSectionRef={(node) => {
            state.sectionRefs.current.online = node;
          }}
          onlineDownloadDirectoryDraft={state.onlineDownloadDirectoryDraft}
          onlineDefaultDownloadDirectory={state.onlineDefaultDownloadDirectory}
          onlineEffectiveDownloadDirectory={state.onlineEffectiveDownloadDirectory}
          onlineCacheDirectoryDraft={state.onlineCacheDirectoryDraft}
          onlineDefaultCacheDirectory={state.onlineDefaultCacheDirectory}
          onlineEffectiveCacheDirectory={state.onlineEffectiveCacheDirectory}
          onlineCacheMaxSizeGb={state.onlineCacheMaxSizeGb}
          onlineMusicNamingFormat={state.onlineMusicNamingFormat}
          onlineNeteaseCookieDraft={state.onlineNeteaseCookieDraft}
          setOnlineCacheDirectoryDraft={state.setOnlineCacheDirectoryDraft}
          setOnlineDownloadDirectoryDraft={state.setOnlineDownloadDirectoryDraft}
          setOnlineNeteaseCookieDraft={state.setOnlineNeteaseCookieDraft}
          commitOnlineCacheDirectory={state.commitOnlineCacheDirectory}
          commitOnlineDownloadDirectory={state.commitOnlineDownloadDirectory}
          commitOnlineNeteaseCookie={state.commitOnlineNeteaseCookie}
          chooseOnlineCacheDirectory={state.chooseOnlineCacheDirectory}
          chooseOnlineDownloadDirectory={state.chooseOnlineDownloadDirectory}
          openOnlineCacheDirectory={state.openOnlineCacheDirectory}
          openOnlineDownloadDirectory={state.openOnlineDownloadDirectory}
          onlinePreferDownloadedCopy={state.onlinePreferDownloadedCopy}
          onlineBrowseMode={state.onlineBrowseMode}
          setBrowseModePreference={handleBrowseModeChange}
          isClearingOnlineCache={state.isClearingOnlineCache}
          clearOnlineCachedMedia={state.clearOnlineCachedMedia}
          setPersistent={state.setPersistent}
        />
      </div>
    </div>
  );
};
