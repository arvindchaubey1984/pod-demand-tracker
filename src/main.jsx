import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { AuthProvider, useAuth } from './auth/AuthContext.jsx'
import App from './App.jsx'
import LoginPage from './components/LoginPage.jsx'
import './styles/app.css'

function Root() {
  const { isAuthenticated } = useAuth()
  return isAuthenticated ? <App /> : <LoginPage />
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <Root />
    </AuthProvider>
  </StrictMode>,
)
