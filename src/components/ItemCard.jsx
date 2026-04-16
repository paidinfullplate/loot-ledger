import { useState } from 'react'

const RARITY_CLASS = {
  'Common': 'rarity-common',
  'Uncommon': 'rarity-uncommon',
  'Rare': 'rarity-rare',
  'Very Rare': 'rarity-very-rare',
  'Legendary': 'rarity-legendary',
  'Artifact': 'rarity-artifact',
}

export default function ItemCard({ item, sessions, apiKey, campaignSetting, onDelete, onReveal, onSetFlavorText }) {
  const [generating, setGenerating] = useState(false)

  const session = sessions.find(s => s.id === item.sessionId)
  const rarityClass = RARITY_CLASS[item.rarity] || 'rarity-common'
  const displayName = item.mystery && !item.revealed ? '??? (Mystery Item)' : item.name

  async function generateFlavor() {
    if (!apiKey) {
      alert('Please save your Anthropic API key in the sidebar first.')
      return
    }
    setGenerating(true)

    const prompt = `Item: ${item.name}\nRarity: ${item.rarity}\nCampaign setting: ${campaignSetting || 'generic fantasy'}\n\nWrite a 2-3 sentence in-world description for this item as it might appear in an ancient tome — evocative, slightly mysterious, no game mechanics. Respond with only the description.`

    try {
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: 'claude-opus-4-5',
          max_tokens: 200,
          system: 'You are a chronicler in a high fantasy world. When given a magic item, write a 2-3 sentence description in the style of an ancient tome — evocative, slightly mysterious, no game mechanics. Respond with only the description, no preamble.',
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      const data = await resp.json()
      if (data.content?.[0]?.text) {
        onSetFlavorText(item.id, data.content[0].text.trim())
      } else {
        alert('Could not generate text. Check your API key.')
      }
    } catch (e) {
      alert('API error: ' + e.message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="item-card">
      <div className="item-card-top">
        <span className="item-name">{displayName}</span>
        <span className="item-value">{(parseFloat(item.valueGp) || 0).toLocaleString()} gp</span>
      </div>

      <div className="item-meta">
        <span className={`rarity-badge ${rarityClass}`}>{item.rarity}</span>
        {item.quantity > 1 && <span className="qty-badge">x{item.quantity}</span>}
        <span className="owner-tag">{item.assignedTo || 'Party'}</span>
        {item.attuned && <span className="attuned-tag">Attuned</span>}
        {item.mystery && (
          <span className="mystery-tag">{item.revealed ? 'Identified' : 'Unidentified'}</span>
        )}
        {session && <span className="session-tag">· {session.name}</span>}
      </div>

      {item.notes && <div className="item-notes">{item.notes}</div>}
      {item.flavorText && <div className="item-flavor">{item.flavorText}</div>}

      <div className="item-actions">
        {!item.flavorText && (
          <button
            className="btn-flavor"
            onClick={generateFlavor}
            disabled={generating}
            title="Generate description with Claude AI"
          >
            {generating ? 'Conjuring…' : 'Generate Flavor Text'}
          </button>
        )}
        {item.mystery && !item.revealed && (
          <button className="btn btn-outline btn-sm" onClick={() => onReveal(item.id)}>
            Reveal Identity
          </button>
        )}
        <button className="btn btn-ghost btn-sm" onClick={() => onDelete(item.id)}>
          Remove
        </button>
      </div>
    </div>
  )
}
