export {}

declare global {
  interface Window {
    electronAPI?: {
      quit: () => void
    }
  }
}
