const API_BASE = String(import.meta.env.VITE_API_PROXY_BASE || 'http://localhost:3004/api').replace(/\/+$|\/$/g, '');

interface ApiResponse<T> {
  success: boolean;
  error?: string;
  message?: string;
}

const parseJson = async (response: Response) => {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (err) {
    return { error: 'Failed to parse server response' };
  }
};

export const postJson = async <T = any>(path: string, body: any): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const payload = await parseJson(response) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed: ${response.statusText}`);
  }

  return payload as T;
};

export const getJson = async <T = any>(path: string): Promise<T> => {
  const url = `${API_BASE}${path}`;
  const response = await fetch(url, { method: 'GET' });
  const payload = await parseJson(response) as ApiResponse<T>;

  if (!response.ok) {
    throw new Error(payload.error || payload.message || `Request failed: ${response.statusText}`);
  }

  return payload as T;
};

export default {
  API_BASE,
  postJson,
  getJson,
};
