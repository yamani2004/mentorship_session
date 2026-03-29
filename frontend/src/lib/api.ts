import { supabase } from './supabase';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session } } = await supabase.auth.getSession();
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${session?.access_token ?? ''}`,
  };
}

export const api = {
  async get(path: string) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}${path}`, { headers });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async post(path: string, body: unknown) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },

  async patch(path: string, body?: unknown) {
    const headers = await getAuthHeaders();
    const res = await fetch(`${BASE_URL}${path}`, {
      method: 'PATCH',
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) throw await res.json();
    return res.json();
  },
};
