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

function publicUser(user) {
  return {
    id: user.id,
    firstname: user.firstname,
    lastname: user.lastname,
    username: user.username,
    email: user.email,
    phone: user.phone,
    age: user.age,
    occupation: user.occupation,
    state: user.state,
    city: user.city,
    dob: user.dob,
    avatar: user.avatar
  };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { action } = req.body;

  // ── SIGN UP ──────────────────────────────────────────────
  if (action === 'signup') {
    const { firstname, lastname, username, email, phone, pin_hash, dob, age, occupation, state } = req.body;
    if (!firstname || !username || !email || !phone || !pin_hash) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const checkUser = await supabase('GET', `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=id`);
    if (checkUser.data && checkUser.data.length > 0) {
      return res.status(409).json({ error: 'Username already taken' });
    }

    const checkEmail = await supabase('GET', `users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id`);
    if (checkEmail.data && checkEmail.data.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const insert = await supabase('POST', 'users', {
      firstname,
      lastname: lastname || '',
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      phone,
      pin_hash,
      dob: dob || null,
      age: age || null,
      occupation: occupation || null,
      state: state || null
    });

    if (!insert.ok) {
      return res.status(500).json({ error: insert.data?.message || 'Failed to create account' });
    }

    const user = Array.isArray(insert.data) ? insert.data[0] : insert.data;
    return res.status(200).json({ success: true, user: publicUser(user) });
  }

  // ── SIGN IN ──────────────────────────────────────────────
  if (action === 'signin') {
    const { username, pin_hash } = req.body;
    if (!username || !pin_hash) return res.status(400).json({ error: 'Username and PIN required' });

    const result = await supabase('GET', `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=*`);
    if (!result.ok || !result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'No account found with that username' });
    }

    const user = result.data[0];
    if (user.pin_hash !== pin_hash) {
      return res.status(401).json({ error: 'Incorrect PIN' });
    }

    return res.status(200).json({ success: true, user: publicUser(user) });
  }

  // ── LOOKUP ───────────────────────────────────────────────
  if (action === 'lookup') {
    const { username } = req.body;
    const result = await supabase('GET', `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=firstname,lastname,username`);
    if (!result.ok || !result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ found: true, user: result.data[0] });
  }

  // ── GET PROFILE (used by dashboard on load, to sync across devices) ──
  if (action === 'get_profile') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const result = await supabase('GET', `users?id=eq.${id}&select=id,firstname,lastname,username,email,phone,age,occupation,state,city,avatar,dob`);
    if (!result.ok || !result.data || result.data.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.status(200).json({ success: true, profile: result.data[0] });
  }

  // ── UPDATE PROFILE ───────────────────────────────────────
  if (action === 'update') {
    const { id, firstname, lastname, phone, occupation, state, city, email, age, avatar } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    const update = { firstname, lastname, phone, occupation, state, city, email, age };
    if (avatar !== undefined) update.avatar = avatar;

    const result = await supabase('PATCH', `users?id=eq.${id}`, update);
    if (!result.ok) return res.status(500).json({ error: 'Update failed' });
    return res.status(200).json({ success: true });
  }

  // ── DELETE ACCOUNT ───────────────────────────────────────
  if (action === 'delete_account') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id required' });

    // Remove dependent rows first to avoid foreign-key violations
    const delHistory = await supabase('DELETE', `scan_history?user_id=eq.${id}`);
    if (!delHistory.ok) return res.status(500).json({ error: 'Failed to delete scan history' });

    const delNotifs = await supabase('DELETE', `user_notifications?user_id=eq.${id}`);
    if (!delNotifs.ok) return res.status(500).json({ error: 'Failed to delete notification data' });

    const delUser = await supabase('DELETE', `users?id=eq.${id}`);
    if (!delUser.ok) return res.status(500).json({ error: 'Failed to delete account' });

    return res.status(200).json({ success: true });
  }

  return res.status(400).json({ error: 'Unknown action' });
}