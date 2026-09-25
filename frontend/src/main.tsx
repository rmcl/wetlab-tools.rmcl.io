import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { FluentProvider, createLightTheme, type BrandVariants } from '@fluentui/react-components'
import { App } from './app/App'
import './index.css'

const laboratoryBrand: BrandVariants = {
  10: '#020504', 20: '#09201b', 30: '#0b342b', 40: '#0b463a', 50: '#0a5949',
  60: '#086c58', 70: '#0b8068', 80: '#16947a', 90: '#2aa88c', 100: '#45bba0',
  110: '#63cbb2', 120: '#82dac3', 130: '#a1e7d3', 140: '#bff2e2', 150: '#ddfaef', 160: '#f1fdf8',
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FluentProvider theme={createLightTheme(laboratoryBrand)}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </FluentProvider>
  </StrictMode>,
)

