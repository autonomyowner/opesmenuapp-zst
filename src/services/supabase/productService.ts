import { supabase } from './client'
import { Product } from './types'

// Supabase storage base URL for relative image paths
const SUPABASE_STORAGE_URL = 'https://enbrhhuubjvapadqyvds.supabase.co/storage/v1/object/public/products'

// Extended product type with image and video
export interface ProductWithImage extends Product {
  image_url?: string
  video_url?: string
}

// Pagination result type for scalable product fetching
export interface PaginatedProducts {
  products: ProductWithImage[]
  totalCount: number
  hasMore: boolean
  nextPage: number
}

// Default page size for pagination
const DEFAULT_PAGE_SIZE = 20

// Helper function to check if image URL is valid (exists in storage)
// NOTE: Returns true for missing images so products still show (with placeholder)
const isValidImageUrl = (imageUrl: string | undefined): boolean => {
  // Allow products without images to show (they'll display a placeholder)
  if (!imageUrl) return true
  // Full URLs are valid
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return true
  }
  // Relative paths starting with /winter/ or /perfums/ are broken (not in storage)
  if (imageUrl.startsWith('/winter/') || imageUrl.startsWith('/perfums/')) {
    return false
  }
  return true
}

// Helper function to get full image URL
const getFullImageUrl = (imageUrl: string | undefined): string | undefined => {
  if (!imageUrl) return undefined
  // If it's already a full URL, return as is
  if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
    return imageUrl
  }
  // Convert relative path to full Supabase storage URL
  return `${SUPABASE_STORAGE_URL}${imageUrl}`
}

// Fetch all products (for marketplace/home page)
export const fetchAllProducts = async (): Promise<ProductWithImage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      throw error
    }

    // Transform and filter out products with broken images
    return (products || [])
      .map(product => {
        const images = product.product_images as any[]
        const primaryImage = Array.isArray(images)
          ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
          : undefined

        const videos = product.product_videos as any[]
        const videoUrl = Array.isArray(videos) && videos.length > 0
          ? videos[0]?.video_url
          : undefined

        return {
          ...product,
          image_url: getFullImageUrl(primaryImage),
          video_url: videoUrl,
          product_images: undefined,
          product_videos: undefined,
          _hasValidImage: isValidImageUrl(primaryImage),
        }
      })
      .filter(product => (product as any)._hasValidImage) as ProductWithImage[]
  } catch (error) {
    console.error('Error in fetchAllProducts:', error)
    return []
  }
}

// Fetch new products (recently added)
export const fetchNewProducts = async (limit: number = 10): Promise<ProductWithImage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('is_new', true)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching new products:', error)
      throw error
    }

    // Filter out products with broken images and apply limit
    return (products || [])
      .map(product => {
        const images = product.product_images as any[]
        const primaryImage = Array.isArray(images)
          ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
          : undefined

        const videos = product.product_videos as any[]
        const videoUrl = Array.isArray(videos) && videos.length > 0
          ? videos[0]?.video_url
          : undefined

        return {
          ...product,
          image_url: getFullImageUrl(primaryImage),
          video_url: videoUrl,
          product_images: undefined,
          product_videos: undefined,
          _hasValidImage: isValidImageUrl(primaryImage),
        }
      })
      .filter(product => (product as any)._hasValidImage)
      .slice(0, limit) as ProductWithImage[]
  } catch (error) {
    console.error('Error in fetchNewProducts:', error)
    return []
  }
}

// Fetch products on sale (promo)
export const fetchSaleProducts = async (limit: number = 10): Promise<ProductWithImage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('is_promo', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching sale products:', error)
      throw error
    }

    return (products || []).map(product => {
      const images = product.product_images as any[]
      const primaryImage = Array.isArray(images)
        ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
        : undefined

      const videos = product.product_videos as any[]
      const videoUrl = Array.isArray(videos) && videos.length > 0
        ? videos[0]?.video_url
        : undefined

      return {
        ...product,
        image_url: getFullImageUrl(primaryImage),
        video_url: videoUrl,
        product_images: undefined,
        product_videos: undefined,
      }
    }) as ProductWithImage[]
  } catch (error) {
    console.error('Error in fetchSaleProducts:', error)
    return []
  }
}

// Fetch products posted by fournisseurs (suppliers) for customers
export const fetchFournisseurProducts = async (limit: number = 20): Promise<ProductWithImage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('seller_category', 'fournisseur')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching fournisseur products:', error)
      throw error
    }

    // Filter out products with broken image URLs and apply limit
    return (products || [])
      .map(product => {
        const images = product.product_images as any[]
        const primaryImage = Array.isArray(images)
          ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
          : undefined

        const videos = product.product_videos as any[]
        const videoUrl = Array.isArray(videos) && videos.length > 0
          ? videos[0]?.video_url
          : undefined

        return {
          ...product,
          image_url: getFullImageUrl(primaryImage),
          video_url: videoUrl,
          product_images: undefined,
          product_videos: undefined,
          _hasValidImage: isValidImageUrl(primaryImage),
        }
      })
      .filter(product => (product as any)._hasValidImage)
      .slice(0, limit) as ProductWithImage[]
  } catch (error) {
    console.error('Error in fetchFournisseurProducts:', error)
    return []
  }
}

