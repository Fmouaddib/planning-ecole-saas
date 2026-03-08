/**
 * Lightweight app navigation utility.
 * Dispatches a custom event that App.tsx listens to for setting currentPath.
 * Allows any component to navigate without needing onNavigate prop.
 */

export function navigateTo(path: string) {
  window.dispatchEvent(new CustomEvent('app-navigate', { detail: path }))
}

/**
 * Navigate to chat and auto-open a DM with a specific user.
 */
export function navigateToDM(userId: string) {
  sessionStorage.setItem('chat_dm_target', userId)
  navigateTo('/chat')
}

/**
 * Navigate to the calendar, jump to the session's week, and open its detail popup.
 */
export function navigateToSession(sessionId: string, sessionDate: string | Date) {
  const dateStr = typeof sessionDate === 'string' ? sessionDate : sessionDate.toISOString()
  sessionStorage.setItem('planning-target-date', dateStr)
  sessionStorage.setItem('planning-target-session', sessionId)
  navigateTo('/planning')
}
