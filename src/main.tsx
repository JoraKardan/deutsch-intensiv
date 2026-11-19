import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { registerServiceWorker } from './lib/offline'
import { startKeepAwake } from './lib/wakeLock'
import './styles.css'

registerServiceWorker()
startKeepAwake()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
