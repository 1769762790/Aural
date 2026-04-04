import type { RefObject } from "react";
import { Outlet } from "react-router-dom";
import { useKeepAliveRef } from "keepalive-for-react";
import KeepAliveRouteOutlet from "keepalive-for-react-router";

export const AppMainContent = ({
  scrollContainerRef,
  layoutMode
}: {
  scrollContainerRef: RefObject<HTMLDivElement | null>;
  layoutMode: "vertical" | "horizontal";
}) => (
  <div ref={scrollContainerRef} data-shell-scroll-root="true" className="min-h-0 flex-1 overflow-auto px-20 pb-32 pt-6" style={{paddingTop: layoutMode === "horizontal"? "175px" : 0}}>
    <KeepAliveRouteOutlet include={['/online']} />
  </div>
);
