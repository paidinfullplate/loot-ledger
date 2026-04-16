import { useState } from 'react'

export default function ApiKeyPanel({ apiKey, onSaveApiKey }) {
  const [input, setInput] = useState(apiKey)
  const [status, setStatus] = useState(apiKey ? 'API key saved.' : '')

  function handleSave() {
    const key = input.trim()
    onSaveApiKey(key)
    setStatus(key ? 'API key saved.' : 'Key cleared.')
  }

  return (
    <div className="sidebar-panel">
      <div className="panel-header">Claude API (Flavor Text)</div>
      <div className="panel-body">
        <p style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: '0.6rem' }}>
          Add your Anthropic API key to generate item descriptions. Stored only in your browser.
        </p>
        <input
          type="password"
          className="form-input"
          placeholder="sk-ant-..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: '100%', fontSize: '0.85rem' }}
        />
        <button
          className="btn btn-outline btn-sm"
          style={{ marginTop: '0.5rem', width: '100%' }}
          onClick={handleSave}
        >
          Save Key
        </button>
        {status && (
          <div style={{ fontSize: '0.78rem', color: 'var(--teal-light)', marginTop: '0.4rem', fontStyle: 'italic' }}>
            {status}
          </div>
        )}
      </div>
    </div>
  )
}
