import { useState, useEffect } from 'react'
import Modal from './Modal'

export default function SettingsModal({ isOpen, onClose, onSave, onDelete, campaign }) {
  const [name, setName] = useState('')
  const [setting, setSetting] = useState('')
  const [charInput, setCharInput] = useState('')
  const [characters, setCharacters] = useState([])

  useEffect(() => {
    if (isOpen && campaign) {
      setName(campaign.name || '')
      setSetting(campaign.setting || '')
      setCharacters([...(campaign.characters || [])])
      setCharInput('')
    }
  }, [isOpen, campaign])

  function addChar() {
    const trimmed = charInput.trim()
    if (!trimmed || characters.includes(trimmed)) return
    setCharacters(prev => [...prev, trimmed])
    setCharInput('')
  }

  function removeChar(c) {
    setCharacters(prev => prev.filter(x => x !== c))
  }

  function handleSave() {
    if (!name.trim()) { alert('Campaign name required.'); return }
    onSave({ name: name.trim(), setting: setting.trim(), characters })
  }

  function handleDelete() {
    if (!confirm(`Delete "${campaign?.name}" and all its data? This cannot be undone.`)) return
    onDelete()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Campaign Settings"
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-gold" onClick={handleSave}>Save Changes</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Campaign Name</label>
        <input
          type="text"
          className="form-input"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Setting / Tone</label>
        <input
          type="text"
          className="form-input"
          value={setting}
          onChange={e => setSetting(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label className="form-label">Characters</label>
        <div className="char-add-row">
          <input
            type="text"
            className="form-input"
            placeholder="Add character"
            value={charInput}
            onChange={e => setCharInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addChar() } }}
          />
          <button type="button" className="btn btn-gold btn-sm" onClick={addChar}>Add</button>
        </div>
        <div className="character-tag-list">
          {characters.map(c => (
            <div key={c} className="character-tag">
              {c}
              <button onClick={() => removeChar(c)} title="Remove">×</button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
        <button className="btn btn-danger btn-sm" onClick={handleDelete}>
          Delete Campaign
        </button>
      </div>
    </Modal>
  )
}
