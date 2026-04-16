import { useState } from 'react'

const DENOMINATIONS = [
  { key: 'platinum', label: 'Platinum', abbr: 'pp', color: '#8ab4c8' },
  { key: 'gold',     label: 'Gold',     abbr: 'gp', color: 'var(--gold-dim)' },
  { key: 'silver',   label: 'Silver',   abbr: 'sp', color: '#8a8a8a' },
  { key: 'copper',   label: 'Copper',   abbr: 'cp', color: '#a0623a' },
  { key: 'gems',     label: 'Gems',     abbr: '💎', color: 'var(--crimson-light)', isCount: true },
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

export default function GoldPanel({ currency, characters, onAdjustCurrency }) {
  const [splitResult, setSplitResult] = useState(null)

  const c = currency || { gold: 0, platinum: 0, silver: 0, copper: 0, gems: 0 }

  function calculateSplit() {
    if (!characters.length) { setSplitResult([]); return }
    const n = characters.length

    // Split each coin denomination; track remainders.
    const coinKeys = ['platinum', 'gold', 'silver', 'copper']
    const shares = {}
    const remainders = {}
    coinKeys.forEach(k => {
      const total = Math.floor(c[k] || 0)
      shares[k]     = Math.floor(total / n)
      remainders[k] = total % n
    })

    // Gems don't split evenly — just report count and remainder.
    const totalGems  = Math.floor(c.gems || 0)
    const gemShare   = Math.floor(totalGems / n)
    const gemRemainder = totalGems % n

    setSplitResult({ characters, shares, remainders, gemShare, gemRemainder, n })
  }

  return (
    <>
      {/* Treasury */}
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

      {/* Split */}
      <div className="sidebar-panel">
        <div className="panel-header">Split Evenly</div>
        <div className="panel-body">
          <p style={{ fontSize: '0.85rem', color: 'var(--ink-faint)', fontStyle: 'italic', marginBottom: '0.6rem' }}>
            Divide the treasury evenly among active characters.
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
              <p style={{ fontSize: '0.82rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                No characters in this campaign.
              </p>
            ) : (
              <div className="split-result">
                <div className="split-row" style={{ fontWeight: 600, borderBottom: '1px solid var(--border-strong)', marginBottom: '0.25rem', paddingBottom: '0.25rem' }}>
                  <span className="split-name" style={{ color: 'var(--ink-faint)', fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', fontFamily: "'Cinzel', serif" }}>
                    Each of {splitResult.n} gets
                  </span>
                </div>
                {['platinum', 'gold', 'silver', 'copper'].map(k => (
                  splitResult.shares[k] > 0 || splitResult.remainders[k] > 0 ? (
                    <div key={k} className="split-row">
                      <span className="split-name" style={{ textTransform: 'capitalize' }}>{k}</span>
                      <span className="split-amount">
                        {splitResult.shares[k].toLocaleString()}
                        {' '}
                        <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>
                          {k === 'platinum' ? 'pp' : k === 'gold' ? 'gp' : k === 'silver' ? 'sp' : 'cp'}
                        </span>
                      </span>
                    </div>
                  ) : null
                ))}
                {splitResult.gemShare > 0 && (
                  <div className="split-row">
                    <span className="split-name">Gems</span>
                    <span className="split-amount">{splitResult.gemShare.toLocaleString()} 💎</span>
                  </div>
                )}
                {/* Remainders */}
                {(['platinum', 'gold', 'silver', 'copper'].some(k => splitResult.remainders[k] > 0) || splitResult.gemRemainder > 0) && (
                  <div style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.8rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                    Remainder: {
                      [
                        ...['platinum', 'gold', 'silver', 'copper']
                          .filter(k => splitResult.remainders[k] > 0)
                          .map(k => `${splitResult.remainders[k]} ${k === 'platinum' ? 'pp' : k === 'gold' ? 'gp' : k === 'silver' ? 'sp' : 'cp'}`),
                        splitResult.gemRemainder > 0 ? `${splitResult.gemRemainder} gem${splitResult.gemRemainder > 1 ? 's' : ''}` : null,
                      ].filter(Boolean).join(', ')
                    }
                  </div>
                )}
              </div>
            )
          )}
        </div>
      </div>
    </>
  )
}
