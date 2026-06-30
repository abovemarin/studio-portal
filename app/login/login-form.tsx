'use client'

import { useState, type FormEvent } from 'react'
import { MailCheck } from 'lucide-react'
import { Button } from '@/components/button'
import { Input } from '@/components/input'

type Status = 'idle' | 'submitting' | 'sent'

export function LoginForm({ initialError }: { initialError: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(initialError)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('submitting')
    setError(null)

    try {
      const res = await fetch('/api/auth/request-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const json = await res.json().catch(() => null)

      if (!res.ok || !json?.ok) {
        setError(json?.error?.message ?? 'Something went wrong. Please try again.')
        setStatus('idle')
        return
      }

      setStatus('sent')
    } catch {
      setError('Network error. Please try again.')
      setStatus('idle')
    }
  }

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-surface-raised text-accent">
          <MailCheck size={22} strokeWidth={1.5} aria-hidden />
        </div>
        <div className="flex flex-col gap-1.5">
          <h2 className="font-sans text-base font-semibold text-text">Check your inbox</h2>
          <p className="font-sans text-sm text-text-secondary">
            If <span className="text-text">{email}</span> has an account, a sign-in link is on
            its way. It expires shortly and can only be used once.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setStatus('idle')
            setEmail('')
          }}
        >
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
      <Input
        label="Email address"
        type="email"
        name="email"
        autoComplete="email"
        placeholder="you@example.com"
        required
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={error ?? undefined}
        disabled={status === 'submitting'}
      />
      <Button type="submit" variant="primary" size="lg" disabled={status === 'submitting'}>
        {status === 'submitting' ? 'Sending link…' : 'Send sign-in link'}
      </Button>
    </form>
  )
}
