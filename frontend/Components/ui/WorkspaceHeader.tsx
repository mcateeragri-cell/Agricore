import type { ReactNode } from "react";

type WorkspaceHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  meta?: ReactNode;
};

export default function WorkspaceHeader({
  eyebrow,
  title,
  description,
  actions,
  meta,
}: WorkspaceHeaderProps) {
  return (
    <header className="ui-workspace-header">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="ui-workspace-eyebrow">{eyebrow}</p>
        ) : null}
        <h1 className="ui-workspace-title">{title}</h1>
        {description ? (
          <p className="ui-workspace-description">{description}</p>
        ) : null}
        {meta ? <div className="mt-3">{meta}</div> : null}
      </div>
      {actions ? (
        <div className="ui-workspace-actions">{actions}</div>
      ) : null}
    </header>
  );
}
