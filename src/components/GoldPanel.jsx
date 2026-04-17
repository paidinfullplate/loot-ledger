import { useState } from 'react'

const DENOMINATIONS = [
  { key: 'platinum', label: 'Platinum', abbr: 'pp', color: '#8ab4c8' },
  { key: 'gold',     label: 'Gold',     abbr: 'gp', color: 'var(--violet)' },
  { key: 'silver',   label: 'Silver',   abbr: 'sp', color: '#8a8a8a' },
  { key: 'copper',   label: 'Copper',   abbr: 'cp', color: '#a0623a' },
]

function DenominationRow({ denomination, value, onAdjust }) {
  const [input, setInput] = useState('')

  function adjust(sign) {
    const val = parseFloat(input) || 0
    if (val <= 0) return
    onAdjust(sign * val)
    setInput('')
  }

  return (
    <div className="currency-row">
      <div className="currency-info">
        <span className="currency-label">{denomination.label}</span>
        <span className="currency-amount" style={{ color: denomination.color }}>
          {(value || 0).toLocaleString()}
          <span className="currency-abbr">{denomination.abbr}</span>
        </span>
      </div>
      <div className="currency-controls">
        <input
          type="number"
          className="form-input currency-input"
          placeholder="0"
          min="0"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') adjust(1) }}
        />
        <button className="btn btn-gold btn-sm" onClick={() => adjust(1)}>+</button>
        <button className="btn btn-ghost btn-sm" onClick={() => adjust(-1)}>−</button>
      </div>
    </div>
  )
}

