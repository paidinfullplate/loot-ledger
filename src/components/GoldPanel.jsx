import { useState } from 'react'

export default function GoldPanel({ partyGold, characters, onAdjustGold }) {
  const [goldInput, setGoldInput] = useState('')
  const [splitResult, setSplitResult] = useState(null)

  function handleAdjust(sign) {
    const val = parseFloat(goldInput) || 0
    onAdjustGold(sign * val)
    setGoldInput('')
  }

  function calculateSplit() {
    if (!characters.length) {
      setSplitResult([])
      return
    }
    const gold = partyGold || 0
    const share = Math.floor(gold / characters.length)
    const remainder = gold % characters.length
    setSplitResult(
      characters.map((name, i) => ({ name, amount: share + (i < remainder ? 1 : 0) }))
    )
  }

  return (
    <>
      {/* Gold Tracker */}
      <div className="sidebar-panel">
        <div className="panel-header">Party Gold</div>
        <div className="panel-body">
          <div className="gold-display">
            <div className="gold-amount">{(partyGold || 0).toLocaleString()}</div>
            <div className="gold-amount-unit">gold pieces</div>
          </div>
          <div className="gold-adjust">
            <input
              type="number"
              className="form-input"
              placeholder="Amount"
              min="0"
              value={goldInput}
              onChange={e => setGoldInput(e.target.value)}
              style={{ padding: '0.4rem 0.6rem', fontSize: '0.95rem' }}
            />
            <button className="btn btn-gold btn-sm" onClick={() => handleAdjust(1)}>Add</button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleAdjust(-1)}>Sub</button>
          </div>
        </div>
      </div>

      {/* Gold Split */}
      <div className="sidebar-panel">
        <div className="panel-header">Gold Split</div>
        <div className="panel-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: '0.6rem' }}>
            Split party gold evenly among active characters.
          </p>
          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', marginBottom: '0.6rem' }}
            onClick={calculateSplit}
          >
            Calculate Split
          </button>

          {splitResult !== null && (
            splitResult.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                No characters in this campaign.
              </p>
            ) : (
              <div className="split-result">
                {splitResult.map(({ name, amount }) => (
                  <div key={name} className="split-row">
                    <span className="split-name">{name}</span>
                    <span className="split-amount">{amount} gp</span>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
