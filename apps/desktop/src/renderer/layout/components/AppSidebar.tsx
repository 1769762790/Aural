import type { BrowseMode } from "@aural/domain";
import { SidebarNavigation } from "@renderer/components/SidebarNavigation";

export const AppSidebar = ({ browseMode }: { browseMode: BrowseMode }) => (
  <aside className="window-safe-top flex h-full flex-col border-r border-sidebar-border bg-sidebar/95 px-5 pb-6 shadow-[inset_-1px_0_0_rgba(167,139,250,0.1)]">
    <div className="space-y-2 px-2">
      <p className="text-center text-[2rem] font-black tracking-[-0.08em] text-foreground">AURAL</p>
    </div>

    <div className="mt-8 space-y-4">
      <SidebarNavigation mode={browseMode} />
    </div>
  </aside>
);
