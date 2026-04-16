export default function CampaignCard({ campaign, onOpen }) {
  const c = campaign.currency || {}
  const totalGp = (c.gold || 0) + (c.platinum || 0) * 10 + (c.silver || 0) * 0.1 + (c.copper || 0) * 0.01
  const itemCount = (campaign.items || []).length
  const sessions = campaign.sessions || []
  const lastSession = sessions[sessions.length - 1]

  return (
    <div className="campaign-card" onClick={onOpen}>
      <div className="campaign-card-name">{campaign.name}</div>
      <div className="campaign-card-setting">
        {campaign.setting || 'No setting defined'}
      </div>

      <div className="campaign-card-stats">
        <div className="stat-chip">
          <span className="stat-chip-label">Characters</span>
          <span className="stat-chip-value">{(campaign.characters || []).length}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-label">Items</span>
          <span className="stat-chip-value">{itemCount}</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-label">Wealth (gp eq.)</span>
          <span className="stat-chip-value gold-value">{Math.floor(totalGp).toLocaleString()} gp</span>
        </div>
        <div className="stat-chip">
          <span className="stat-chip-label">Sessions</span>
          <span className="stat-chip-value">{sessions.length}</span>
        </div>
      </div>

      <div className="campaign-card-footer">
        <span>{lastSession ? `Last: ${lastSession.date}` : 'No sessions yet'}</span>
        <button
          className="btn btn-gold btn-sm"
          onClick={e => { e.stopPropagation(); onOpen() }}
        >
          Open
        </button>
      </div>
    </div>
  )
}
