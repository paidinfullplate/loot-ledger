import CampaignCard from './CampaignCard'

export default function CampaignList({ campaigns, onOpenCampaign, onNewCampaign }) {
  return (
    <div>
      <div className="screen-header">
        <h1 className="screen-title">Your Campaigns</h1>
        <p className="screen-subtitle">
          Select a campaign to manage its treasury, or begin a new adventure.
        </p>
      </div>

      <div className="campaign-grid">
        {campaigns.map(camp => (
          <CampaignCard
            key={camp.id}
            campaign={camp}
            onOpen={() => onOpenCampaign(camp.id)}
          />
        ))}

        <div className="new-campaign-card" onClick={onNewCampaign}>
          <div className="new-campaign-plus">+</div>
          <div className="new-campaign-label">New Campaign</div>
        </div>
      </div>
    </div>
  )
}
