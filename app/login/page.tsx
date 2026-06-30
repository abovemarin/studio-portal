import { Card, CardContent, CardHeader } from '@/components/card'
import { LoginForm } from './login-form'

const ERROR_MESSAGES: Record<string, string> = {
  'invalid-link': 'That sign-in link is invalid or has expired. Request a new one below.',
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const initialError = (error && ERROR_MESSAGES[error]) ?? null

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-bg px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="mb-3 font-sans text-xs uppercase tracking-widest text-text-muted">
            The Scaler Studio
          </p>
          <h1 className="font-display text-5xl font-bold uppercase leading-none tracking-tight text-text">
            Studio Portal
          </h1>
        </div>

        <Card>
          <CardHeader>
            <h2 className="font-sans text-sm font-semibold text-text">Sign in</h2>
            <p className="mt-1 font-sans text-sm text-text-secondary">
              Enter your email and we&apos;ll send you a secure sign-in link.
            </p>
          </CardHeader>
          <CardContent>
            <LoginForm initialError={initialError} />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
