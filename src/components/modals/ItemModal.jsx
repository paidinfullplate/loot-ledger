import { useState, useEffect } from 'react'
import Modal from './Modal'

const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

const DEFAULTS = {
  name: '',
  quantity: 1,
  rarity: 'Rare',
  valueGp: 0,
  assignedTo: 'Party',
  sessionId: '',
  notes: '',
  attuned: false,
  mystery: false,
  trueName: '',
}

export default function ItemModal({ isOpen, onClose, onSave, characters, sessions }) {
  const [form, setForm] = useState(DEFAULTS)

  useEffect(() => {
    if (isOpen) setForm({ ...DEFAULTS, assignedTo: 'Party' })
  }, [isOpen])

  function set(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    if (!form.name.trim()) { alert('Please enter an item name.'); return }
    const item = {
      name: form.name.trim(),
      quantity: parseInt(form.quantity) || 1,
      rarity: form.rarity,
      valueGp: parseFloat(form.valueGp) || 0,
      assignedTo: form.assignedTo,
      sessionId: form.sessionId || null,
      notes: form.notes.trim(),
      attuned: form.attuned,
      mystery: form.mystery,
      trueName: form.mystery ? form.trueName.trim() : null,
      revealed: false,
      flavorText: null,
    }
    onSave(item)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Treasure"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={handleSave}>Add to Ledger</button>
        </>
      }
    >
      <div className="form-row">
        <div className="form-group" style={{ flex: 2, minWidth: 200 }}>
          <label className="form-label">Item Name</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Cloak of Elvenkind"
            value={form.name}
            onChange={e => set('name', e.target.value)}
            autoFocus
          />
        </div>
        <div className="form-group" style={{ minWidth: 100 }}>
          <label className="form-label">Qty</label>
          <input
            type="number"
            className="form-input"
            value={form.quantity}
            min="1"
            onChange={e => set('quantity', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Rarity</label>
          <select
            className="form-select"
            value={form.rarity}
            onChange={e => set('rarity', e.target.value)}
          >
            {RARITIES.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Value (gp)</label>
          <input
            type="number"
            className="form-input"
            value={form.valueGp}
            min="0"
            onChange={e => set('valueGp', e.target.value)}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label className="form-label">Assigned To</label>
          <select
            className="form-select"
            value={form.assignedTo}
            onChange={e => set('assignedTo', e.target.value)}
          >
            <option>Party</option>
            {characters.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Session Found</label>
          <select
            className="form-select"
            value={form.sessionId}
            onChange={e => set('sessionId', e.target.value)}
          >
            <option value="">— None —</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Notes</label>
        <textarea
          className="form-textarea"
          placeholder="Where it was found, special properties, history..."
          value={form.notes}
          onChange={e => set('notes', e.target.value)}
        />
      </div>

      <div className="form-row" style={{ alignItems: 'center', gap: '1rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink-light)' }}>
          <input
            type="checkbox"
            checked={form.attuned}
            onChange={e => set('attuned', e.target.checked)}
          />
          Attuned
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--ink-light)' }}>
          <input
            type="checkbox"
            checked={form.mystery}
            onChange={e => set('mystery', e.target.checked)}
          />
          Mystery item (hidden identity)
        </label>
      </div>

      {form.mystery && (
        <div className="form-group" style={{ marginTop: '0.4rem' }}>
          <label className="form-label">True Name (DM only)</label>
          <input
            type="text"
            className="form-input"
            placeholder="The real item name..."
            value={form.trueName}
            onChange={e => set('trueName', e.target.value)}
          />
        </div>
      )}
    </Modal>
  )
}
