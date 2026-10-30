import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { ConfigErrorScreen } from './components/ui.jsx'
import { configError } from './lib/supabase.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {configError ? (
      <ConfigErrorScreen message={configError} />
    ) : (
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    )}
  </StrictMode>,
)