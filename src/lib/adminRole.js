/**
 * Papéis do back-office (`/admin`).
 *
 * 1) Preferido / fiável: emails em VITE_AVISOS_EMAILS (lista separada por vírgulas)
 * 2) Opcional: app_metadata.role = "avisos" | "admin" (se conseguires escrever em auth.users)
 *
 * Sem match → admin (a tua conta continua com acesso total).
 */

export const ADMIN_ROLES = {
  admin: 'admin',
  avisos: 'avisos',
}

/** Separadores que cada papel pode ver. */
export const TABS_BY_ROLE = {
  admin: ['events', 'businesses', 'feedback', 'map', 'notify', 'analytics'],
  avisos: ['notify'],
}

export function parseAvisosEmails(raw = import.meta.env.VITE_AVISOS_EMAILS) {
  return String(raw || '')
    .split(/[,;\s]+/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
}

export function resolveAdminRole(user, avisosEmails = parseAvisosEmails()) {
  const email = String(user?.email || '')
    .trim()
    .toLowerCase()
  if (email && avisosEmails.includes(email)) {
    return ADMIN_ROLES.avisos
  }

  const raw =
    user?.app_metadata?.role ||
    user?.user_metadata?.role ||
    ''
  const role = String(raw).trim().toLowerCase()
  if (role === ADMIN_ROLES.avisos || role === 'notify' || role === 'governance') {
    return ADMIN_ROLES.avisos
  }
  return ADMIN_ROLES.admin
}

export function tabsForRole(role) {
  return TABS_BY_ROLE[role] || TABS_BY_ROLE.admin
}

export function canAccessAdminTab(role, tab) {
  return tabsForRole(role).includes(tab)
}

export function defaultAdminTab(role) {
  const tabs = tabsForRole(role)
  return tabs.includes('events') ? 'events' : tabs[0] || 'notify'
}
