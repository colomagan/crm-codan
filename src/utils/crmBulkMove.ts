import { supabase } from '@/integrations/supabase/client';
import type { Lead, Contact, CrmClient } from '@/types/crm';

async function remapOpportunities(
  fromCol: 'lead_id' | 'contact_id' | 'client_id',
  toCol: 'lead_id' | 'contact_id' | 'client_id',
  idMap: Record<string, string>,
) {
  for (const [oldId, newId] of Object.entries(idMap)) {
    await supabase
      .from('sales_opportunities')
      .update({ [fromCol]: null, [toCol]: newId, updated_at: new Date().toISOString() })
      .eq(fromCol, oldId);
  }
}

async function remapLegalAssignments(
  fromType: 'client' | 'contact' | 'lead',
  toType: 'client' | 'contact' | 'lead',
  idMap: Record<string, string>,
) {
  for (const [oldId, newId] of Object.entries(idMap)) {
    await supabase
      .from('legal_document_assignments')
      .update({ entity_type: toType, entity_id: newId })
      .eq('entity_type', fromType)
      .eq('entity_id', oldId);
  }
}

// ─── Leads → Contacts ────────────────────────────────────────────────────────
export async function bulkMoveLeadsToContacts(leads: Lead[], userId: string) {
  const rows = leads.map(l => ({
    user_id:           userId,
    business_name:     l.business_name   || '',
    first_name:        l.first_name      || '',
    last_name:         l.last_name       || '',
    email:             l.email           ?? null,
    whatsapp:          l.phone           ?? null,
    website:           l.website         ?? null,
    source:            l.source          ?? null,
    notes:             l.notes           ?? null,
    city:              l.city            ?? null,
    province:          l.state           ?? null,
    country_code:      l.country_code    ?? null,
    category:          l.category        ?? null,
    google_maps_url:   l.google_maps_url ?? null,
    score:             l.score           ?? null,
    reviews_count:     l.reviews_count   ?? null,
    type:              'LEAD_CONTACTED'  as const,
    labels:            [] as string[],
    channel:           null,
    last_contact_date: null,
    country_name:      null,
  }));

  const { data, error: insertErr } = await supabase.from('contacts').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  leads.forEach((l, i) => { if (data?.[i]) idMap[l.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('lead_id', 'contact_id', idMap);
  await remapLegalAssignments('lead', 'contact', idMap);

  const { error: deleteErr } = await supabase.from('leads').delete().in('id', leads.map(l => l.id));
  if (deleteErr) throw deleteErr;

  return { moved: leads.length };
}

// ─── Leads → Clients ─────────────────────────────────────────────────────────
export async function bulkMoveLeadsToClients(leads: Lead[], userId: string) {
  const rows = leads.map(l => ({
    user_id:         userId,
    business_name:   l.business_name   || '',
    first_name:      l.first_name      || '',
    last_name:       l.last_name       || '',
    email:           l.email           ?? null,
    phone:           l.phone           ?? null,
    website:         l.website         ?? null,
    source:          l.source          ?? null,
    notes:           l.notes           ?? null,
    city:            l.city            ?? null,
    country_code:    l.country_code    ?? null,
    category:        l.category        ?? null,
    google_maps_url: l.google_maps_url ?? null,
    score:           l.score           ?? null,
    status:          'active'          as const,
    labels:          [] as string[],
    channel:         null,
  }));

  const { data, error: insertErr } = await supabase.from('clients').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  leads.forEach((l, i) => { if (data?.[i]) idMap[l.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('lead_id', 'client_id', idMap);
  await remapLegalAssignments('lead', 'client', idMap);

  const { error: deleteErr } = await supabase.from('leads').delete().in('id', leads.map(l => l.id));
  if (deleteErr) throw deleteErr;

  return { moved: leads.length };
}

// ─── Contacts → Leads ────────────────────────────────────────────────────────
export async function bulkMoveContactsToLeads(contacts: Contact[], userId: string) {
  const rows = contacts.map(c => ({
    user_id:         userId,
    business_name:   c.business_name   || '',
    first_name:      c.first_name      || '',
    last_name:       c.last_name       || '',
    email:           c.email           ?? null,
    phone:           c.whatsapp        ?? null,
    website:         c.website         ?? null,
    source:          c.source          ?? null,
    notes:           c.notes           ?? null,
    city:            c.city            ?? null,
    state:           c.province        ?? null,
    country_code:    c.country_code    ?? null,
    category:        c.category        ?? null,
    google_maps_url: c.google_maps_url ?? null,
    score:           c.score           ?? null,
    reviews_count:   c.reviews_count   ?? null,
  }));

  const { data, error: insertErr } = await supabase.from('leads').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  contacts.forEach((c, i) => { if (data?.[i]) idMap[c.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('contact_id', 'lead_id', idMap);
  await remapLegalAssignments('contact', 'lead', idMap);

  const { error: deleteErr } = await supabase.from('contacts').delete().in('id', contacts.map(c => c.id));
  if (deleteErr) throw deleteErr;

  return { moved: contacts.length };
}

// ─── Contacts → Clients ───────────────────────────────────────────────────────
export async function bulkMoveContactsToClients(contacts: Contact[], userId: string) {
  const rows = contacts.map(c => ({
    user_id:         userId,
    business_name:   c.business_name   || '',
    first_name:      c.first_name      || '',
    last_name:       c.last_name       || '',
    email:           c.email           ?? null,
    phone:           c.whatsapp        ?? null,
    website:         c.website         ?? null,
    source:          c.source          ?? null,
    notes:           c.notes           ?? null,
    city:            c.city            ?? null,
    country_code:    c.country_code    ?? null,
    category:        c.category        ?? null,
    google_maps_url: c.google_maps_url ?? null,
    score:           c.score           ?? null,
    labels:          c.labels          ?? [],
    channel:         c.channel         ?? null,
    status:          'active'          as const,
  }));

  const { data, error: insertErr } = await supabase.from('clients').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  contacts.forEach((c, i) => { if (data?.[i]) idMap[c.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('contact_id', 'client_id', idMap);
  await remapLegalAssignments('contact', 'client', idMap);

  const { error: deleteErr } = await supabase.from('contacts').delete().in('id', contacts.map(c => c.id));
  if (deleteErr) throw deleteErr;

  return { moved: contacts.length };
}

// ─── Clients → Leads ─────────────────────────────────────────────────────────
export async function bulkMoveClientsToLeads(clients: CrmClient[], userId: string) {
  const rows = clients.map(c => ({
    user_id:         userId,
    business_name:   c.business_name   || '',
    first_name:      c.first_name      || '',
    last_name:       c.last_name       || '',
    email:           c.email           ?? null,
    phone:           c.phone           ?? null,
    website:         c.website         ?? null,
    source:          c.source          ?? null,
    notes:           c.notes           ?? null,
    city:            c.city            ?? null,
    state:           null,
    country_code:    c.country_code    ?? null,
    category:        c.category        ?? null,
    google_maps_url: c.google_maps_url ?? null,
    score:           c.score           ?? null,
    reviews_count:   null,
  }));

  const { data, error: insertErr } = await supabase.from('leads').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  clients.forEach((c, i) => { if (data?.[i]) idMap[c.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('client_id', 'lead_id', idMap);
  await remapLegalAssignments('client', 'lead', idMap);

  const { error: deleteErr } = await supabase.from('clients').delete().in('id', clients.map(c => c.id));
  if (deleteErr) throw deleteErr;

  return { moved: clients.length };
}

// ─── Clients → Contacts ───────────────────────────────────────────────────────
export async function bulkMoveClientsToContacts(clients: CrmClient[], userId: string) {
  const rows = clients.map(c => ({
    user_id:           userId,
    business_name:     c.business_name   || '',
    first_name:        c.first_name      || '',
    last_name:         c.last_name       || '',
    email:             c.email           ?? null,
    whatsapp:          c.phone           ?? null,
    website:           c.website         ?? null,
    source:            c.source          ?? null,
    notes:             c.notes           ?? null,
    city:              c.city            ?? null,
    country_code:      c.country_code    ?? null,
    category:          c.category        ?? null,
    google_maps_url:   c.google_maps_url ?? null,
    score:             c.score           ?? null,
    labels:            c.labels          ?? [],
    channel:           c.channel         ?? null,
    type:              'LEAD_CONTACTED'  as const,
    province:          null,
    last_contact_date: null,
    country_name:      null,
    reviews_count:     null,
  }));

  const { data, error: insertErr } = await supabase.from('contacts').insert(rows).select('*');
  if (insertErr) throw insertErr;

  const idMap: Record<string, string> = {};
  clients.forEach((c, i) => { if (data?.[i]) idMap[c.id] = (data[i] as { id: string }).id; });
  await remapOpportunities('client_id', 'contact_id', idMap);
  await remapLegalAssignments('client', 'contact', idMap);

  const { error: deleteErr } = await supabase.from('clients').delete().in('id', clients.map(c => c.id));
  if (deleteErr) throw deleteErr;

  return { moved: clients.length };
}
