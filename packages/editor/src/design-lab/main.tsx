import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { DesignLab } from './DesignLab.js'
import '../ui/design-system/index.css'
import './design-lab.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <DesignLab />
  </StrictMode>,
)
