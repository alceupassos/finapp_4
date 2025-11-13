type Role = 'admin'|'franqueado'|'cliente'|'personalizado'

export async function validateMockLogin(email: string, password: string) {
  const res = await fetch('/dados/mock_users.json')
  const users = await res.json()
  const u = users.find((x: any) => x.email === email && x.password === password)
  // modo demo: aceita senha "fin-demo" sem checar a senha do arquivo
  const demoUser = users.find((x: any) => x.email === email)
  const isDemo = password === 'fin-demo'
  if (!u && !isDemo) return null
  const base = isDemo ? demoUser : u
  if (!base) return null
  const session = { email: base.email, name: base.name, role: base.role as Role, defaultCompany: base.defaultCompany, mode: isDemo ? 'demo' : 'active' }
  localStorage.setItem('session_user', JSON.stringify(session))
  return session
}

export function getSession() {
  const raw = localStorage.getItem('session_user')
  return raw ? JSON.parse(raw) : null
}

export function logout() {
  localStorage.removeItem('session_user')
}
