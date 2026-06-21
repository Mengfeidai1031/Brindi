import { API_URL } from '@/config/app';
import { type PublicUser, useAuthStore } from '@/stores/auth-store';

/** Error normalizado de la API. status 0 = fallo de red. */
export interface ApiError {
  status: number;
  message: string;
}

interface AuthResponse {
  user: PublicUser;
  accessToken: string;
}

interface FetchOptions extends Omit<RequestInit, 'headers'> {
  /** Si true (por defecto) adjunta el Bearer y reintenta tras refrescar ante un 401. */
  auth?: boolean;
  retry?: boolean;
  headers?: Record<string, string>;
}

/** Llama a /auth/refresh con la cookie httpOnly y actualiza la sesión. */
async function rawRefresh(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) return false;
    const data = (await res.json()) as AuthResponse;
    useAuthStore.getState().setSession(data.user, data.accessToken);
    return true;
  } catch {
    return false;
  }
}

// Single-flight: varias peticiones que reciban 401 a la vez comparten un único refresco.
let refreshPromise: Promise<boolean> | null = null;
function refreshOnce(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = rawRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

async function apiFetch<T>(path: string, options: FetchOptions = {}): Promise<T> {
  const { auth = true, retry = true, headers = {}, ...rest } = options;
  const token = useAuthStore.getState().accessToken;

  const finalHeaders: Record<string, string> = { 'Content-Type': 'application/json', ...headers };
  if (auth && token) {
    finalHeaders.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { ...rest, headers: finalHeaders, credentials: 'include' });
  } catch {
    throw { status: 0, message: 'network' } as ApiError;
  }

  // Access token caducado: refresca una vez y reintenta la petición original.
  if (res.status === 401 && auth && retry) {
    const ok = await refreshOnce();
    if (ok) {
      return apiFetch<T>(path, { ...options, retry: false });
    }
    useAuthStore.getState().clear();
    throw { status: 401, message: 'unauthorized' } as ApiError;
  }

  if (!res.ok) {
    let message = 'error';
    try {
      const body = (await res.json()) as { message?: string | string[] };
      message = Array.isArray(body.message) ? body.message[0] : (body.message ?? message);
    } catch {
      // respuesta sin cuerpo JSON
    }
    throw { status: res.status, message } as ApiError;
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

// ---- Operaciones de autenticación ----

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  locale: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export async function register(input: RegisterInput): Promise<void> {
  const data = await apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setSession(data.user, data.accessToken);
}

export async function login(input: LoginInput): Promise<void> {
  const data = await apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    auth: false,
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setSession(data.user, data.accessToken);
}

export async function logout(): Promise<void> {
  try {
    await apiFetch<{ success: boolean }>('/auth/logout', { method: 'POST', auth: false });
  } finally {
    useAuthStore.getState().clear();
  }
}

/** Rehidrata la sesión al cargar la app (cookie httpOnly -> nuevo access token). */
export async function bootstrapAuth(): Promise<void> {
  const ok = await refreshOnce();
  if (!ok) {
    useAuthStore.getState().setUnauthenticated();
  }
}

// ---- Perfil ----

export interface UpdateProfileInput {
  name?: string;
  locale?: string;
  paymentLink?: string | null;
}

export async function updateMe(input: UpdateProfileInput): Promise<PublicUser> {
  const user = await apiFetch<PublicUser>('/users/me', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  useAuthStore.getState().setUser(user);
  return user;
}

export async function deleteMe(): Promise<void> {
  await apiFetch<void>('/users/me', { method: 'DELETE' });
  useAuthStore.getState().clear();
}
