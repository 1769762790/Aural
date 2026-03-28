import type { AuralBridge } from "@aural/contracts";

declare global {
  interface Window {
    aural: AuralBridge;
  }
}

export {};
