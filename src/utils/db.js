import { supabase } from './supabase'

// ── Row → app-shape transformers ──────────────────────────────────────────────

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

function rowToCharacter(row) {
  return {
    id:       row.id,
    name:     row.name,
    gold:     parseFloat(row.gold)     || 0,
    platinum: parseFloat(row.platinum) || 0,
    silver:   parseFloat(row.silver)   || 0,
    copper:   parseFloat(row.copper)   || 0,
  }
}

export function rowToGem(row) {
  return {
    id:         row.id,
    name:       row.name,
    valueGp:    parseFloat(row.value_gp) || 0,
    assignedTo: row.assigned_to ?? null,
    sessionId:  row.session_id  ?? null,
  }
}

export function rowToCurrency(row) {
  if (!row) return { gold: 0, platinum: 0, silver: 0, copper: 0 }
  return {
    gold:     parseFloat(row.gold)     || 0,
    platinum: parseFloat(row.platinum) || 0,
    silver:   parseFloat(row.silver)   || 0,
    copper:   parseFloat(row.copper)   || 0,
  }
}

// ── Nested select strings ─────────────────────────────────────────────────────

const CAMPAIGN_SUMMARY_SELECT = `
  id, name, setting, created_at,
  characters ( id, name, gold, platinum, silver, copper ),
  sessions   ( id, name, date ),
  items      ( id ),
  party_gold ( gold, platinum, silver, copper )
`

const CAMPAIGN_FULL_SELECT = `
  id, name, setting, created_at,
  characters ( id, name, gold, platinum, silver, copper ),
  sessions   ( id, name, date ),
  items (
    id, name, true_name, rarity, quantity, value_gp,
    assigned_to, session_id, notes, flavor_text,
    attuned, mystery, revealed, created_at
  ),
  party_gold ( gold, platinum, silver, copper ),
  gems ( id, name, value_gp, assigned_to, session_id, created_at )
`

function buildCampaign(row, fullItems = false) {
  return {
    id:         row.id,
    name:       row.name,
    setting:    row.setting   || '',
    createdAt:  row.created_at,
    characters: (row.characters || []).map(rowToCharacter),
    sessions:   (row.sessions   || []).map(rowToSession),
    items:      fullItems
                  ? (row.items || []).map(rowToItem)
                  : (row.items || []).map(i => ({ id: i.id })),
    gems:       fullItems
                  ? (row.gems || []).map(rowToGem)
                  : [],
    currency:   rowToCurrency(row.party_gold),
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
  const { data: camp, error: campErr } = await supabase
    .from('campaigns')
    .insert({ name, setting: setting || null })
    .select('id, name, setting, created_at')
    .single()
  if (campErr) throw campErr

  let insertedChars = []
  if (characters.length > 0) {
    const { data: chars, error: charErr } = await supabase
      .from('characters')
      .insert(characters.map(n => ({
        campaign_id: camp.id, name: n,
        gold: 0, platinum: 0, silver: 0, copper: 0,
      })))
      .select('id, name, gold, platinum, silver, copper')
    if (charErr) throw charErr
    insertedChars = chars || []
  }

  const { error: goldErr } = await supabase
    .from('party_gold')
    .insert({ campaign_id: camp.id, gold: 0, platinum: 0, silver: 0, copper: 0 })
  if (goldErr) throw goldErr

  return {
    id:         camp.id,
    name:       camp.name,
    setting:    camp.setting || '',
    createdAt:  camp.created_at,
    characters: insertedChars.map(rowToCharacter),
    sessions:   [],
    items:      [],
    gems:       [],
    currency:   { gold: 0, platinum: 0, silver: 0, copper: 0 },
  }
}

// Diff-based update — preserves per-character currency for unchanged characters.
export async function updateCampaignMeta(id, { name, setting, characters }, existingCharacters = []) {
  const { error: campErr } = await supabase
    .from('campaigns')
    .update({ name, setting: setting || null })
    .eq('id', id)
  if (campErr) throw campErr

  const existingByName = Object.fromEntries(existingCharacters.map(c => [c.name, c]))
  const newNameSet = new Set(characters)

  // Delete removed characters
  const toDelete = existingCharacters.filter(c => !newNameSet.has(c.name))
  if (toDelete.length) {
    const { error } = await supabase
      .from('characters')
      .delete()
      .in('id', toDelete.map(c => c.id))
    if (error) throw error
  }

  // Insert new characters (with zero currency)
  const toInsert = characters.filter(n => !existingByName[n])
  if (toInsert.length) {
    const { error } = await supabase
      .from('characters')
      .insert(toInsert.map(n => ({
        campaign_id: id, name: n,
        gold: 0, platinum: 0, silver: 0, copper: 0,
      })))
    if (error) throw error
  }
}

export async function deleteCampaign(id) {
  const { error } = await supabase.from('campaigns').delete().eq('id', id)
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

// ── Currency ──────────────────────────────────────────────────────────────────

export async function updateCurrency(campaignId, currency) {
  const { data, error } = await supabase
    .from('party_gold')
    .update({
      gold:     currency.gold,
      platinum: currency.platinum,
      silver:   currency.silver,
      copper:   currency.copper,
    })
    .eq('campaign_id', campaignId)
    .select('campaign_id')
  if (error) throw error

  if (!data || data.length === 0) {
    const { error: insErr } = await supabase
      .from('party_gold')
      .insert({
        campaign_id: campaignId,
        gold: currency.gold, platinum: currency.platinum,
        silver: currency.silver, copper: currency.copper,
      })
    if (insErr) throw insErr
  }
}

// ── Character currency ────────────────────────────────────────────────────────

export async function updateCharacterCurrency(characterId, currency) {
  const { error } = await supabase
    .from('characters')
    .update({
      gold:     currency.gold,
      platinum: currency.platinum,
      silver:   currency.silver,
      copper:   currency.copper,
    })
    .eq('id', characterId)
  if (error) throw error
}

export async function applyPartySplit(campaignId, newPartyCurrency, characterUpdates) {
  await updateCurrency(campaignId, newPartyCurrency)
  await Promise.all(
    characterUpdates.map(({ id, currency }) => updateCharacterCurrency(id, currency))
  )
}

// ── Gems ──────────────────────────────────────────────────────────────────────

export async function createGem(campaignId, gem) {
  const { data, error } = await supabase
    .from('gems')
    .insert({
      campaign_id: campaignId,
      name:        gem.name,
      value_gp:    gem.valueGp,
      assigned_to: gem.assignedTo || null,
      session_id:  gem.sessionId  || null,
    })
    .select()
    .single()
  if (error) throw error
  return rowToGem(data)
}

export async function deleteGem(id) {
  const { error } = await supabase.from('gems').delete().eq('id', id)
  if (error) throw error
}

export async function assignGem(id, assignedTo) {
  const { data, error } = await supabase
    .from('gems')
    .update({ assigned_to: assignedTo || null })
    .eq('id', id)
    .select()
    .single()
  if (error) throw error
  return rowToGem(data)
}
