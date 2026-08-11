import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react'
import App from './App.jsx'
import LoginPage from './components/LoginPage.jsx'
import './styles/app.css'

const publishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function MissingClerkKey() {
  return (
    <div className="login-shell">
      <div className="login-panel setup-panel">
        <img
          src={`${import.meta.env.BASE_URL}winfo-logo.png`}
          alt="Winfo Solutions"
        />
        <h1>Clerk setup required</h1>
        <p>
          Create a free Clerk app at{' '}
          <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer">
            dashboard.clerk.com
          </a>
          , enable Email login, then add your publishable key.
        </p>
        <ol>
          <li>
            Local: create <code>.env.local</code> with{' '}
            <code>VITE_CLERK_PUBLISHABLE_KEY=pk_test_...</code>
          </li>
          <li>
            GitHub Pages: add repo secret{' '}
            <code>VITE_CLERK_PUBLISHABLE_KEY</code> and redeploy
          </li>
          <li>
            In Clerk → Configure → Domains, allow{' '}
            <code>https://arvindchaubey1984.github.io</code>
          </li>
        </ol>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {!publishableKey ? (
      <MissingClerkKey />
    ) : (
      <ClerkProvider
        publishableKey={publishableKey}
        afterSignOutUrl={`${import.meta.env.BASE_URL}`}
      >
        <SignedOut>
          <LoginPage />
        </SignedOut>
        <SignedIn>
          <App />
        </SignedIn>
      </ClerkProvider>
    )}
  </StrictMode>,
)
