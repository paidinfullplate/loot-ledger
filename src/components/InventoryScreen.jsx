import { useState } from 'react'
import GoldPanel from './GoldPanel'
import FilterPanel from './FilterPanel'
import ApiKeyPanel from './ApiKeyPanel'
import ItemCard from './ItemCard'
import CharacterWallets from './CharacterWallets'

export default function InventoryScreen({
  campaign,
  apiKey,
  onAdjustCurrency,
  onApplyPartySplit,
  onAdjustCharacterCurrency,
  onAddGem,
  onDeleteGem,
  onAssignGem,
  onDeleteItem,
  onRevealItem,
  onSetFlavorText,
  onSaveApiKey,
  onOpenItemModal,
  onOpenSessionModal,
  onOpenSettings,
}) {
  const [filters, setFilters] = useState({ search: '', owner: '', rarity: '', session: '' })

  function handleFilterChange(key, value) {
    setFilters(prev => ({ ...prev, [key]: value }))
  }

  const items = campaign.items || []
  const sessions = campaign.sessions || []

  const totalValue = items.reduce((s, i) => s + (parseFloat(i.valueGp) || 0) * (parseInt(i.quantity) || 1), 0)
  const legendary = items.filter(i => i.rarity === 'Legendary' || i.rarity === 'Artifact').length

  const filtered = items.filter(item => {
    if (filters.search && !item.name.toLowerCase().includes(filters.search.toLowerCase())) return false
    if (filters.owner && item.assignedTo !== filters.owner) return false
    if (filters.rarity && item.rarity !== filters.rarity) return false
    if (filters.session && item.sessionId !== filters.session) return false
    return true
  })

  return (
    <div>
      {/* Inventory Header */}
      <div className="inv-header">
        <div className="inv-header-top">
          <div>
            <div className="inv-campaign-name">{campaign.name}</div>
            {campaign.setting && (
              <div className="inv-campaign-setting">{campaign.setting}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-gold btn-sm" onClick={onOpenItemModal}>+ Add Item</button>
            <button className="btn btn-outline btn-sm" onClick={onOpenSessionModal}>+ Session</button>
            <button className="btn btn-outline btn-sm" onClick={onOpenSettings}>Settings</button>
          </div>
        </div>

        <div className="inv-stats-bar">
          <div className="inv-stat">
            <span className="inv-stat-label">Gold</span>
            <span className="inv-stat-value gold">{((campaign.currency || {}).gold || 0).toLocaleString()} gp</span>
          </div>
          {((campaign.currency || {}).platinum || 0) > 0 && (
            <div className="inv-stat">
              <span className="inv-stat-label">Platinum</span>
              <span className="inv-stat-value" style={{ color: '#8ab4c8' }}>{(campaign.currency.platinum || 0).toLocaleString()} pp</span>
            </div>
          )}
          {(campaign.gems || []).filter(g => !g.assignedTo).length > 0 && (
            <div className="inv-stat">
              <span className="inv-stat-label">Gems</span>
              <span className="inv-stat-value">{campaign.gems.filter(g => !g.assignedTo).length} 💎</span>
            </div>
          )}
          <div className="inv-stat">
            <span className="inv-stat-label">Items</span>
            <span className="inv-stat-value">{items.length}</span>
          </div>
          <div className="inv-stat">
            <span className="inv-stat-label">Item Value</span>
            <span className="inv-stat-value">{totalValue.toLocaleString()} gp</span>
          </div>
          <div className="inv-stat">
            <span className="inv-stat-label">Legendary+</span>
            <span className="inv-stat-value">{legendary}</span>
          </div>
          <div className="inv-stat">
            <span className="inv-stat-label">Sessions</span>
            <span className="inv-stat-value">{sessions.length}</span>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="inv-body">
        <aside className="sidebar">
          <GoldPanel
            currency={campaign.currency}
            characters={campaign.characters || []}
            gems={campaign.gems || []}
            onAdjustCurrency={onAdjustCurrency}
            onAddGem={onAddGem}
            onDeleteGem={onDeleteGem}
            onAssignGem={onAssignGem}
            onApplyPartySplit={onApplyPartySplit}
          />
          <CharacterWallets
            characters={campaign.characters || []}
            items={campaign.items || []}
            gems={campaign.gems || []}
            onAdjustCharacterCurrency={onAdjustCharacterCurrency}
          />
          <FilterPanel
            characters={campaign.characters || []}
            sessions={sessions}
            filters={filters}
            onFilterChange={handleFilterChange}
          />
          <ApiKeyPanel apiKey={apiKey} onSaveApiKey={onSaveApiKey} />
        </aside>

        <main>
          <div className="item-list-header">
            <span className="item-list-title">
              {filtered.length} of {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">⚔</div>
              <div className="empty-title">
                {items.length ? 'No items match your filters' : 'The ledger is empty'}
              </div>
              <p style={{ fontSize: '0.9rem', color: 'var(--ink-faint)', fontStyle: 'italic' }}>
                {items.length
                  ? 'Try clearing your filters.'
                  : 'Add your first piece of treasure to begin.'}
              </p>
            </div>
          ) : (
            <div className="item-cards">
              {filtered.map(item => (
                <ItemCard
                  key={item.id}
                  item={item}
                  sessions={sessions}
                  apiKey={apiKey}
                  campaignSetting={campaign.setting}
                  onDelete={onDeleteItem}
                  onReveal={onRevealItem}
                  onSetFlavorText={onSetFlavorText}
                />
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
