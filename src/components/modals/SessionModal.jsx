import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function SessionModal({ isOpen, onClose, onSave, sessionCount }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  useEffect(() => {
    if (isOpen) {
      setName(`Session ${sessionCount + 1}`)
      setDate(new Date().toISOString().split('T')[0])
    }
  }, [isOpen, sessionCount])

  function handleSave() {
    if (!name.trim()) { alert('Please enter a session name.'); return }
    onSave({ name: name.trim(), date })
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="New Session"
      maxWidth={380}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={handleSave}>Add Session</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Session Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Session 4 — The Dragon's Hoard"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>
      <div className="form-group">
        <label className="form-label">Date</label>
        <input
          type="date"
          className="form-input"
          value={date}
          onChange={e => setDate(e.target.value)}
        />
      </div>
    </Modal>
  )
}