export default function GoldPanel({
  currency, characters, gems,
  onAdjustCurrency, onAddGem, onDeleteGem, onAssignGem, onApplyPartySplit,
}) {
  const [splitResult, setSplitResult] = useState(null)
  const [showAddGem, setShowAddGem] = useState(false)
  const [gemName, setGemName] = useState('')
  const [gemValue, setGemValue] = useState('')

  const c = currency || { gold: 0, platinum: 0, silver: 0, copper: 0 }

  // ── Split calculation ────────────────────────────────────────────────────────
  function calculateSplit() {
    if (!characters.length) { setSplitResult([]); return }
    const n = characters.length
    const shares = {}
    const remainders = {}
    DENOMINATIONS.forEach(({ key }) => {
      const total = Math.floor(c[key] || 0)
      shares[key]     = Math.floor(total / n)
      remainders[key] = total % n
    })
    setSplitResult({ characters, shares, remainders, n })
  }

  function applyTheSplit() {
    if (!splitResult || !splitResult.characters?.length) return
    const { shares, remainders } = splitResult

    const newPartyCurrency = {
      platinum: remainders.platinum,
      gold:     remainders.gold,
      silver:   remainders.silver,
      copper:   remainders.copper,
    }

    const characterUpdates = splitResult.characters.map(char => ({
      id: char.id,
      currency: {
        platinum: (char.platinum || 0) + shares.platinum,
        gold:     (char.gold     || 0) + shares.gold,
        silver:   (char.silver   || 0) + shares.silver,
        copper:   (char.copper   || 0) + shares.copper,
      },
    }))

    onApplyPartySplit(newPartyCurrency, characterUpdates)
    setSplitResult(null)
  }

  // ── Add gem ──────────────────────────────────────────────────────────────────
  function submitAddGem() {
    const name = gemName.trim()
    const value = parseFloat(gemValue)
    if (!name || !value || value <= 0) return
    onAddGem({ name, valueGp: value, assignedTo: null, sessionId: null })
    setGemName('')
    setGemValue('')
    setShowAddGem(false)
  }

  const hasAnyCoins = DENOMINATIONS.some(({ key }) => (c[key] || 0) > 0)
  const partyGems = (gems || []).filter(g => !g.assignedTo)
  const assignedGems = (gems || []).filter(g => g.assignedTo)

  return (
    <>
      {/* Party Treasury */}
      <div className="sidebar-panel">
        <div className="panel-header">Party Treasury</div>
        <div className="panel-body" style={{ padding: '0.75rem 1rem' }}>
          {DENOMINATIONS.map(d => (
            <DenominationRow
              key={d.key}
              denomination={d}
              value={c[d.key]}
              onAdjust={delta => onAdjustCurrency(d.key, delta)}
            />
          ))}
        </div>
      </div>

      {/* Gems */}
      <div className="sidebar-panel">
        <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Gems</span>
          <button
            className="btn btn-sm btn-outline"
            style={{ padding: '0.1rem 0.5rem', fontSize: '0.6rem' }}
            onClick={() => setShowAddGem(v => !v)}
          >
            {showAddGem ? 'Cancel' : '+ Add'}
          </button>
        </div>
        <div className="panel-body">
          {showAddGem && (
            <div className="add-gem-form">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Name (e.g. Diamond)"
                  value={gemName}
                  onChange={e => setGemName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAddGem() }}
                  autoFocus
                />
                <input
                  type="number"
                  className="form-input"
                  placeholder="Value in gp (e.g. 300)"
                  value={gemValue}
                  onChange={e => setGemValue(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAddGem() }}
                  min="0"
                />
              </div>
              <button className="btn btn-gold btn-sm" style={{ width: '100%' }} onClick={submitAddGem}>
                Add Gem
              </button>
            </div>
          )}

          {(gems || []).length === 0 && !showAddGem && (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
              No gems tracked yet.
            </p>
          )}

          {/* Party pool gems */}
          {partyGems.length > 0 && (
            <>
              {assignedGems.length > 0 && (
                <div className="gem-section-label">Party Pool</div>
              )}
              {partyGems.map(gem => (
                <GemRow
                  key={gem.id}
                  gem={gem}
                  characters={characters}
                  onAssign={onAssignGem}
                  onDelete={onDeleteGem}
                />
              ))}
            </>
          )}

          {/* Assigned gems */}
          {assignedGems.length > 0 && (
            <>
              <div className="gem-section-label" style={{ marginTop: partyGems.length ? '0.5rem' : 0 }}>
                Assigned
              </div>
              {assignedGems.map(gem => (
                <GemRow
                  key={gem.id}
                  gem={gem}
                  characters={characters}
                  onAssign={onAssignGem}
                  onDelete={onDeleteGem}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Split Evenly */}
      <div className="sidebar-panel">
        <div className="panel-header">Split Evenly</div>
        <div className="panel-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--text-faint)', fontStyle: 'italic', marginBottom: '0.6rem' }}>
            Divide the party treasury among all characters.
          </p>
          <button
            className="btn btn-outline btn-sm"
            style={{ width: '100%', marginBottom: '0.75rem' }}
            onClick={calculateSplit}
          >
            Calculate Split
          </button>

          {splitResult !== null && (
            splitResult.length === 0 ? (
              <p style={{ fontSize: '0.82rem', color: 'var(--text-faint)', fontStyle: 'italic' }}>
                No characters in this campaign.
              </p>
            ) : (
              <div className="split-result">
                <div className="split-row" style={{
                  fontWeight: 600,
                  borderBottom: '1px solid var(--border-strong)',
                  marginBottom: '0.25rem',
                  paddingBottom: '0.25rem',
                }}>
                  <span className="split-name" style={{
                    color: 'var(--text-faint)', fontSize: '0.7rem',
                    textTransform: 'uppercase', letterSpacing: '0.08em',
                  }}>
                    Each of {splitResult.n} gets
                  </span>
                </div>

                {DENOMINATIONS.map(({ key, abbr }) => (
                  splitResult.shares[key] > 0 || splitResult.remainders[key] > 0 ? (
                    <div key={key} className="split-row">
                      <span className="split-name" style={{ textTransform: 'capitalize' }}>{key}</span>
                      <span className="split-amount">
                        {splitResult.shares[key].toLocaleString()} <span style={{ fontSize: '0.75rem', color: 'var(--text-faint)' }}>{abbr}</span>
                      </span>
                    </div>
                  ) : null
                ))}

                {DENOMINATIONS.some(({ key }) => splitResult.remainders[key] > 0) && (
                  <div style={{
                    marginTop: '0.5rem', paddingTop: '0.5rem',
                    borderTop: '1px solid var(--border)',
                    fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic',
                  }}>
                    Remainder:{' '}
                    {DENOMINATIONS
                      .filter(({ key }) => splitResult.remainders[key] > 0)
                      .map(({ key, abbr }) => `${splitResult.remainders[key]} ${abbr}`)
                      .join(', ')}
                  </div>
                )}

                {!hasAnyCoins ? (
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    Treasury is empty — nothing to apply.
                  </p>
                ) : (
                  <button
                    className="btn btn-gold btn-sm"
                    style={{ width: '100%', marginTop: '0.75rem' }}
                    onClick={applyTheSplit}
                  >
                    Apply Split to Characters
                  </button>
                )}

                {partyGems.length > 0 && (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                    {partyGems.length} gem{partyGems.length !== 1 ? 's' : ''} in party pool — assign manually above.
                  </p>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}

function GemRow({ gem, characters, onAssign, onDelete }) {
  return (
    <div className="gem-row">
      <div className="gem-info">
        <span className="gem-name">💎 {gem.name}</span>
        <span className="gem-value">{gem.valueGp.toLocaleString()} gp</span>
      </div>
      <div className="gem-actions">
        <select
          className="gem-assign-select"
          value={gem.assignedTo || ''}
          onChange={e => onAssign(gem.id, e.target.value || null)}
        >
          <option value="">Party pool</option>
          {characters.map(c => (
            <option key={c.id} value={c.name}>{c.name}</option>
          ))}
        </select>
        <button className="btn btn-ghost btn-sm" onClick={() => onDelete(gem.id)} title="Remove gem">×</button>
      </div>
    </div>
  )
}
