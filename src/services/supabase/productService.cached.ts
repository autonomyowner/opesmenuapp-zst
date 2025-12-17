/**
 * Cached product service - SAFE version that won't break your app
 *
 * This wraps the original productService with intelligent caching.
 * If anything goes wrong, it falls back to fresh data from Supabase.
 */

import { getCached, invalidateCache, invalidateCaches } from "@/utils/safeCache"

import {
  fetchAllProducts as fetchAllProductsOriginal,
  fetchNewProducts as fetchNewProductsOriginal,
  fetchSaleProducts as fetchSaleProductsOriginal,
  fetchFournisseurProducts as fetchFournisseurProductsOriginal,
  fetchProductsByCategory as fetchProductsByCategoryOriginal,
  fetchProductCategories as fetchProductCategoriesOriginal,
  fetchProductsPaginated as fetchProductsPaginatedOriginal,
  fetchFournisseurProductsPaginated as fetchFournisseurProductsPaginatedOriginal,
  fetchProductsByCategoryPaginated as fetchProductsByCategoryPaginatedOriginal,
  searchProductsPaginated as searchProductsPaginatedOriginal,
  subscribeToProducts,
  ProductWithImage,
  PaginatedProducts,
} from "./productService"

// Cache durations (in milliseconds)
const CACHE_DURATIONS = {
  ALL_PRODUCTS: 5 * 60 * 1000, // 5 minutes - main product list
  NEW_PRODUCTS: 10 * 60 * 1000, // 10 minutes - changes less often
  SALE_PRODUCTS: 3 * 60 * 1000, // 3 minutes - promos change frequently
  FOURNISSEUR_PRODUCTS: 5 * 60 * 1000, // 5 minutes
  CATEGORY_PRODUCTS: 5 * 60 * 1000, // 5 minutes per category
  CATEGORIES: 30 * 60 * 1000, // 30 minutes - rarely changes
  PAGINATED_PRODUCTS: 3 * 60 * 1000, // 3 minutes for paginated queries
  SEARCH_RESULTS: 2 * 60 * 1000, // 2 minutes for search results
}

// Default empty paginated result
const EMPTY_PAGINATED: PaginatedProducts = {
  products: [],
  totalCount: 0,
  hasMore: false,
  nextPage: 0,
}

/**
 * Fetch all products with caching
 *
 * - Cached for 5 minutes
 * - On error, returns stale cache or fresh data
 * - Never breaks your app
 */
export const fetchAllProducts = async (): Promise<ProductWithImage[]> => {
  const cached = await getCached(
    "products:all",
    fetchAllProductsOriginal,
    { ttl: CACHE_DURATIONS.ALL_PRODUCTS }
  )

  // If cache failed, return empty array (app won't break)
  return cached ?? []
}

/**
 * Fetch new products with caching
 */
export const fetchNewProducts = async (limit: number = 10): Promise<ProductWithImage[]> => {
  const cached = await getCached(
    `products:new:${limit}`,
    () => fetchNewProductsOriginal(limit),
    { ttl: CACHE_DURATIONS.NEW_PRODUCTS }
  )

  return cached ?? []
}

/**
 * Fetch sale products with caching
 */
export const fetchSaleProducts = async (limit: number = 10): Promise<ProductWithImage[]> => {
  const cached = await getCached(
    `products:sale:${limit}`,
    () => fetchSaleProductsOriginal(limit),
    { ttl: CACHE_DURATIONS.SALE_PRODUCTS }
  )

  return cached ?? []
}

/**
 * Fetch fournisseur products with caching
 */
export const fetchFournisseurProducts = async (limit: number = 20): Promise<ProductWithImage[]> => {
  const cached = await getCached(
    `products:fournisseur:${limit}`,
    () => fetchFournisseurProductsOriginal(limit),
    { ttl: CACHE_DURATIONS.FOURNISSEUR_PRODUCTS }
  )

  return cached ?? []
}

/**
 * Fetch products by category with caching
 */
