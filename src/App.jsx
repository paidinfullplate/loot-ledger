import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import { API_KEY_KEY } from './utils/storage'
import {
  getCampaigns, getCampaignById,
  createCampaign, updateCampaignMeta, deleteCampaign,
  createSession,
  createItem, updateItem, deleteItem,
  updateCurrency, updateCharacterCurrency, applyPartySplit,
  createGem, deleteGem, assignGem,
  rowToItem, rowToCurrency, rowToGem,
} from './utils/db'
import Header from './components/Header'
import CampaignList from './components/CampaignList'
import InventoryScreen from './components/InventoryScreen'
import CampaignModal from './components/modals/CampaignModal'
import ItemModal from './components/modals/ItemModal'
import SessionModal from './components/modals/SessionModal'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [campaignLoading, setCampaignLoading] = useState(false)
  const [openModal, setOpenModal] = useState(null)
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_KEY) || '')
  const [dbError, setDbError] = useState(null)

  // ── Initial load ─────────────────────────────────────────────────────────────
  useEffect(() => { loadCampaigns() }, [])

  async function loadCampaigns() {
    setCampaignsLoading(true)
    setDbError(null)
    try {
      setCampaigns(await getCampaigns())
    } catch (e) {
      console.error('loadCampaigns:', e)
      setDbError('Could not load campaigns. Check your Supabase connection.')
    } finally {
      setCampaignsLoading(false)
    }
  }

  // ── Realtime subscriptions ────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeCampaign) return
    const campaignId = activeCampaign.id

    const channel = supabase
      .channel(`loot:${campaignId}`)

      // Items
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'items',
        filter: `campaign_id=eq.${campaignId}`,
      }, ({ eventType, new: newRow, old: oldRow }) => {
        setActiveCampaign(prev => {
          if (!prev || prev.id !== campaignId) return prev
          if (eventType === 'INSERT')
            return { ...prev, items: [...prev.items.filter(i => i.id !== newRow.id), rowToItem(newRow)] }
          if (eventType === 'UPDATE')
            return { ...prev, items: prev.items.map(i => i.id === newRow.id ? rowToItem(newRow) : i) }
          if (eventType === 'DELETE')
            return { ...prev, items: prev.items.filter(i => i.id !== oldRow.id) }
          return prev
        })
        setCampaigns(prev => prev.map(c => {
          if (c.id !== campaignId) return c
          let items = [...c.items]
          if (eventType === 'INSERT') items = [...items.filter(i => i.id !== newRow.id), { id: newRow.id }]
          if (eventType === 'DELETE') items = items.filter(i => i.id !== oldRow.id)
          return { ...c, items }
        }))
      })

      // Party gold
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'party_gold',
        filter: `campaign_id=eq.${campaignId}`,
      }, ({ new: newRow }) => {
        if (!newRow) return
        const currency = rowToCurrency(newRow)
        setActiveCampaign(prev => prev?.id === campaignId ? { ...prev, currency } : prev)
        setCampaigns(prev => prev.map(c => c.id === campaignId ? { ...c, currency } : c))
      })

      // Gems
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'gems',
        filter: `campaign_id=eq.${campaignId}`,
      }, ({ eventType, new: newRow, old: oldRow }) => {
        setActiveCampaign(prev => {
          if (!prev || prev.id !== campaignId) return prev
          const gems = prev.gems || []
          if (eventType === 'INSERT')
            return { ...prev, gems: [...gems.filter(g => g.id !== newRow.id), rowToGem(newRow)] }
          if (eventType === 'UPDATE')
            return { ...prev, gems: gems.map(g => g.id === newRow.id ? rowToGem(newRow) : g) }
          if (eventType === 'DELETE')
            return { ...prev, gems: gems.filter(g => g.id !== oldRow.id) }
          return prev
        })
      })

      // Character currency (from other clients)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'characters',
        filter: `campaign_id=eq.${campaignId}`,
      }, ({ new: newRow }) => {
        setActiveCampaign(prev => {
          if (!prev) return prev
          return {
            ...prev,
            characters: prev.characters.map(c =>
              c.id === newRow.id
                ? { ...c,
                    gold:     parseFloat(newRow.gold)     || 0,
                    platinum: parseFloat(newRow.platinum) || 0,
                    silver:   parseFloat(newRow.silver)   || 0,
                    copper:   parseFloat(newRow.copper)   || 0 }
                : c
            ),
          }
        })
      })

      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeCampaign?.id])

  // ── Navigation ───────────────────────────────────────────────────────────────
  async function handleOpenCampaign(id) {
    setCampaignLoading(true)
    setDbError(null)
    try {
      setActiveCampaign(await getCampaignById(id))
    } catch (e) {
      console.error('handleOpenCampaign:', e)
      setDbError('Could not load campaign.')
    } finally {
      setCampaignLoading(false)
    }
  }

  function handleBack() { setActiveCampaign(null) }

  // ── Campaign CRUD ─────────────────────────────────────────────────────────────
  async function handleCreateCampaign({ name, setting, characters }) {
    try {
      const camp = await createCampaign({ name, setting, characters })
      setCampaigns(prev => [...prev, camp])
      setOpenModal(null)
    } catch (e) {
      console.error('handleCreateCampaign:', e)
      alert('Failed to create campaign.')
    }
  }

  async function handleSaveSettings({ name, setting, characters }) {
    try {
      await updateCampaignMeta(
        activeCampaign.id,
        { name, setting, characters },
        activeCampaign.characters,
      )
      // Reload to get fresh IDs for any newly added characters
      const refreshed = await getCampaignById(activeCampaign.id)
      setActiveCampaign(refreshed)
      setCampaigns(prev => prev.map(c =>
        c.id === activeCampaign.id ? { ...c, name, setting, characters: refreshed.characters } : c
      ))
      setOpenModal(null)
    } catch (e) {
      console.error('handleSaveSettings:', e)
      alert('Failed to save settings.')
    }
  }

  async function handleDeleteCampaign() {
    try {
      await deleteCampaign(activeCampaign.id)
      setCampaigns(prev => prev.filter(c => c.id !== activeCampaign.id))
      setActiveCampaign(null)
      setOpenModal(null)
    } catch (e) {
      console.error('handleDeleteCampaign:', e)
      alert('Failed to delete campaign.')
    }
  }

  // ── Party currency ────────────────────────────────────────────────────────────
  async function handleAdjustCurrency(denomination, delta) {
    const current = activeCampaign.currency
    const newCurrency = {
      ...current,
      [denomination]: Math.max(0, (current[denomination] || 0) + delta),
    }
    setActiveCampaign(prev => ({ ...prev, currency: newCurrency }))
    setCampaigns(prev => prev.map(c =>
      c.id === activeCampaign.id ? { ...c, currency: newCurrency } : c
    ))
    try {
      await updateCurrency(activeCampaign.id, newCurrency)
    } catch (e) {
      console.error('handleAdjustCurrency:', e)
    }
  }

  async function handleApplyPartySplit(newPartyCurrency, characterUpdates) {
    setActiveCampaign(prev => ({
      ...prev,
      currency: newPartyCurrency,
      characters: prev.characters.map(char => {
        const upd = characterUpdates.find(u => u.id === char.id)
        return upd ? { ...char, ...upd.currency } : char
      }),
    }))
    setCampaigns(prev => prev.map(c =>
      c.id === activeCampaign.id ? { ...c, currency: newPartyCurrency } : c
    ))
    try {
      await applyPartySplit(activeCampaign.id, newPartyCurrency, characterUpdates)
    } catch (e) {
      console.error('handleApplyPartySplit:', e)
    }
  }

  // ── Character currency ────────────────────────────────────────────────────────
  async function handleAdjustCharacterCurrency(characterId, denomination, delta) {
    const char = activeCampaign.characters.find(c => c.id === characterId)
    if (!char) return
    const newCurrency = {
      platinum: char.platinum || 0,
      gold:     char.gold     || 0,
      silver:   char.silver   || 0,
      copper:   char.copper   || 0,
      [denomination]: Math.max(0, (char[denomination] || 0) + delta),
    }
    setActiveCampaign(prev => ({
      ...prev,
      characters: prev.characters.map(c => c.id === characterId ? { ...c, ...newCurrency } : c),
    }))
    try {
      await updateCharacterCurrency(characterId, newCurrency)
    } catch (e) {
      console.error('handleAdjustCharacterCurrency:', e)
    }
  }

  // ── Gems ──────────────────────────────────────────────────────────────────────
  async function handleAddGem(gemData) {
    try {
      const gem = await createGem(activeCampaign.id, gemData)
      setActiveCampaign(prev => ({ ...prev, gems: [...(prev.gems || []), gem] }))
    } catch (e) {
      console.error('handleAddGem:', e)
      alert('Failed to add gem.')
    }
  }

  async function handleDeleteGem(gemId) {
    setActiveCampaign(prev => ({ ...prev, gems: prev.gems.filter(g => g.id !== gemId) }))
    try {
      await deleteGem(gemId)
    } catch (e) {
      console.error('handleDeleteGem:', e)
    }
  }

  async function handleAssignGem(gemId, assignedTo) {
    setActiveCampaign(prev => ({
      ...prev,
      gems: prev.gems.map(g => g.id === gemId ? { ...g, assignedTo: assignedTo || null } : g),
    }))
    try {
      await assignGem(gemId, assignedTo)
    } catch (e) {
      console.error('handleAssignGem:', e)
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────────
  async function handleAddItem(itemData) {
    try {
      const item = await createItem(activeCampaign.id, itemData)
      setActiveCampaign(prev => ({ ...prev, items: [...prev.items, item] }))
      setCampaigns(prev => prev.map(c =>
        c.id === activeCampaign.id ? { ...c, items: [...c.items, { id: item.id }] } : c
      ))
      setOpenModal(null)
    } catch (e) {
      console.error('handleAddItem:', e)
      alert('Failed to add item.')
    }
  }

  async function handleDeleteItem(itemId) {
    setActiveCampaign(prev => ({ ...prev, items: prev.items.filter(i => i.id !== itemId) }))
    try {
      await deleteItem(itemId)
    } catch (e) {
      console.error('handleDeleteItem:', e)
    }
  }

  async function handleRevealItem(itemId) {
    const item = activeCampaign.items.find(i => i.id === itemId)
    if (!item) return
    const name = item.trueName || item.name
    setActiveCampaign(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, revealed: true, name } : i),
    }))
    try {
      await updateItem(itemId, { revealed: true, name })
    } catch (e) {
      console.error('handleRevealItem:', e)
    }
  }

  async function handleSetFlavorText(itemId, text) {
    setActiveCampaign(prev => ({
      ...prev,
      items: prev.items.map(i => i.id === itemId ? { ...i, flavorText: text } : i),
    }))
    try {
      await updateItem(itemId, { flavorText: text })
    } catch (e) {
      console.error('handleSetFlavorText:', e)
    }
  }

  // ── Sessions ──────────────────────────────────────────────────────────────────
  async function handleAddSession({ name, date }) {
    try {
      const session = await createSession(activeCampaign.id, { name, date })
      setActiveCampaign(prev => ({ ...prev, sessions: [...prev.sessions, session] }))
      setCampaigns(prev => prev.map(c =>
        c.id === activeCampaign.id ? { ...c, sessions: [...c.sessions, session] } : c
      ))
      setOpenModal(null)
    } catch (e) {
      console.error('handleAddSession:', e)
      alert('Failed to add session.')
    }
  }

  // ── API key ───────────────────────────────────────────────────────────────────
  function handleSaveApiKey(key) {
    key ? localStorage.setItem(API_KEY_KEY, key) : localStorage.removeItem(API_KEY_KEY)
    setApiKey(key)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const inInventory = !!activeCampaign

  return (
    <>
      <Header inInventory={inInventory} onBack={handleBack} />

      {dbError && (
        <div style={{
          background: 'rgba(248,113,113,0.1)',
          border: '1px solid rgba(248,113,113,0.3)',
          color: 'var(--danger)',
          padding: '0.75rem 2rem',
          fontSize: '0.9rem',
        }}>
          {dbError}
        </div>
      )}

      {!inInventory ? (
        campaignsLoading
          ? <LoadingPane message="Loading campaigns…" />
          : <CampaignList
              campaigns={campaigns}
              onOpenCampaign={handleOpenCampaign}
              onNewCampaign={() => setOpenModal('campaign')}
            />
      ) : campaignLoading
        ? <LoadingPane message="Opening campaign…" />
        : <InventoryScreen
            campaign={activeCampaign}
            apiKey={apiKey}
            onAdjustCurrency={handleAdjustCurrency}
            onApplyPartySplit={handleApplyPartySplit}
            onAdjustCharacterCurrency={handleAdjustCharacterCurrency}
            onAddGem={handleAddGem}
            onDeleteGem={handleDeleteGem}
            onAssignGem={handleAssignGem}
            onDeleteItem={handleDeleteItem}
            onRevealItem={handleRevealItem}
            onSetFlavorText={handleSetFlavorText}
            onSaveApiKey={handleSaveApiKey}
            onOpenItemModal={() => setOpenModal('item')}
            onOpenSessionModal={() => setOpenModal('session')}
            onOpenSettings={() => setOpenModal('settings')}
          />
      }

      <CampaignModal
        isOpen={openModal === 'campaign'}
        onClose={() => setOpenModal(null)}
        onSave={handleCreateCampaign}
      />

      {activeCampaign && (
        <>
          <ItemModal
            isOpen={openModal === 'item'}
            onClose={() => setOpenModal(null)}
            onSave={handleAddItem}
            characters={activeCampaign.characters}
            sessions={activeCampaign.sessions}
          />
          <SessionModal
            isOpen={openModal === 'session'}
            onClose={() => setOpenModal(null)}
            onSave={handleAddSession}
            sessionCount={activeCampaign.sessions.length}
          />
          <SettingsModal
            isOpen={openModal === 'settings'}
            onClose={() => setOpenModal(null)}
            onSave={handleSaveSettings}
            onDelete={handleDeleteCampaign}
            campaign={activeCampaign}
          />
        </>
      )}
    </>
  )
}

function LoadingPane({ message }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: 'calc(100vh - 60px)',
      color: 'var(--text-faint)',
      fontSize: '0.85rem',
      letterSpacing: '0.12em',
      textTransform: 'uppercase',
    }}>
      {message}
    </div>
  )
}
