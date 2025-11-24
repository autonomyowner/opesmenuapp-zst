// Export all Supabase related functionality
export { supabase, getCurrentSession, getCurrentUser } from './client'
export type {
  Database,
  UserRole,
  SellerType,
  SellerCategory,
  UserProfile,
  Product,
  CartItem,
  Order,
  OrderItem,
  AuthUser,
  AuthState,
} from './types'

// Export seller services
export {
  fetchSellerStats,
  fetchSellerRecentOrders,
  fetchSellerOrders,
  fetchSellerProducts,
  subscribeToSellerOrders,
  subscribeToSellerProducts,
} from './sellerService'
export type { SellerStats, SellerOrder, SellerProduct } from './sellerService'

// Export freelance services
export {
  fetchFreelanceServices,
  fetchFreelanceServicesByCategory,
  fetchFreelanceServiceById,
  getServiceCategories,
  subscribeToFreelanceServices,
} from './freelanceService'
export type {
  FreelanceService,
  ServiceCategory,
  ExperienceLevel,
  PriceType,
  AvailabilityStatus,
} from './freelanceService'

// Export product services
export {
  fetchAllProducts,
  fetchNewProducts,
  fetchSaleProducts,
  fetchFournisseurProducts,
  fetchProductsByCategory,
  fetchProductCategories,
  subscribeToProducts,
} from './productService'
export type { ProductWithImage } from './productService'