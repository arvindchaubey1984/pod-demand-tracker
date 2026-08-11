import { SignIn } from '@clerk/clerk-react'

const clerkAppearance = {
  variables: {
    colorPrimary: '#007a93',
    colorText: '#0b2f38',
    borderRadius: '12px',
    fontFamily: 'Manrope, system-ui, sans-serif',
  },
  elements: {
    card: {
      boxShadow: '0 18px 50px rgba(4, 85, 102, 0.16)',
      border: '1px solid rgba(11, 47, 56, 0.08)',
    },
    headerTitle: {
      fontFamily: 'Sora, system-ui, sans-serif',
    },
  },
}

export default function LoginPage() {
  return (
    <div className="login-shell">
      <div className="login-panel">
        <div className="login-brand">
          <img
            src={`${import.meta.env.BASE_URL}winfo-logo.png`}
            alt="Winfo Solutions"
          />
          <h1>Data Team & Open Demand</h1>
          <p>Sign in with your email to view account team size and open demand.</p>
        </div>
        <SignIn
          routing="hash"
          appearance={clerkAppearance}
          fallbackRedirectUrl={`${import.meta.env.BASE_URL}`}
        />
      </div>
    </div>
  )
}
