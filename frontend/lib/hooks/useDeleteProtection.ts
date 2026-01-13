/**
 * Hook to prevent double-click spam on delete actions
 * 
 * Provides loading state and prevents multiple simultaneous deletions
 */
import { useState, useCallback } from 'react'

export function useDeleteProtection() {
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleDelete = useCallback(
    async <T extends { id: string }>(
      item: T,
      deleteFn: (id: string) => Promise<void>,
      onSuccess?: () => void,
      onError?: (error: any) => void
    ) => {
      // Double-click protection: prevent multiple simultaneous deletions
      if (deletingId === item.id) return

      setDeletingId(item.id)

      try {
        await deleteFn(item.id)
        onSuccess?.()
      } catch (error) {
        onError?.(error)
      } finally {
        setDeletingId(null)
      }
    },
    [deletingId]
  )

  const isDeleting = useCallback((id: string) => deletingId === id, [deletingId])

  return {
    handleDelete,
    isDeleting,
    deletingId,
  }
}

