const STORAGE_KEY = 'winfo-auth-session-v1'

function parseUsers() {
  const raw = import.meta.env.VITE_AUTH_USERS
  if (raw) {
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed
          .map((u) => ({
            email: String(u.email || '')
              .trim()
              .toLowerCase(),
            password: String(u.password || ''),
            name: String(u.name || u.email || '').trim(),
          }))
          .filter((u) => u.email && u.password)
      }
    } catch {
      /* fall through */
    }
  }

  const email = String(import.meta.env.VITE_AUTH_EMAIL || '')
    .trim()
    .toLowerCase()
  const password = String(import.meta.env.VITE_AUTH_PASSWORD || '')
  const name = String(import.meta.env.VITE_AUTH_NAME || email).trim()

  if (email && password) {
    return [{ email, password, name }]
  }

  // Dev-friendly defaults until env is configured
  return [
    {
      email: 'admin@winfosolutions.com',
      password: 'Winfo@123',
      name: 'Admin',
    },
  ]
}

export function getConfiguredUsers() {
  return parseUsers().map(({ email, name }) => ({ email, name }))
}

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const session = JSON.parse(raw)
    if (!session?.email) return null
    return session
  } catch {
    return null
  }
}

export function saveSession(session) {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function clearSession() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export function authenticate(email, password) {
  const normalized = String(email || '')
    .trim()
    .toLowerCase()
  const pass = String(password || '')
  const user = parseUsers().find(
    (u) => u.email === normalized && u.password === pass,
  )
  if (!user) {
    return { ok: false, error: 'Invalid email or password' }
  }
  const session = {
    email: user.email,
    name: user.name,
    signedInAt: new Date().toISOString(),
  }
  saveSession(session)
  return { ok: true, session }
}
