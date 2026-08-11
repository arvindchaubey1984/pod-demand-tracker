import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export default function LoginPage() {
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  function onSubmit(e) {
    e.preventDefault()
    const result = login(email, password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    setError('')
  }

  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <img
            src={`${import.meta.env.BASE_URL}winfo-logo.png`}
            alt="Winfo Solutions"
          />
          <h1>Data Team & Open Demand</h1>
          <p>Sign in with your Winfo email to continue.</p>
        </div>

        <form className="login-card" onSubmit={onSubmit}>
          <label>
            Email
            <input
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@winfosolutions.com"
              required
            />
          </label>
          <label>
            Password
            <div className="password-row">
              <input
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                className="btn btn-ghost password-toggle"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </label>

          {error ? <div className="login-error">{error}</div> : null}

          <button className="btn btn-primary login-submit" type="submit">
            Sign in
          </button>
        </form>
      </div>
    </div>
  )
}