// Fetch products by category
export const fetchProductsByCategory = async (
  category: string,
  limit: number = 20
): Promise<ProductWithImage[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('category', category)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching products by category:', error)
      throw error
    }

    return (products || []).map(product => {
      const images = product.product_images as any[]
      const primaryImage = Array.isArray(images)
        ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
        : undefined

      const videos = product.product_videos as any[]
      const videoUrl = Array.isArray(videos) && videos.length > 0
        ? videos[0]?.video_url
        : undefined

      return {
        ...product,
        image_url: getFullImageUrl(primaryImage),
        video_url: videoUrl,
        product_images: undefined,
        product_videos: undefined,
      }
    }) as ProductWithImage[]
  } catch (error) {
    console.error('Error in fetchProductsByCategory:', error)
    return []
  }
}

// Get unique product categories
export const fetchProductCategories = async (): Promise<string[]> => {
  try {
    const { data: products, error } = await supabase
      .from('products')
      .select('category')
      .eq('in_stock', true)

    if (error) {
      console.error('Error fetching categories:', error)
      throw error
    }

    // Get unique categories
    const categories = [...new Set((products || []).map(p => p.category))]
    return categories.filter(Boolean)
  } catch (error) {
    console.error('Error in fetchProductCategories:', error)
    return []
  }
}

// Subscribe to real-time product updates (including images)
export const subscribeToProducts = (onUpdate: (payload: any) => void) => {
  const subscription = supabase
    .channel('products-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'products',
      },
      onUpdate
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_images',
      },
      onUpdate
    )
    .subscribe()

  return subscription
}

// Helper function to transform product data
const transformProduct = (product: any): ProductWithImage & { _hasValidImage: boolean } => {
  const images = product.product_images as any[]
  const primaryImage = Array.isArray(images)
    ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
    : undefined

  const videos = product.product_videos as any[]
  const videoUrl = Array.isArray(videos) && videos.length > 0
    ? videos[0]?.video_url
    : undefined

  return {
    ...product,
    image_url: getFullImageUrl(primaryImage),
    video_url: videoUrl,
    product_images: undefined,
    product_videos: undefined,
    _hasValidImage: isValidImageUrl(primaryImage),
  }
}

// ============================================
// PAGINATED FETCHING FUNCTIONS (SCALABLE)
// ============================================

// Fetch products with pagination (for infinite scroll)
export const fetchProductsPaginated = async (
  page: number = 0,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedProducts> => {
  try {
    const from = page * pageSize
    const to = from + pageSize - 1

    // Get total count first
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true)

    // Fetch paginated products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated products:', error)
      throw error
    }

    const transformedProducts = (products || [])
      .map(transformProduct)
      .filter(product => product._hasValidImage) as ProductWithImage[]

    return {
      products: transformedProducts,
      totalCount: totalCount || 0,
      hasMore: (from + transformedProducts.length) < (totalCount || 0),
      nextPage: page + 1,
    }
  } catch (error) {
    console.error('Error in fetchProductsPaginated:', error)
    return { products: [], totalCount: 0, hasMore: false, nextPage: 0 }
  }
}

// Fetch fournisseur products with pagination (for customers)
export const fetchFournisseurProductsPaginated = async (
  page: number = 0,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedProducts> => {
  try {
    const from = page * pageSize
    const to = from + pageSize - 1

    // Get total count
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true)
      .eq('seller_category', 'fournisseur')

    // Fetch paginated products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('seller_category', 'fournisseur')
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated fournisseur products:', error)
      throw error
    }

    const transformedProducts = (products || [])
      .map(transformProduct)
      .filter(product => product._hasValidImage) as ProductWithImage[]

    return {
      products: transformedProducts,
      totalCount: totalCount || 0,
      hasMore: (from + transformedProducts.length) < (totalCount || 0),
      nextPage: page + 1,
    }
  } catch (error) {
    console.error('Error in fetchFournisseurProductsPaginated:', error)
    return { products: [], totalCount: 0, hasMore: false, nextPage: 0 }
  }
}

