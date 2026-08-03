import { describe, expect, it } from 'vitest'
import {
  canAccessAdminTab,
  defaultAdminTab,
  parseAvisosEmails,
  resolveAdminRole,
  tabsForRole,
} from './adminRole.js'

describe('adminRole', () => {
  it('defaults to full admin when role missing', () => {
    expect(resolveAdminRole({}, [])).toBe('admin')
    expect(resolveAdminRole({ app_metadata: {} }, [])).toBe('admin')
    expect(resolveAdminRole(null, [])).toBe('admin')
  })

  it('marks emails from allowlist as avisos', () => {
    expect(
      resolveAdminRole(
        { email: 'ze@exemplo.com' },
        parseAvisosEmails('ze@exemplo.com, outro@x.pt'),
      ),
    ).toBe('avisos')
    expect(
      resolveAdminRole({ email: 'admin@exemplo.com' }, ['ze@exemplo.com']),
    ).toBe('admin')
  })

  it('resolves avisos / aliases from metadata', () => {
    expect(
      resolveAdminRole({ app_metadata: { role: 'avisos' } }, []),
    ).toBe('avisos')
    expect(
      resolveAdminRole({ app_metadata: { role: 'notify' } }, []),
    ).toBe('avisos')
    expect(
      resolveAdminRole({ app_metadata: { role: 'governance' } }, []),
    ).toBe('avisos')
  })

  it('avisos only sees notify tab', () => {
    expect(tabsForRole('avisos')).toEqual(['notify'])
    expect(canAccessAdminTab('avisos', 'notify')).toBe(true)
    expect(canAccessAdminTab('avisos', 'events')).toBe(false)
    expect(defaultAdminTab('avisos')).toBe('notify')
  })

  it('admin sees all tabs', () => {
    expect(canAccessAdminTab('admin', 'analytics')).toBe(true)
    expect(defaultAdminTab('admin')).toBe('events')
  })
})
