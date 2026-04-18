import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

const redirectParam = new URLSearchParams(window.location.search).get('redirect')
if (redirectParam) {
  const basePath = (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
  const normalizedRedirect = redirectParam.startsWith('/') ? redirectParam : `/${redirectParam}`
  const target = `${basePath}${normalizedRedirect}`
  window.history.replaceState(null, '', target)
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
