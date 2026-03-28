import type { PropsWithChildren } from "react";

interface PanelFrameProps {
  title: string;
  eyebrow?: string;
  extra?: string;
}

export const PanelFrame = ({
  title,
  eyebrow,
  extra,
  children
}: PropsWithChildren<PanelFrameProps>) => (
  <section className="aural-panel-frame">
    <header className="aural-panel-frame__header">
      <div>
        {eyebrow ? <span>{eyebrow}</span> : null}
        <h3>{title}</h3>
      </div>
      {extra ? <small>{extra}</small> : null}
    </header>
    {children}
  </section>
);

