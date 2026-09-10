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
  return text ? JSON.parse(text) : null;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action, user_id, notification_id } = req.body;

  // ── GET ALL NOTIFICATIONS WITH READ STATUS ────────────
  if (action === 'get') {
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    // Get all notifications
    const notifications = await supabase('GET',
      `notifications?order=published_at.desc&limit=50&select=*`
    );

    if (!notifications) return res.status(500).json({ error: 'Failed to fetch notifications' });

    // Get user's read status
    const userStatus = await supabase('GET',
      `user_notifications?user_id=eq.${user_id}&select=notification_id,is_read,is_pinned`
    );

    const statusMap = {};
    if (userStatus) {
      userStatus.forEach(s => {
        statusMap[s.notification_id] = { is_read: s.is_read, is_pinned: s.is_pinned };
      });
    }

    // Merge
    const merged = notifications.map(n => ({
      ...n,
      is_read: statusMap[n.id]?.is_read || false,
      is_pinned: statusMap[n.id]?.is_pinned || false
    }));

    const unread = merged.filter(n => !n.is_read).length;

    return res.status(200).json({ success: true, notifications: merged, unread });
  }

  // ── MARK AS READ ──────────────────────────────────────
  if (action === 'mark_read') {
    if (!user_id || !notification_id) return res.status(400).json({ error: 'user_id and notification_id required' });

    // Upsert
    await supabase('POST', 'user_notifications', {
      user_id, notification_id, is_read: true
    });

    return res.status(200).json({ success: true });
  }

  // ── MARK ALL READ ─────────────────────────────────────
  if (action === 'mark_all_read') {
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const notifications = await supabase('GET', `notifications?select=id`);
    if (notifications) {
      for (const n of notifications) {
        await supabase('POST', 'user_notifications', {
          user_id, notification_id: n.id, is_read: true
        });
      }
    }

    return res.status(200).json({ success: true });
  }

  // ── TOGGLE PIN ────────────────────────────────────────
  if (action === 'toggle_pin') {
    if (!user_id || !notification_id) return res.status(400).json({ error: 'Missing fields' });

    const existing = await supabase('GET',
      `user_notifications?user_id=eq.${user_id}&notification_id=eq.${notification_id}&select=is_pinned`
    );

    const currentlyPinned = existing && existing[0]?.is_pinned;

    await supabase('POST', 'user_notifications', {
      user_id, notification_id, is_pinned: !currentlyPinned, is_read: true
    });

    return res.status(200).json({ success: true, is_pinned: !currentlyPinned });
  }

  return res.status(400).json({ error: 'Unknown action' });
}