// Fetch products by category with pagination
export const fetchProductsByCategoryPaginated = async (
  category: string,
  page: number = 0,
  pageSize: number = DEFAULT_PAGE_SIZE,
  sellerCategory?: string
): Promise<PaginatedProducts> => {
  try {
    const from = page * pageSize
    const to = from + pageSize - 1

    // Build base query
    let countQuery = supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true)
      .eq('category', category)

    let productsQuery = supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .eq('category', category)

    // Add seller_category filter if provided
    if (sellerCategory) {
      countQuery = countQuery.eq('seller_category', sellerCategory)
      productsQuery = productsQuery.eq('seller_category', sellerCategory)
    }

    // Get total count
    const { count: totalCount } = await countQuery

    // Fetch paginated products
    const { data: products, error } = await productsQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error fetching paginated category products:', error)
      throw error
    }

    const transformedProducts = (products || [])
      .map(transformProduct)
      .filter(product => product._hasValidImage) as ProductWithImage[]

    return {
      products: transformedProducts,
      totalCount: totalCount || 0,
      hasMore: (from + transformedProducts.length) < (totalCount || 0),
      nextPage: page + 1,
    }
  } catch (error) {
    console.error('Error in fetchProductsByCategoryPaginated:', error)
    return { products: [], totalCount: 0, hasMore: false, nextPage: 0 }
  }
}

// Search products with pagination
export const searchProductsPaginated = async (
  query: string,
  page: number = 0,
  pageSize: number = DEFAULT_PAGE_SIZE
): Promise<PaginatedProducts> => {
  try {
    const from = page * pageSize
    const to = from + pageSize - 1
    const searchPattern = `%${query}%`

    // Get total count
    const { count: totalCount } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('in_stock', true)
      .or(`name.ilike.${searchPattern},brand.ilike.${searchPattern},category.ilike.${searchPattern}`)

    // Fetch paginated products
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('in_stock', true)
      .or(`name.ilike.${searchPattern},brand.ilike.${searchPattern},category.ilike.${searchPattern}`)
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Error searching products:', error)
      throw error
    }

    const transformedProducts = (products || [])
      .map(transformProduct)
      .filter(product => product._hasValidImage) as ProductWithImage[]

    return {
      products: transformedProducts,
      totalCount: totalCount || 0,
      hasMore: (from + transformedProducts.length) < (totalCount || 0),
      nextPage: page + 1,
    }
  } catch (error) {
    console.error('Error in searchProductsPaginated:', error)
    return { products: [], totalCount: 0, hasMore: false, nextPage: 0 }
  }
}

// ============================================
// PRODUCT REELS (For Shop/Reels screen)
// ============================================

// Product reel type with seller info
export interface ProductReel {
  id: string
  product_id: string
  video_url: string
  thumbnail_url?: string
  duration_seconds?: number
  product_name: string
  product_price: number
  product_slug: string
  seller_id: string
  seller_name: string
  seller_avatar?: string
  created_at: string
}

// Fetch product reels with seller info for the Reels/Shop screen
export const fetchProductReels = async (limit: number = 20): Promise<ProductReel[]> => {
  try {
    const { data, error } = await supabase
      .from('product_videos')
      .select(`
        id,
        product_id,
        video_url,
        thumbnail_url,
        duration_seconds,
        created_at,
        products!inner (
          name,
          price,
          slug,
          seller_id,
          in_stock
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching product reels:', error)
      throw error
    }

    if (!data || data.length === 0) {
      return []
    }

    // Get seller IDs to fetch their profiles
    const sellerIds = [...new Set(data.map((item: any) => item.products?.seller_id).filter(Boolean))]

    // Fetch seller profiles
    const { data: sellers } = await supabase
      .from('user_profiles')
      .select('id, full_name, provider_avatar')
      .in('id', sellerIds)

    const sellerMap = new Map(sellers?.map(s => [s.id, s]) || [])

    // Transform data
    return data
      .filter((item: any) => item.products?.in_stock !== false)
      .map((item: any) => {
        const seller = sellerMap.get(item.products?.seller_id)
        return {
          id: item.id,
          product_id: item.product_id,
          video_url: item.video_url,
          thumbnail_url: item.thumbnail_url,
          duration_seconds: item.duration_seconds,
          product_name: item.products?.name || 'Unknown Product',
          product_price: parseFloat(item.products?.price) || 0,
          product_slug: item.products?.slug || '',
          seller_id: item.products?.seller_id || '',
          seller_name: seller?.full_name || 'Unknown Seller',
          seller_avatar: seller?.provider_avatar,
          created_at: item.created_at,
        }
      })
  } catch (error) {
    console.error('Error in fetchProductReels:', error)
    return []
  }
}

// Subscribe to real-time product video updates
export const subscribeToProductReels = (onUpdate: (payload: any) => void) => {
  const subscription = supabase
    .channel('product-reels-channel')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'product_videos',
      },
      onUpdate
    )
    .subscribe()

  return subscription
}

// Fetch full product details by ID (for navigating from reel to product page)
export const fetchProductById = async (productId: string): Promise<ProductWithImage | null> => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary),
        product_videos(video_url)
      `)
      .eq('id', productId)
      .single()

    if (error) {
      console.error('Error fetching product by ID:', error)
      return null
    }

    return transformProduct(product)
  } catch (error) {
    console.error('Error in fetchProductById:', error)
    return null
  }
}
