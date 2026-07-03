'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/button'
import { logError } from '@/lib/log'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    logError('admin', error)
  }, [error])

  return (
    <main className="mx-auto max-w-4xl px-6 py-14">
      <EmptyState
        icon={<AlertTriangle size={20} strokeWidth={1.5} />}
        title="Something went wrong"
        description="We couldn't load this page. Please try again."
        action={
          <Button variant="primary" size="sm" onClick={reset}>
            Try again
          </Button>
        }
      />
    </main>
  )
}
