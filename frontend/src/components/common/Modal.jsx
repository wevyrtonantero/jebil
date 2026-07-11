import AppIcon from "./AppIcon";

function Modal({ open, title, subtitle, children, onClose, actions, size = "medium", zIndex, closeOnBackdrop = false }) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={closeOnBackdrop ? onClose : undefined}
      style={zIndex ? { zIndex } : undefined}
    >
      <section
        className={`modal-shell modal-${size}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle ? <p>{subtitle}</p> : null}
          </div>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Fechar modal">
            <AppIcon name="close" />
          </button>
        </header>
        <div className="modal-body">{children}</div>
        {actions ? <footer className="modal-footer">{actions}</footer> : null}
      </section>
    </div>
  );
}

export default Modal;
