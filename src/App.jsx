import { useState, useEffect } from 'react'
import { supabase } from './utils/supabase'
import { API_KEY_KEY } from './utils/storage'
import {
  getCampaigns, getCampaignById,
  createCampaign, updateCampaignMeta, deleteCampaign,
  createSession,
  createItem, updateItem, deleteItem,
  updateCurrency,
  rowToItem, rowToCurrency,
} from './utils/db'
import Header from './components/Header'
import CampaignList from './components/CampaignList'
import InventoryScreen from './components/InventoryScreen'
import CampaignModal from './components/modals/CampaignModal'
import ItemModal from './components/modals/ItemModal'
import SessionModal from './components/modals/SessionModal'
import SettingsModal from './components/modals/SettingsModal'

export default function App() {
  // Campaign list (summary shapes — items array is id-only for counting)
  const [campaigns, setCampaigns] = useState([])
  const [campaignsLoading, setCampaignsLoading] = useState(true)

  // Active campaign (full shape — items include all columns)
  const [activeCampaign, setActiveCampaign] = useState(null)
  const [campaignLoading, setCampaignLoading] = useState(false)

  const [openModal, setOpenModal] = useState(null) // 'campaign'|'item'|'session'|'settings'
  const [apiKey, setApiKey] = useState(() => localStorage.getItem(API_KEY_KEY) || '')
  const [dbError, setDbError] = useState(null)

  // ── Initial load ────────────────────────────────────────────────────────────
  useEffect(() => {
    loadCampaigns()
  }, [])

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

  // ── Realtime subscriptions ──────────────────────────────────────────────────
  // Subscribe to items + party_gold whenever a campaign is open.
  // Unsubscribes automatically when the campaign changes or is closed.
  useEffect(() => {
    if (!activeCampaign) return

    const campaignId = activeCampaign.id

    const channel = supabase
      .channel(`loot:${campaignId}`)

      // Items — INSERT / UPDATE / DELETE
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
          filter: `campaign_id=eq.${campaignId}`,
        },
        ({ eventType, new: newRow, old: oldRow }) => {
          setActiveCampaign(prev => {
            if (!prev || prev.id !== campaignId) return prev

            if (eventType === 'INSERT') {
              // De-dupe: if the optimistic insert is already present, replace it
              // with the server-confirmed row; otherwise add it (remote client).
              return {
                ...prev,
                items: [
                  ...prev.items.filter(i => i.id !== newRow.id),
                  rowToItem(newRow),
                ],
              }
            }
            if (eventType === 'UPDATE') {
              return {
                ...prev,
                items: prev.items.map(i =>
                  i.id === newRow.id ? rowToItem(newRow) : i
                ),
              }
            }
            if (eventType === 'DELETE') {
              return {
                ...prev,
                items: prev.items.filter(i => i.id !== oldRow.id),
              }
            }
            return prev
          })

          // Keep the campaign-list item count in sync.
          setCampaigns(prev =>
            prev.map(c => {
              if (c.id !== campaignId) return c
              let items = [...c.items]
              if (eventType === 'INSERT')
                items = [...items.filter(i => i.id !== newRow.id), { id: newRow.id }]
              if (eventType === 'DELETE')
                items = items.filter(i => i.id !== oldRow.id)
              return { ...c, items }
            })
          )
        }
      )

      // Party gold — any change (INSERT on first seed, UPDATE on adjustments)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'party_gold',
          filter: `campaign_id=eq.${campaignId}`,
        },
        ({ new: newRow }) => {
          if (!newRow) return
          const currency = rowToCurrency(newRow)
          setActiveCampaign(prev =>
            prev?.id === campaignId ? { ...prev, currency } : prev
          )
          setCampaigns(prev =>
            prev.map(c => (c.id === campaignId ? { ...c, currency } : c))
          )
        }
      )

      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [activeCampaign?.id])

  // ── Navigation ──────────────────────────────────────────────────────────────
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

  function handleBack() {
    setActiveCampaign(null)
  }

  // ── Campaign CRUD ────────────────────────────────────────────────────────────
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
      await updateCampaignMeta(activeCampaign.id, { name, setting, characters })
      setActiveCampaign(prev => ({ ...prev, name, setting, characters }))
      setCampaigns(prev =>
        prev.map(c =>
          c.id === activeCampaign.id ? { ...c, name, setting, characters } : c
        )
      )
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

  // ── Currency ──────────────────────────────────────────────────────────────────
  async function handleAdjustCurrency(denomination, delta) {
    const current = activeCampaign.currency
    const newCurrency = {
      ...current,
      [denomination]: Math.max(0, (current[denomination] || 0) + delta),
    }
    // Optimistic update — Realtime confirms for other clients.
    setActiveCampaign(prev => ({ ...prev, currency: newCurrency }))
    setCampaigns(prev =>
      prev.map(c =>
        c.id === activeCampaign.id ? { ...c, currency: newCurrency } : c
      )
    )
    try {
      await updateCurrency(activeCampaign.id, newCurrency)
    } catch (e) {
      console.error('handleAdjustCurrency:', e)
    }
  }

  // ── Items ─────────────────────────────────────────────────────────────────────
  async function handleAddItem(itemData) {
    try {
      const item = await createItem(activeCampaign.id, itemData)
      // Realtime INSERT will also fire, but de-duplication in the handler is safe.
      setActiveCampaign(prev => ({ ...prev, items: [...prev.items, item] }))
      setCampaigns(prev =>
        prev.map(c =>
          c.id === activeCampaign.id
            ? { ...c, items: [...c.items, { id: item.id }] }
            : c
        )
      )
      setOpenModal(null)
    } catch (e) {
      console.error('handleAddItem:', e)
      alert('Failed to add item.')
    }
  }

  async function handleDeleteItem(itemId) {
    // Optimistic removal.
    setActiveCampaign(prev => ({
      ...prev,
      items: prev.items.filter(i => i.id !== itemId),
    }))
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
    // Optimistic.
    setActiveCampaign(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, revealed: true, name } : i
      ),
    }))
    try {
      await updateItem(itemId, { revealed: true, name })
    } catch (e) {
      console.error('handleRevealItem:', e)
    }
  }

  async function handleSetFlavorText(itemId, text) {
    // Optimistic.
    setActiveCampaign(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === itemId ? { ...i, flavorText: text } : i
      ),
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
      setActiveCampaign(prev => ({
        ...prev,
        sessions: [...prev.sessions, session],
      }))
      setCampaigns(prev =>
        prev.map(c =>
          c.id === activeCampaign.id
            ? { ...c, sessions: [...c.sessions, session] }
            : c
        )
      )
      setOpenModal(null)
    } catch (e) {
      console.error('handleAddSession:', e)
      alert('Failed to add session.')
    }
  }

  // ── API key (stays in localStorage — not a backend concern) ──────────────────
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
          background: 'rgba(139,26,26,0.15)',
          border: '1px solid rgba(139,26,26,0.4)',
          color: '#c04040',
          padding: '0.75rem 2rem',
          fontSize: '0.9rem',
          fontStyle: 'italic',
        }}>
          {dbError}
        </div>
      )}

      {!inInventory ? (
        campaignsLoading ? (
          <LoadingPane message="Loading campaigns…" />
        ) : (
          <CampaignList
            campaigns={campaigns}
            onOpenCampaign={handleOpenCampaign}
            onNewCampaign={() => setOpenModal('campaign')}
          />
        )
      ) : campaignLoading ? (
        <LoadingPane message="Opening campaign…" />
      ) : (
        <InventoryScreen
          campaign={activeCampaign}
          apiKey={apiKey}
          onAdjustCurrency={handleAdjustCurrency}
          onDeleteItem={handleDeleteItem}
          onRevealItem={handleRevealItem}
          onSetFlavorText={handleSetFlavorText}
          onSaveApiKey={handleSaveApiKey}
          onOpenItemModal={() => setOpenModal('item')}
          onOpenSessionModal={() => setOpenModal('session')}
          onOpenSettings={() => setOpenModal('settings')}
        />
      )}

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
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 'calc(100vh - 64px)',
      color: 'var(--ink-faint)',
      fontFamily: "'Cinzel', serif",
      fontSize: '0.85rem',
      letterSpacing: '0.15em',
      textTransform: 'uppercase',
    }}>
      {message}
    </div>
  )
}
