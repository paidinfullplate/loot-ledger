const RARITIES = ['Common', 'Uncommon', 'Rare', 'Very Rare', 'Legendary', 'Artifact']

export default function FilterPanel({ characters, sessions, filters, onFilterChange }) {
  return (
    <div className="sidebar-panel">
      <div className="panel-header">Filter Items</div>
      <div className="panel-body">
        <div className="filter-group">
          <label className="filter-label">Search</label>
          <input
            type="text"
            placeholder="Item name..."
            value={filters.search}
            onChange={e => onFilterChange('search', e.target.value)}
          />

          <label className="filter-label" style={{ marginTop: '0.4rem' }}>Owner</label>
          <select
            value={filters.owner}
            onChange={e => onFilterChange('owner', e.target.value)}
          >
            <option value="">All owners</option>
            <option>Party</option>
            {characters.map(c => <option key={c}>{c}</option>)}
          </select>

          <label className="filter-label" style={{ marginTop: '0.4rem' }}>Rarity</label>
          <select
            value={filters.rarity}
            onChange={e => onFilterChange('rarity', e.target.value)}
          >
            <option value="">All rarities</option>
            {RARITIES.map(r => <option key={r}>{r}</option>)}
          </select>

          <label className="filter-label" style={{ marginTop: '0.4rem' }}>Session</label>
          <select
            value={filters.session}
            onChange={e => onFilterChange('session', e.target.value)}
          >
            <option value="">All sessions</option>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  )
}
