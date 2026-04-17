import { useState } from 'react'

const DENOMS = [
  { key: 'platinum', label: 'PP', color: '#8ab4c8' },
  { key: 'gold',     label: 'GP', color: 'var(--violet)' },
  { key: 'silver',   label: 'SP', color: '#8a8a8a' },
  { key: 'copper',   label: 'CP', color: '#a0623a' },
]

function gpEquivalent(char, gems) {
  const coins = (char.gold || 0)
    + (char.platinum || 0) * 10
    + (char.silver   || 0) * 0.1
    + (char.copper   || 0) * 0.01
  const gemValue = gems.reduce((s, g) => s + g.valueGp, 0)
  return coins + gemValue
}

function CurrencyAdjustRow({ denom, value, onAdjust }) {
  const [input, setInput] = useState('')

  function adjust(sign) {
    const val = parseFloat(input) || 0
    if (val <= 0) return
    onAdjust(sign * val)
    setInput('')
  }

  return (
    <div className="char-currency-row">
      <span className="char-currency-label" style={{ color: denom.color }}>{denom.label}</span>
      <span className="char-currency-value" style={{ color: denom.color }}>
        {(value || 0).toLocaleString()}
      </span>
      <div className="char-currency-controls">
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

export default function CharacterWallets({ characters, items, gems, onAdjustCharacterCurrency }) {
  const [expanded, setExpanded] = useState(null)

  if (!characters || characters.length === 0) return null

  return (
    <div className="sidebar-panel">
      <div className="panel-header">Characters</div>
      <div style={{ padding: 0 }}>
        {characters.map(char => {
          const charGems  = (gems  || []).filter(g => g.assignedTo === char.name)
          const charItems = (items || []).filter(i => i.assignedTo === char.name)
          const totalGp   = gpEquivalent(char, charGems)
          const isOpen    = expanded === char.id

          return (
            <div key={char.id} className="char-wallet">
              <div
                className="char-wallet-header"
                onClick={() => setExpanded(isOpen ? null : char.id)}
              >
                <span className="char-wallet-name">{char.name}</span>
                <span className="char-wallet-meta">
                  <span style={{ color: 'var(--violet)', fontWeight: 600, fontSize: '0.85rem' }}>
                    {Math.floor(totalGp).toLocaleString()} gp
                  </span>
                  {(charItems.length > 0 || charGems.length > 0) && (
                    <span style={{ color: 'var(--text-faint)', fontSize: '0.72rem' }}>
                      {[
                        charItems.length > 0 && `${charItems.length} item${charItems.length !== 1 ? 's' : ''}`,
                        charGems.length  > 0 && `${charGems.length} gem${charGems.length !== 1 ? 's' : ''}`,
                      ].filter(Boolean).join(', ')}
                    </span>
                  )}
                </span>
                <span className="char-wallet-toggle">{isOpen ? '▴' : '▾'}</span>
              </div>

              {isOpen && (
                <div className="char-wallet-body">
                  {/* Currency */}
                  {DENOMS.map(d => (
                    <CurrencyAdjustRow
                      key={d.key}
                      denom={d}
                      value={char[d.key] || 0}
                      onAdjust={delta => onAdjustCharacterCurrency(char.id, d.key, delta)}
                    />
                  ))}

                  {/* Gems */}
                  {charGems.length > 0 && (
                    <div className="char-wallet-section">
                      <div className="char-wallet-section-label">Gems</div>
                      {charGems.map(g => (
                        <div key={g.id} className="char-wallet-gem">
                          <span>💎 {g.name}</span>
                          <span style={{ color: 'var(--violet)', fontWeight: 600 }}>
                            {g.valueGp.toLocaleString()} gp
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Items */}
                  {charItems.length > 0 && (
                    <div className="char-wallet-section">
                      <div className="char-wallet-section-label">Items</div>
                      {charItems.map(item => (
                        <div key={item.id} className="char-wallet-item">
                          <span className="char-wallet-item-name">{item.name}</span>
                          {item.rarity && (
                            <span className={`rarity-badge rarity-${item.rarity.toLowerCase().replace(' ', '-')}`}>
                              {item.rarity}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {charItems.length === 0 && charGems.length === 0 && (
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-faint)', fontStyle: 'italic', marginTop: '0.5rem' }}>
                      No items or gems yet.
                    </p>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
