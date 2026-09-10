import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY || '',
      Authorization: `Bearer ${SUPABASE_KEY}`,
      Prefer: method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, user_id } = body;

    if (!user_id) {
      return NextResponse.json({ error: 'user_id required' }, { status: 400 });
    }

    // ── SAVE SCAN ────────────────────────────────────────────
    if (action === 'save') {
      const {
        drug_name,
        manufacturer,
        batch_num,
        nafdac_num,
        expiry_date,
        storage,
        packaging,
        drug_form,
        source,
        observations,
        warnings,
        status,
        safety_score,
        summary,
        flags,
        recommendation,
        pro_tip,
        age_note,
      } = body;

      const result = await supabase('POST', 'scan_history', {
        user_id,
        drug_name,
        manufacturer,
        batch_num,
        nafdac_num,
        expiry_date,
        storage,
        packaging,
        drug_form,
        source,
        observations,
        warnings: warnings || [],
        status,
        safety_score,
        summary,
        flags: flags || [],
        recommendation,
        pro_tip,
        age_note,
      });

      if (!result.ok) {
        return NextResponse.json(
          { error: result.data?.message || 'Save failed' },
          { status: 500 }
        );
      }

      const saved = Array.isArray(result.data) ? result.data[0] : result.data;
      return NextResponse.json({ success: true, id: saved?.id }, { status: 200 });
    }

    // ── GET SCAN HISTORY ─────────────────────────────────────
    if (action === 'get') {
      const result = await supabase(
        'GET',
        `scan_history?user_id=eq.${user_id}&order=created_at.desc&select=*`
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 });
      }

      return NextResponse.json({ success: true, history: result.data || [] }, { status: 200 });
    }

    // ── DELETE SCAN ──────────────────────────────────────────
    if (action === 'delete') {
      const { scan_id } = body;
      if (!scan_id) {
        return NextResponse.json({ error: 'scan_id required' }, { status: 400 });
      }

      const result = await supabase(
        'DELETE',
        `scan_history?id=eq.${scan_id}&user_id=eq.${user_id}`
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── CREATE CHAT SESSION ──────────────────────────────────
    if (action === 'create_session') {
      const { title } = body;
      const result = await supabase('POST', 'chat_sessions', {
        user_id,
        title: title || 'New conversation',
      });

      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }

      const session = Array.isArray(result.data) ? result.data[0] : result.data;
      return NextResponse.json({ success: true, session }, { status: 200 });
    }

    // ── GET ALL CHAT SESSIONS ────────────────────────────────
    if (action === 'get_sessions') {
      const result = await supabase(
        'GET',
        `chat_sessions?user_id=eq.${user_id}&order=is_pinned.desc,updated_at.desc&select=*`
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to fetch sessions' }, { status: 500 });
      }

      return NextResponse.json({ success: true, sessions: result.data || [] }, { status: 200 });
    }

    // ── GET MESSAGES FOR A SESSION ───────────────────────────
    if (action === 'get_messages') {
      const { session_id } = body;
      if (!session_id) {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      }

      const result = await supabase(
        'GET',
        `chat_messages?session_id=eq.${session_id}&order=created_at.asc&select=*`
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
      }

      return NextResponse.json({ success: true, messages: result.data || [] }, { status: 200 });
    }

    // ── SAVE MESSAGE ─────────────────────────────────────────
    if (action === 'save_message') {
      const { session_id, role, content } = body;
      if (!session_id || !role || !content) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const result = await supabase('POST', 'chat_messages', { session_id, role, content });

      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
      }

      await supabase('PATCH', `chat_sessions?id=eq.${session_id}`, {
        updated_at: new Date().toISOString(),
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── DELETE SESSION ───────────────────────────────────────
    if (action === 'delete_session') {
      const { session_id } = body;
      if (!session_id) {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      }

      await supabase('DELETE', `chat_messages?session_id=eq.${session_id}`);
      const result = await supabase(
        'DELETE',
        `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Delete failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── TOGGLE PIN SESSION ───────────────────────────────────
    if (action === 'toggle_pin_session') {
      const { session_id, is_pinned } = body;
      if (!session_id) {
        return NextResponse.json({ error: 'session_id required' }, { status: 400 });
      }

      const result = await supabase(
        'PATCH',
        `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`,
        {
          is_pinned: !is_pinned,
        }
      );

      if (!result.ok) {
        return NextResponse.json({ error: 'Pin failed' }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── UPDATE SESSION TITLE ─────────────────────────────────
    if (action === 'update_title') {
      const { session_id, title } = body;
      if (!session_id || !title) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      await supabase('PATCH', `chat_sessions?id=eq.${session_id}&user_id=eq.${user_id}`, {
        title,
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}