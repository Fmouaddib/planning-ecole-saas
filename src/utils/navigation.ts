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
