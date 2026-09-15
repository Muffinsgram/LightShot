'use client'

import { useTransition } from 'react'
import { deleteScreenshot } from './actions'

export function DeleteButton({ id, storagePath }: { id: string, storagePath: string }) {
  const [isPending, startTransition] = useTransition()

  return (
    <button
      onClick={() => {
        if (confirm('Are you sure you want to delete this screenshot?')) {
          startTransition(async () => {
            await deleteScreenshot(id, storagePath)
          })
        }
      }}
      disabled={isPending}
      className="flex-1 text-center px-3 py-1.5 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40 disabled:opacity-50"
    >
      {isPending ? 'Deleting...' : 'Delete'}
    </button>
  )
}
