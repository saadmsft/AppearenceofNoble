import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/noto-naskh-arabic/arabic-400.css'
import '@fontsource/noto-naskh-arabic/arabic-600.css'
import '@fontsource/noto-nastaliq-urdu/arabic-400.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
