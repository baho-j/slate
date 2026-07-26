import { describe, expect, it } from 'vitest'
import type { UserRole } from '@/features/auth/types'
import { canAccess, homePathFor, navItems, navItemsFor } from './nav-items'

const roles: UserRole[] = ['super_admin', 'hr_manager', 'recruiter', 'interviewer', 'candidate']

describe('navItemsFor', () => {
  it.each([
    ['super_admin', ['Dashboard', 'Jobs', 'Candidates', 'Interviews', 'Settings']],
    ['hr_manager', ['Dashboard', 'Jobs', 'Candidates', 'Interviews', 'Settings']],
    ['recruiter', ['Dashboard', 'Jobs', 'Candidates', 'Interviews']],
    ['interviewer', ['Dashboard', 'Interviews']],
    ['candidate', ['My Applications']],
  ] as const)('gives %s exactly the expected sections', (role, expected) => {
    expect(navItemsFor(role).map((item) => item.label)).toEqual(expected)
  })

  it('gives every role at least one destination', () => {
    for (const role of roles) {
      expect(navItemsFor(role).length).toBeGreaterThan(0)
    }
  })

  it('keeps the candidate section away from staff and vice versa', () => {
    expect(navItemsFor('candidate').map((i) => i.to)).toEqual(['/applications'])

    for (const role of roles.filter((r) => r !== 'candidate')) {
      expect(navItemsFor(role).map((i) => i.to)).not.toContain('/applications')
    }
  })
})

describe('canAccess', () => {
  it('agrees with the nav for every role and item', () => {
    for (const role of roles) {
      const visible = navItemsFor(role).map((item) => item.to)

      for (const { to } of navItems) {
        expect(canAccess(role, to)).toBe(visible.includes(to))
      }
    }
  })

  it('denies an unknown path rather than defaulting open', () => {
    expect(canAccess('super_admin', '/not-a-route')).toBe(false)
  })
})

describe('homePathFor', () => {
  it('lands each role somewhere it is allowed to be', () => {
    for (const role of roles) {
      expect(canAccess(role, homePathFor(role))).toBe(true)
    }
  })

  it('sends a candidate to their applications, not the dashboard', () => {
    expect(homePathFor('candidate')).toBe('/applications')
  })
})
