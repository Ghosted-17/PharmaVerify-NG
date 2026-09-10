import { NextResponse } from 'next/server';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

async function supabase(method: string, path: string, body?: any) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      apikey: SUPABASE_KEY || '',
      Authorization: `Bearer ${SUPABASE_KEY || ''}`,
      Prefer: method === 'POST' ? 'return=representation' : '',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  return { ok: res.ok, status: res.status, data };
}

function publicUser(user: any) {
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
    avatar: user.avatar,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    // ── SIGN UP ──────────────────────────────────────────────
    if (action === 'signup') {
      const { firstname, lastname, username, email, phone, pin_hash, dob, age, occupation, state } = body;
      if (!firstname || !username || !email || !phone || !pin_hash) {
        return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
      }

      const checkUser = await supabase('GET', `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=id`);
      if (checkUser.data && checkUser.data.length > 0) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }

      const checkEmail = await supabase('GET', `users?email=eq.${encodeURIComponent(email.toLowerCase())}&select=id`);
      if (checkEmail.data && checkEmail.data.length > 0) {
        return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
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
        state: state || null,
      });

      if (!insert.ok) {
        return NextResponse.json({ error: insert.data?.message || 'Failed to create account' }, { status: 500 });
      }

      const user = Array.isArray(insert.data) ? insert.data[0] : insert.data;
      return NextResponse.json({ success: true, user: publicUser(user) }, { status: 200 });
    }

    // ── SIGN IN ──────────────────────────────────────────────
    if (action === 'signin') {
      const { username, pin_hash } = body;
      if (!username || !pin_hash) {
        return NextResponse.json({ error: 'Username and PIN required' }, { status: 400 });
      }

      const result = await supabase('GET', `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=*`);
      if (!result.ok || !result.data || result.data.length === 0) {
        return NextResponse.json({ error: 'No account found with that username' }, { status: 404 });
      }

      const user = result.data[0];
      if (user.pin_hash !== pin_hash) {
        return NextResponse.json({ error: 'Incorrect PIN' }, { status: 401 });
      }

      return NextResponse.json({ success: true, user: publicUser(user) }, { status: 200 });
    }

    // ── LOOKUP ───────────────────────────────────────────────
    if (action === 'lookup') {
      const { username } = body;
      const result = await supabase(
        'GET',
        `users?username=eq.${encodeURIComponent(username.toLowerCase())}&select=firstname,lastname,username`
      );
      if (!result.ok || !result.data || result.data.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ found: true, user: result.data[0] }, { status: 200 });
    }

    // ── GET PROFILE ──────────────────────────────────────────
    if (action === 'get_profile') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const result = await supabase(
        'GET',
        `users?id=eq.${id}&select=id,firstname,lastname,username,email,phone,age,occupation,state,city,avatar,dob`
      );
      if (!result.ok || !result.data || result.data.length === 0) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, profile: result.data[0] }, { status: 200 });
    }

    // ── UPDATE PROFILE ───────────────────────────────────────
    if (action === 'update') {
      const { id, firstname, lastname, phone, occupation, state, city, email, age, avatar } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const update: any = { firstname, lastname, phone, occupation, state, city, email, age };
      if (avatar !== undefined) update.avatar = avatar;

      const result = await supabase('PATCH', `users?id=eq.${id}`, update);
      if (!result.ok) return NextResponse.json({ error: 'Update failed' }, { status: 500 });
      return NextResponse.json({ success: true }, { status: 200 });
    }

    // ── DELETE ACCOUNT ───────────────────────────────────────
    if (action === 'delete_account') {
      const { id } = body;
      if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

      const delHistory = await supabase('DELETE', `scan_history?user_id=eq.${id}`);
      if (!delHistory.ok) return NextResponse.json({ error: 'Failed to delete scan history' }, { status: 500 });

      const delNotifs = await supabase('DELETE', `user_notifications?user_id=eq.${id}`);
      if (!delNotifs.ok) return NextResponse.json({ error: 'Failed to delete notification data' }, { status: 500 });

      const delUser = await supabase('DELETE', `users?id=eq.${id}`);
      if (!delUser.ok) return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}