import { useEffect } from "react";
import { Icon } from "@crestly/icons";

/**
 * CDS-faithful modal — bottom sheet on mobile (≤600px), centered dialog above.
 * Mirrors the `.install-modal` pattern in erp/includes/footer.php.
 */
export function Modal({
  open,
  title,
  onClose,
  children,
  actions,
  size = "md",
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: React.ReactNode;
  actions?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: 420, md: 560, lg: 720 } as const;

  return (
    <div className="install-modal is-open" role="dialog" aria-modal="true">
      <div className="install-modal__scrim" onClick={onClose} />
      <div className="install-modal__sheet" style={{ maxWidth: widths[size] }}>
        <div className="install-modal__handle" aria-hidden="true" />
        <div className="install-modal__head">
          <div className="display-s">{title}</div>
          <button
            type="button"
            className="btn btn--ghost btn--icon-only btn--sm"
            onClick={onClose}
            aria-label="Close"
          >
            <Icon name="x" size={16} />
          </button>
        </div>
        <div className="install-modal__body">{children}</div>
        {actions && <div className="install-modal__actions">{actions}</div>}
      </div>
    </div>
  );
}
