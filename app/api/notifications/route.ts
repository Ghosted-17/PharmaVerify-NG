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
  return text ? JSON.parse(text) : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action, user_id, notification_id } = body;

    // ── GET ALL NOTIFICATIONS WITH READ STATUS ────────────
    if (action === 'get') {
      if (!user_id) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
      }

      const notifications = await supabase(
        'GET',
        `notifications?order=published_at.desc&limit=50&select=*`
      );

      if (!notifications || !Array.isArray(notifications)) {
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }

      const userStatus = await supabase(
        'GET',
        `user_notifications?user_id=eq.${user_id}&select=notification_id,is_read,is_pinned`
      );

      const statusMap: { [key: string]: { is_read: boolean; is_pinned: boolean } } = {};
      if (Array.isArray(userStatus)) {
        userStatus.forEach((s: any) => {
          statusMap[s.notification_id] = { is_read: s.is_read, is_pinned: s.is_pinned };
        });
      }

      const merged = notifications.map((n: any) => ({
        ...n,
        is_read: statusMap[n.id]?.is_read || false,
        is_pinned: statusMap[n.id]?.is_pinned || false,
      }));

      const unread = merged.filter((n: any) => !n.is_read).length;

      return NextResponse.json({ success: true, notifications: merged, unread }, { status: 200 });
    }

    // ── MARK AS READ ──────────────────────────────────────
    if (action === 'mark_read') {
      if (!user_id || !notification_id) {
        return NextResponse.json(
          { error: 'user_id and notification_id required' },
          { status: 400 }
        );
      }

      await supabase('POST', 'user_notifications', {
        user_id,
        notification_id,
        is_read: true,
      });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── MARK ALL READ ─────────────────────────────────────
    if (action === 'mark_all_read') {
      if (!user_id) {
        return NextResponse.json({ error: 'user_id required' }, { status: 400 });
      }

      const notifications = await supabase('GET', `notifications?select=id`);
      if (Array.isArray(notifications)) {
        for (const n of notifications) {
          await supabase('POST', 'user_notifications', {
            user_id,
            notification_id: n.id,
            is_read: true,
          });
        }
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── TOGGLE PIN ────────────────────────────────────────
    if (action === 'toggle_pin') {
      if (!user_id || !notification_id) {
        return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
      }

      const existing = await supabase(
        'GET',
        `user_notifications?user_id=eq.${user_id}&notification_id=eq.${notification_id}&select=is_pinned`
      );

      const currentlyPinned = existing && Array.isArray(existing) && existing[0]?.is_pinned;

      await supabase('POST', 'user_notifications', {
        user_id,
        notification_id,
        is_pinned: !currentlyPinned,
        is_read: true,
      });

      return NextResponse.json(
        { success: true, is_pinned: !currentlyPinned },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}