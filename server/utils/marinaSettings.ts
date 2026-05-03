export interface MarinaContactSettings {
  email?: string
  address?: string
}

export interface SelfServicePassantSettings {
  enabled: boolean
  requirePayment: boolean
  allowBerthPick: boolean
}

export interface SelfServiceAbsenceSettings {
  enabled: boolean
  subletCreditPercent?: number
}

export interface SelfServiceWaitlistSettings {
  enabled: boolean
  applicationFee?: number
  requireConsent: boolean
}

export interface SelfServiceSettings {
  passant: SelfServicePassantSettings
  absence: SelfServiceAbsenceSettings
  waitlist: SelfServiceWaitlistSettings
}

export interface MarinaSettings {
  email?: string
  address?: string
  selfService?: SelfServiceSettings
}

const DEFAULT_SELF_SERVICE: SelfServiceSettings = {
  passant: { enabled: false, requirePayment: false, allowBerthPick: false },
  absence: { enabled: false },
  waitlist: { enabled: false, requireConsent: true }
}

export function parseSettings(raw: unknown): MarinaSettings {
  if (!raw || typeof raw !== 'object') return {}
  return raw as MarinaSettings
}

export function getSelfService(raw: unknown): SelfServiceSettings {
  const parsed = parseSettings(raw)
  const ss = parsed.selfService
  if (!ss) return DEFAULT_SELF_SERVICE
  return {
    passant: { ...DEFAULT_SELF_SERVICE.passant, ...(ss.passant ?? {}) },
    absence: { ...DEFAULT_SELF_SERVICE.absence, ...(ss.absence ?? {}) },
    waitlist: { ...DEFAULT_SELF_SERVICE.waitlist, ...(ss.waitlist ?? {}) }
  }
}

export function isLevelEnabled(
  raw: unknown,
  level: keyof SelfServiceSettings
): boolean {
  return getSelfService(raw)[level].enabled === true
}