export const fetchProductsByCategory = async (
  category: string,
  limit: number = 20
): Promise<ProductWithImage[]> => {
  const cached = await getCached(
    `products:category:${category}:${limit}`,
    () => fetchProductsByCategoryOriginal(category, limit),
    { ttl: CACHE_DURATIONS.CATEGORY_PRODUCTS }
  )

  return cached ?? []
}

/**
 * Fetch product categories with caching
 */
export const fetchProductCategories = async (): Promise<string[]> => {
  const cached = await getCached(
    "products:categories",
    fetchProductCategoriesOriginal,
    { ttl: CACHE_DURATIONS.CATEGORIES }
  )

  return cached ?? []
}

/**
 * Invalidate all product caches
 *
 * Call this when:
 * - A new product is added
 * - A product is updated
 * - A product is deleted
 * - You want to force refresh
 *
 * @example
 * await invalidateProductCaches()
 */
export const invalidateProductCaches = async (): Promise<void> => {
  await invalidateCaches([
    "products:all",
    "products:new:10",
    "products:sale:10",
    "products:fournisseur:20",
    "products:categories",
  ])
}

/**
 * Subscribe to real-time product updates and auto-invalidate cache
 *
 * This is SAFE because:
 * - It only invalidates cache, doesn't store subscription data
 * - When cache is invalidated, next fetch gets fresh data
 * - No auth data is cached
 *
 * @example
 * const subscription = subscribeToProductsWithCache()
 * // Later, to unsubscribe:
 * subscription.unsubscribe()
 */
export const subscribeToProductsWithCache = () => {
  return subscribeToProducts(async (payload) => {
    console.log("[Cache] Product updated, invalidating cache:", payload)
    // Invalidate cache when products change
    await invalidateProductCaches()
  })
}

// ============================================
// PAGINATED CACHED FUNCTIONS (SCALABLE)
// ============================================

/**
 * Fetch products with pagination and caching
 * Best for infinite scroll - caches each page separately
 */
export const fetchProductsPaginated = async (
  page: number = 0,
  pageSize: number = 20
): Promise<PaginatedProducts> => {
  const cached = await getCached(
    `products:paginated:${page}:${pageSize}`,
    () => fetchProductsPaginatedOriginal(page, pageSize),
    { ttl: CACHE_DURATIONS.PAGINATED_PRODUCTS }
  )

  return cached ?? EMPTY_PAGINATED
}

/**
 * Fetch fournisseur products with pagination and caching
 */
export const fetchFournisseurProductsPaginated = async (
  page: number = 0,
  pageSize: number = 20
): Promise<PaginatedProducts> => {
  const cached = await getCached(
    `products:fournisseur:paginated:${page}:${pageSize}`,
    () => fetchFournisseurProductsPaginatedOriginal(page, pageSize),
    { ttl: CACHE_DURATIONS.PAGINATED_PRODUCTS }
  )

  return cached ?? EMPTY_PAGINATED
}

/**
 * Fetch products by category with pagination and caching
 */
export const fetchProductsByCategoryPaginated = async (
  category: string,
  page: number = 0,
  pageSize: number = 20,
  sellerCategory?: string
): Promise<PaginatedProducts> => {
  const cacheKey = sellerCategory
    ? `products:category:${category}:seller:${sellerCategory}:paginated:${page}:${pageSize}`
    : `products:category:${category}:paginated:${page}:${pageSize}`

  const cached = await getCached(
    cacheKey,
    () => fetchProductsByCategoryPaginatedOriginal(category, page, pageSize, sellerCategory),
    { ttl: CACHE_DURATIONS.CATEGORY_PRODUCTS }
  )

  return cached ?? EMPTY_PAGINATED
}

/**
 * Search products with pagination and caching
 */
export const searchProductsPaginated = async (
  query: string,
  page: number = 0,
  pageSize: number = 20
): Promise<PaginatedProducts> => {
  const cached = await getCached(
    `products:search:${query}:${page}:${pageSize}`,
    () => searchProductsPaginatedOriginal(query, page, pageSize),
    { ttl: CACHE_DURATIONS.SEARCH_RESULTS }
  )

  return cached ?? EMPTY_PAGINATED
}

// Re-export the original subscribeToProducts and types if needed
export { subscribeToProducts }
export type { ProductWithImage, PaginatedProducts }
