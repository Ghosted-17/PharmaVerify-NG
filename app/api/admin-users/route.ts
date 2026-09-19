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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'get_users') {
      const result = await supabase('GET', 'users?select=id,firstname,lastname,username,email,role,phone,created_at');
      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
      }
      return NextResponse.json({ success: true, users: result.data }, { status: 200 });
    }

    if (action === 'update_role') {
      const { user_id, role } = body;
      if (!user_id || !role) {
        return NextResponse.json({ error: 'Missing user_id or role' }, { status: 400 });
      }

      const result = await supabase('PATCH', `users?id=eq.${user_id}`, { role });
      if (!result.ok) {
        return NextResponse.json({ error: 'Failed to update user role' }, { status: 500 });
      }

      return NextResponse.json({ success: true }, { status: 200 });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}