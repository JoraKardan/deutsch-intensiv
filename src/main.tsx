import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { registerServiceWorker } from './lib/offline'
import { startKeepAwake } from './lib/wakeLock'
import { startTheme } from './lib/theme'
import './styles.css'

startTheme()
registerServiceWorker()
startKeepAwake()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
