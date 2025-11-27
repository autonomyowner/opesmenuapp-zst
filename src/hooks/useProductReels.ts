import { useState, useEffect, useCallback } from "react"

import {
  ProductReel,
  fetchProductReels,
  subscribeToProductReels,
  fetchProductById,
  ProductWithImage,
} from "@/services/supabase/productService"

interface UseProductReelsOptions {
  enabled?: boolean
  limit?: number
}

interface UseProductReelsReturn {
  reels: ProductReel[]
  isLoading: boolean
  error: string | null
  refresh: () => Promise<void>
  getProductDetails: (productId: string) => Promise<ProductWithImage | null>
}

export const useProductReels = (options: UseProductReelsOptions = {}): UseProductReelsReturn => {
  const { enabled = true, limit = 20 } = options

  const [reels, setReels] = useState<ProductReel[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadReels = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }

    try {
      setIsLoading(true)
      setError(null)
      const data = await fetchProductReels(limit)
      setReels(data)
    } catch (err) {
      console.error("Error loading product reels:", err)
      setError("Failed to load reels")
    } finally {
      setIsLoading(false)
    }
  }, [enabled, limit])

  // Initial load
  useEffect(() => {
    loadReels()
  }, [loadReels])

  // Real-time subscription
  useEffect(() => {
    if (!enabled) return

    const subscription = subscribeToProductReels((payload) => {
      console.log("Product reel update:", payload.eventType)

      if (payload.eventType === "INSERT") {
        // Reload to get full data with joins
        loadReels()
      } else if (payload.eventType === "DELETE") {
        setReels((prev) => prev.filter((reel) => reel.id !== payload.old.id))
      } else if (payload.eventType === "UPDATE") {
        // Reload to get updated data
        loadReels()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [enabled, loadReels])

  const refresh = useCallback(async () => {
    await loadReels()
  }, [loadReels])

  const getProductDetails = useCallback(async (productId: string) => {
    return fetchProductById(productId)
  }, [])

  return {
    reels,
    isLoading,
    error,
    refresh,
    getProductDetails,
  }
}
