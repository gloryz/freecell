const KEY = 'freecell-settings'

export interface Settings {
  autoMoveMode: 'single' | 'double'
}

const defaults: Settings = { autoMoveMode: 'single' }

export function getSettings(): Settings {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) ?? '{}') }
  } catch {
    return { ...defaults }
  }
}

export function saveSettings(patch: Partial<Settings>): Settings {
  const next = { ...getSettings(), ...patch }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}
