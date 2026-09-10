const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method, path, body) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
      'Prefer': method === 'POST' ? 'return=representation' : ''
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, user_id } = req.body;
  if (!user_id) return res.status(400).json({ error: 'user_id required' });

  // ── SAVE SCAN ────────────────────────────────────────────
  if (action === 'save') {
    const {
      drug_name, manufacturer, batch_num, nafdac_num,
      expiry_date, storage, packaging, drug_form, source,
      observations, warnings, status, safety_score,
      summary, flags, recommendation, pro_tip, age_note
    } = req.body;

    const result = await supabase('POST', 'scan_history', {
      user_id, drug_name, manufacturer, batch_num, nafdac_num,
      expiry_date, storage, packaging, drug_form, source,
      observations, warnings: warnings || [],
      status, safety_score,
      summary, flags: flags || [],
      recommendation, pro_tip, age_note
    });

    if (!result.ok) return res.status(500).json({ error: result.data?.message || 'Save failed' });
    const saved = Array.isArray(result.data) ? result.data[0] : result.data;
    return res.status(200).json({ success: true, id: saved.id });
  }

  // ── GET SCAN HISTORY ─────────────────────────────────────
  if (action === 'get') {
    const result = await supabase('GET', `scan_history?user_id=eq.${user_id}&order=created_at.desc&select=*`);
    if (!result.ok) return res.status(500).json({ error: 'Failed to fetch history' });
    return res.status(200).json({ success: true, history: result.data || [] });
  }

  // ── DELETE SCAN ──────────────────────────────────────────
  if (action === 'delete') {
    const { scan_id } = req.body;
    if (!scan_id) return res.status(400).json({ error: 'scan_id required' });
    const result = await supabase('DELETE', `scan_history?id=eq.${scan_id}&user_id=eq.${user_id}`);
    if (!result.ok) return res.status(500).json({ error: 'Delete failed' });
    return res.status(200).json({ success: true });
  }

  // ── CREATE CHAT SESSION ──────────────────────────────────
  if (action === 'create_session') {
    const { title } = req.body;
    const result = await supabase('POST', 'chat_sessions', {
      user_id,
      title: title || 'New conversation'
    });
    if (!result.ok) return res.status(500).json({ error: 'Failed to create session' });
    const session = Array.isArray(result.data) ? result.data[0] : result.data;
    return res.status(200).json({ success: true, session });
  }

  // ── GET ALL CHAT SESSIONS ────────────────────────────────
  if (action === 'get_sessions') {
    const result = await supabase('GET',
      `chat_sessions?user_id=eq.${user_id}&order=is_pinned.desc,updated_at.desc&select=*`
    );
    if (!result.ok) return res.status(500).json({ error: 'Failed to fetch sessions' });
    return res.status(200).json({ success: true, sessions: result.data || [] });
  }

  // ── GET MESSAGES FOR A SESSION ───────────────────────────
  if (action === 'get_messages') {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const result = await supabase('GET',
      `chat_messages?session_id=eq.${session_id}&order=created_at.asc&select=*`
    );
    if (!result.ok) return res.status(500).json({ error: 'Failed to fetch messages' });
    return res.status(200).json({ success: true, messages: result.data || [] });
  }

  // ── SAVE MESSAGE ─────────────────────────────────────────
  if (action === 'save_message') {
    const { session_id, role, content } = req.body;
    if (!session_id || !role || !content) return res.status(400).json({ error: 'Missing fields' });

    const result = await supabase('POST', 'chat_messages', { session_id, role, content });
    if (!result.ok) return res.status(500).json({ error: 'Failed to save message' });

    // Update session timestamp and title if first user message
    await supabase('PATCH', `chat_sessions?id=eq.${session_id}`, {
      updated_at: new Date().toISOString()
    });

    return res.status(200).json({ success: true });
  }

  // ── DELETE SESSION ───────────────────────────────────────
  if (action === 'delete_session') {
    const { session_id } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    await supabase('DELETE', `chat_messages?session_id=eq.${session_id}`);
    const result = await supabase('DELETE', `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`);
    if (!result.ok) return res.status(500).json({ error: 'Delete failed' });
    return res.status(200).json({ success: true });
  }

  // ── TOGGLE PIN SESSION ───────────────────────────────────
  if (action === 'toggle_pin_session') {
    const { session_id, is_pinned } = req.body;
    if (!session_id) return res.status(400).json({ error: 'session_id required' });
    const result = await supabase('PATCH', `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`, {
      is_pinned: !is_pinned
    });
    if (!result.ok) return res.status(500).json({ error: 'Pin failed' });
    return res.status(200).json({ success: true });
  }

  // ── UPDATE SESSION TITLE ─────────────────────────────────
  if (action === 'update_title') {
    const { session_id, title } = req.body;
    if (!session_id || !title) return res.status(400).json({ error: 'Missing fields' });
    await supabase('PATCH', `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`, { title });
    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
