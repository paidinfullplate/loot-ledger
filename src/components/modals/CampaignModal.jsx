import { useState } from 'react'
import Modal from './Modal'

export default function CampaignModal({ isOpen, onClose, onSave }) {
  const [name, setName] = useState('')
  const [setting, setSetting] = useState('')
  const [charInput, setCharInput] = useState('')
  const [characters, setCharacters] = useState([])

  function handleOpen() {
    setName('')
    setSetting('')
    setCharInput('')
    setCharacters([])
  }

  function addChar() {
    const trimmed = charInput.trim()
    if (!trimmed || characters.includes(trimmed)) return
    setCharacters(prev => [...prev, trimmed])
    setCharInput('')
  }

  function removeChar(name) {
    setCharacters(prev => prev.filter(c => c !== name))
  }

  function handleSave() {
    if (!name.trim()) { alert('Please enter a campaign name.'); return }
    onSave({ name: name.trim(), setting: setting.trim(), characters })
    setName('')
    setSetting('')
    setCharacters([])
  }

  function handleClose() {
    setName('')
    setSetting('')
    setCharInput('')
    setCharacters([])
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="New Campaign"
      footer={
        <>
          <button className="btn btn-ghost" onClick={handleClose}>Cancel</button>
          <button className="btn btn-gold" onClick={handleSave}>Save Campaign</button>
        </>
      }
    >
      <div className="form-group">
        <label className="form-label">Campaign Name</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Curse of Strahd"
          value={name}
          onChange={e => setName(e.target.value)}
          autoFocus
        />
      </div>

      <div className="form-group">
        <label className="form-label">Setting / Tone</label>
        <input
          type="text"
          className="form-input"
          placeholder="e.g. Gothic horror, Barovia"
          value={setting}
          onChange={e => setSetting(e.target.value)}
        />
        <span style={{ fontSize: '0.78rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
          Used to flavor AI-generated item descriptions.
        </span>
      </div>

      <div className="form-group">
        <label className="form-label">Characters</label>
        <div className="char-add-row">
          <input
            type="text"
            className="form-input"
            placeholder="Character name"
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
    </Modal>
  )
}
