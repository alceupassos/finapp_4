import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import { App } from './App'

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Root element not found. Make sure <div id="root"></div> exists in index.html')
}

try {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('Failed to render React app:', error)
  rootElement.innerHTML = '<div style="padding: 20px; color: red;">Erro ao carregar aplicação. Verifique o console para mais detalhes.</div>'
}
