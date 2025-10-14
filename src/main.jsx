import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App.jsx'
import '../styles.css'

// Dynamically inject external styles and scripts that were previously in index.html
function injectExternalResources() {
  // Google Fonts
  const gf = document.createElement('link')
  gf.rel = 'stylesheet'
  gf.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
  document.head.appendChild(gf)

  // Font Awesome
  const fa = document.createElement('link')
  fa.rel = 'stylesheet'
  fa.href = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
  document.head.appendChild(fa)

  // Legacy script with global functions
  const legacy = document.createElement('script')
  legacy.src = '/script.js'
  legacy.onload = () => {
    // Trigger DOMContentLoaded handlers defined in script.js
    const evt = new Event('DOMContentLoaded')
    document.dispatchEvent(evt)
  }
  document.body.appendChild(legacy)
}

injectExternalResources()

const root = createRoot(document.getElementById('root'))
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
)
