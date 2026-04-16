export default function Modal({ isOpen, onClose, title, children, footer, maxWidth = 520 }) {
  if (!isOpen) return null

  return (
    <div className={`modal-backdrop open`} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal" style={{ maxWidth }}>
        <div className="modal-header">
          <span className="modal-title">{title}</span>
          <button className="modal-close" onClick={onClose}>&#x2715;</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}
