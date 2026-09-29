const BASE = '/api'; // vite proxy → http://localhost:5000

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = res.statusText;
    try {
      const body = await res.json();
      if (body?.error) msg = body.error;
    } catch { /* ignore */ }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const apiGet = <T,>(path: string): Promise<T> =>
  fetch(`${BASE}${path}`).then(handle<T>);

export const apiPost = <T,>(path: string, body: unknown): Promise<T> =>
  fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then(handle<T>);