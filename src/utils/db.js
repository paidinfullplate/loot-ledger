import { supabase } from './supabase'

// ── Row → app-shape transformers ──────────────────────────────────────────────
// DB uses snake_case; components use camelCase.

export function rowToItem(row) {
  return {
    id:         row.id,
    name:       row.name,
    trueName:   row.true_name   ?? null,
    quantity:   row.quantity    ?? 1,
    rarity:     row.rarity      ?? 'Common',
    valueGp:    parseFloat(row.value_gp) || 0,
    assignedTo: row.assigned_to ?? 'Party',
    sessionId:  row.session_id  ?? null,
    notes:      row.notes       || '',
    flavorText: row.flavor_text ?? null,
    attuned:    row.attuned     ?? false,
    mystery:    row.mystery     ?? false,
    revealed:   row.revealed    ?? false,
  }
}

function rowToSession(row) {
  return { id: row.id, name: row.name, date: row.date }
}

// ── Nested select strings ─────────────────────────────────────────────────────

// Used for the campaign list — items is id-only so .length gives the count.
const CAMPAIGN_SUMMARY_SELECT = `
  id, name, setting, created_at,
  characters ( id, name ),
  sessions   ( id, name, date ),
  items      ( id ),
  party_gold ( amount )
`

// Used for the inventory screen — items includes every column.
const CAMPAIGN_FULL_SELECT = `
  id, name, setting, created_at,
  characters ( id, name ),
  sessions   ( id, name, date ),
  items (
    id, name, true_name, rarity, quantity, value_gp,
    assigned_to, session_id, notes, flavor_text,
    attuned, mystery, revealed, created_at
  ),
  party_gold ( amount )
`

// Shared shape builder for both select widths.
function buildCampaign(row, fullItems = false) {
  return {
    id:         row.id,
    name:       row.name,
    setting:    row.setting    || '',
    createdAt:  row.created_at,
    characters: (row.characters || []).map(c => c.name),
    sessions:   (row.sessions   || []).map(rowToSession),
    items:      fullItems
                  ? (row.items || []).map(rowToItem)
                  : (row.items || []).map(i => ({ id: i.id })),
    partyGold:  parseFloat(row.party_gold?.[0]?.amount) || 0,
  }
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

export async function getCampaigns() {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_SUMMARY_SELECT)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data || []).map(row => buildCampaign(row, false))
}

export async function getCampaignById(id) {
  const { data, error } = await supabase
    .from('campaigns')
    .select(CAMPAIGN_FULL_SELECT)
    .eq('id', id)
    .single()

  if (error) throw error
  return buildCampaign(data, true)
}

export async function createCampaign({ name, setting, characters }) {
  // 1. Insert campaign row.
  const { data: camp, error: campErr } = await supabase
    .from('campaigns')
    .insert({ name, setting: setting || null })
    .select('id, name, setting, created_at')
    .single()

  if (campErr) throw campErr

  // 2. Insert characters (if any).
  if (characters.length > 0) {
    const { error: charErr } = await supabase
      .from('characters')
      .insert(characters.map(n => ({ campaign_id: camp.id, name: n })))

    if (charErr) throw charErr
  }

  // 3. Seed the party_gold row so it exists for Realtime and queries.
  const { error: goldErr } = await supabase
    .from('party_gold')
    .insert({ campaign_id: camp.id, amount: 0 })

  if (goldErr) throw goldErr

  return {
    id:         camp.id,
    name:       camp.name,
    setting:    camp.setting || '',
    createdAt:  camp.created_at,
    characters,
    sessions:   [],
    items:      [],
    partyGold:  0,
  }
}

export async function updateCampaignMeta(id, { name, setting, characters }) {
  const { error: campErr } = await supabase
    .from('campaigns')
    .update({ name, setting: setting || null })
    .eq('id', id)

  if (campErr) throw campErr

  // Replace characters: delete all, then re-insert.
  const { error: delErr } = await supabase
    .from('characters')
    .delete()
    .eq('campaign_id', id)

  if (delErr) throw delErr

  if (characters.length > 0) {
    const { error: insErr } = await supabase
      .from('characters')
      .insert(characters.map(n => ({ campaign_id: id, name: n })))

    if (insErr) throw insErr
  }
}

export async function deleteCampaign(id) {
  // ON DELETE CASCADE handles all child rows.
  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (error) throw error
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(campaignId, { name, date }) {
  const { data, error } = await supabase
    .from('sessions')
    .insert({ campaign_id: campaignId, name, date: date || null })
    .select('id, name, date')
    .single()

  if (error) throw error
  return rowToSession(data)
}

// ── Items ─────────────────────────────────────────────────────────────────────

export async function createItem(campaignId, item) {
  const { data, error } = await supabase
    .from('items')
    .insert({
      campaign_id: campaignId,
      session_id:  item.sessionId  || null,
      name:        item.name,
      true_name:   item.trueName   || null,
      rarity:      item.rarity,
      quantity:    item.quantity,
      value_gp:    item.valueGp,
      assigned_to: item.assignedTo,
      notes:       item.notes      || null,
      flavor_text: item.flavorText || null,
      attuned:     item.attuned,
      mystery:     item.mystery,
      revealed:    item.revealed,
    })
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function updateItem(id, changes) {
  // Map camelCase keys → snake_case DB columns.
  const patch = {}
  if ('name'       in changes) patch.name         = changes.name
  if ('trueName'   in changes) patch.true_name     = changes.trueName
  if ('rarity'     in changes) patch.rarity        = changes.rarity
  if ('quantity'   in changes) patch.quantity      = changes.quantity
  if ('valueGp'    in changes) patch.value_gp      = changes.valueGp
  if ('assignedTo' in changes) patch.assigned_to   = changes.assignedTo
  if ('sessionId'  in changes) patch.session_id    = changes.sessionId
  if ('notes'      in changes) patch.notes         = changes.notes
  if ('flavorText' in changes) patch.flavor_text   = changes.flavorText
  if ('attuned'    in changes) patch.attuned       = changes.attuned
  if ('mystery'    in changes) patch.mystery       = changes.mystery
  if ('revealed'   in changes) patch.revealed      = changes.revealed

  const { data, error } = await supabase
    .from('items')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return rowToItem(data)
}

export async function deleteItem(id) {
  const { error } = await supabase.from('items').delete().eq('id', id)
  if (error) throw error
}

// ── Party Gold ────────────────────────────────────────────────────────────────

export async function upsertPartyGold(campaignId, amount) {
  const { error } = await supabase
    .from('party_gold')
    .upsert({ campaign_id: campaignId, amount }, { onConflict: 'campaign_id' })

  if (error) throw error
}
