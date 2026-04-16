export default function Header({ inInventory, onBack }) {
  return (
    <header className="app-header">
      <div className="app-title">
        Loot Ledger <span>Treasure Tracker</span>
      </div>
      <nav className="header-nav">
        {inInventory && (
          <button className="btn btn-outline btn-sm" onClick={onBack}>
            ← All Campaigns
          </button>
        )}
      </nav>
    </header>
  )
}
