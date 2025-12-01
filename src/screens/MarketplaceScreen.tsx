import { FC, useRef, useState, useEffect, useCallback } from "react"
import {
  Animated,
  Dimensions,
  Image,
  ImageStyle,
  Pressable,
  ScrollView,
  StyleSheet,
  TextStyle,
  View,
  ViewStyle,
  RefreshControl,
  ActivityIndicator,
  TextInput,
  Modal,
} from "react-native"
import { Video, ResizeMode } from "expo-av"
import Svg, { Path, Circle } from "react-native-svg"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import {
  fetchNewProducts,
  fetchFournisseurProducts,
  fetchProductCategories,
  fetchAllProducts,
  subscribeToProducts,
  invalidateProductCaches,
  ProductWithImage,
} from "@/services/supabase/productService.cached"
import { toggleWishlist, getWishlistIds, subscribeToWishlist } from "@/services/supabase/wishlistService"
import { addToCart } from "@/services/supabase/cartService"
import { useAuth } from "@/context/AuthContext"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Colors
const COLORS = {
  background: "#0D0D0D",
  surface: "#1A1A1A",
  surfaceElevated: "#242424",
  accent: "#D4A84B",
  accentDark: "#B8922F",
  text: "#FFFFFF",
  textSecondary: "#8A8A8A",
  textMuted: "#5A5A5A",
  danger: "#E53935",
}

// Search Icon Component - Refined minimal style
const SearchIcon: FC<{ size?: number; color?: string }> = ({ size = 24, color = "#FFFFFF" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle
        cx="10.5"
        cy="10.5"
        r="6.5"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <Path
        d="M15.5 15.5L20 20"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Cart Icon Component - Elegant shopping bag
const CartIcon: FC<{ size?: number; color?: string }> = ({ size = 24, color = "#FFFFFF" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M5 7H19L18 21H6L5 7Z"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8 7V6C8 3.79086 9.79086 2 12 2C14.2091 2 16 3.79086 16 6V7"
        stroke={color}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
    </Svg>
  )
}

// Close Icon Component
const CloseIcon: FC<{ size?: number; color?: string }> = ({ size = 24, color = "#FFFFFF" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M18 6L6 18M6 6L18 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// Back Arrow Icon Component
const BackIcon: FC<{ size?: number; color?: string }> = ({ size = 24, color = "#FFFFFF" }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M15 18L9 12L15 6"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  )
}

// ZST Logo Component - Matching MARKETPLACE style
const ZSTLogo: FC = () => {
  return (
    <View style={zstLogoStyles.container}>
      <Text style={zstLogoStyles.logoText}>ZST</Text>
      <View style={zstLogoStyles.taglineContainer}>
        <View style={zstLogoStyles.taglineLine} />
        <Text style={zstLogoStyles.taglineText}>MARKETPLACE</Text>
        <View style={zstLogoStyles.taglineLine} />
      </View>
    </View>
  )
}

const zstLogoStyles = StyleSheet.create({
  container: {
    alignItems: "center",
  } as ViewStyle,
  logoText: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 6,
  } as TextStyle,
  taglineContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 3,
    gap: 4,
  } as ViewStyle,
  taglineLine: {
    width: 10,
    height: 1,
    backgroundColor: COLORS.accent,
  } as ViewStyle,
  taglineText: {
    fontSize: 8,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 3,
  } as TextStyle,
})

interface ProductCardProps {
  product: ProductWithImage
  compact?: boolean
  horizontal?: boolean
  onPress?: (product: ProductWithImage) => void
  isInWishlist?: boolean
  onWishlistToggle?: (product: ProductWithImage) => void
}

// Consistent card width calculation
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2
const HORIZONTAL_CARD_WIDTH = SCREEN_WIDTH * 0.42

const ProductCard: FC<ProductCardProps> = ({ product, compact, horizontal, onPress, isInWishlist, onWishlistToggle }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current
  const heartAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.97,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      useNativeDriver: true,
    }).start()
  }

  const handlePress = () => {
    if (onPress) {
      onPress(product)
    }
  }

  const handleWishlistPress = () => {
    Animated.sequence([
      Animated.timing(heartAnim, {
        toValue: 1.3,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(heartAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start()

    if (onWishlistToggle) {
      onWishlistToggle(product)
    }
  }

  // Calculate discount percentage
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  // Format price consistently
  const formatPrice = (price: number) => {
    return price.toLocaleString('fr-DZ')
  }

  // Card width based on context
  const cardWidth = horizontal ? HORIZONTAL_CARD_WIDTH : "100%"

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut} onPress={handlePress}>
      <Animated.View
        style={[
          styles.productCard,
          horizontal && styles.productCardHorizontal,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Discount Badge */}
        {discount > 0 && (
          <View style={styles.discountBadge}>
            <Text style={styles.discountText}>-{discount}%</Text>
          </View>
        )}

        {/* Product Image */}
        <View style={styles.productImageContainer}>
          {product.image_url ? (
            <Image
              source={{ uri: product.image_url }}
              style={styles.productImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.imagePlaceholder}>
              <Text style={styles.imagePlaceholderText}>{product.name.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>

        {/* Wishlist Button */}
        <Pressable style={styles.wishlistButton} onPress={handleWishlistPress} hitSlop={8}>
          <Animated.View style={{ transform: [{ scale: heartAnim }] }}>
            <Text style={[styles.wishlistIcon, isInWishlist && styles.wishlistIconActive]}>
              {isInWishlist ? '\u2665' : '\u2661'}
            </Text>
          </Animated.View>
        </Pressable>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Brand */}
          <Text style={styles.brandText} numberOfLines={1}>
            {product.brand || "ZST"}
          </Text>

          {/* Product Name */}
          <Text style={styles.productName} numberOfLines={2}>
            {product.name}
          </Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice} numberOfLines={1}>
              {formatPrice(product.price)} DA
            </Text>
            {product.original_price && product.original_price > product.price && (
              <Text style={styles.originalPrice} numberOfLines={1}>
                {formatPrice(product.original_price)}
              </Text>
            )}
          </View>

          {/* Rating */}
          {product.rating ? (
            <View style={styles.ratingRow}>
              <View style={styles.ratingContainer}>
                <Text style={styles.starIcon}>&#9733;</Text>
                <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
                {product.viewers_count ? (
                  <Text style={styles.reviewsText}>({product.viewers_count})</Text>
                ) : null}
              </View>
            </View>
          ) : null}
        </View>
      </Animated.View>
    </Pressable>
  )
}

interface MarketplaceScreenProps {
  onNavigateToCart?: () => void
  onProductPress?: (product: ProductWithImage) => void
}

export const MarketplaceScreen: FC<MarketplaceScreenProps> = function MarketplaceScreen({ onNavigateToCart, onProductPress }) {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newProducts, setNewProducts] = useState<ProductWithImage[]>([])
  const [saleProducts, setSaleProducts] = useState<ProductWithImage[]>([])
  const [allProducts, setAllProducts] = useState<ProductWithImage[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [wishlistIds, setWishlistIds] = useState<string[]>([])
  const videoRef = useRef<Video>(null)

  // Search state
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<ProductWithImage[]>([])

  // View All modal state
  const [viewAllVisible, setViewAllVisible] = useState(false)
  const [viewAllTitle, setViewAllTitle] = useState("")
  const [viewAllProducts, setViewAllProducts] = useState<ProductWithImage[]>([])

  // Play video on mount
  useEffect(() => {
    videoRef.current?.playAsync()
  }, [])

  // Load wishlist
  useEffect(() => {
    if (user) {
      getWishlistIds().then(setWishlistIds)
      const subscription = subscribeToWishlist(setWishlistIds)
      return () => subscription.unsubscribe()
    }
    return undefined
  }, [user])

  // Handle wishlist toggle - also adds/removes from cart
  const handleWishlistToggle = useCallback(async (product: ProductWithImage) => {
    if (!user) {
      // Could show a login prompt here
      return
    }

    const isCurrentlyInWishlist = wishlistIds.includes(product.id)

    // Optimistic update for wishlist
    setWishlistIds(prev =>
      prev.includes(product.id)
        ? prev.filter(id => id !== product.id)
        : [...prev, product.id]
    )

    // Toggle wishlist
    await toggleWishlist(product.id)

    // If adding to wishlist (heart is being filled), also add to cart
    if (!isCurrentlyInWishlist) {
      await addToCart(product, 1)
    }
  }, [user, wishlistIds])

  // Handle search
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query)
    if (query.trim() === "") {
      setSearchResults([])
      return
    }

    const lowerQuery = query.toLowerCase()
    const results = allProducts.filter(product =>
      product.name.toLowerCase().includes(lowerQuery) ||
      product.brand.toLowerCase().includes(lowerQuery) ||
      product.category?.toLowerCase().includes(lowerQuery)
    )
    setSearchResults(results)
  }, [allProducts])

  // Handle View All
  const handleViewAll = useCallback((title: string, products: ProductWithImage[]) => {
    setViewAllTitle(title)
    setViewAllProducts(products)
    setViewAllVisible(true)
  }, [])

  // Fetch data from Supabase
  const loadData = useCallback(async () => {
    try {
      const [newProds, fournisseurProds, cats, allProds] = await Promise.all([
        fetchNewProducts(10),
        fetchFournisseurProducts(20),
        fetchProductCategories(),
        fetchAllProducts(),
      ])

      // Store all products for search
      setAllProducts(allProds)

      // If no "new" products, use all products
      if (newProds.length === 0) {
        setNewProducts(allProds.slice(0, 10))
      } else {
        setNewProducts(newProds)
      }

      // Display products from fournisseurs in the Sale section
      if (fournisseurProds.length === 0) {
        // Fallback: if no fournisseur products, show all products
        setSaleProducts(allProds.slice(0, 10))
      } else {
        setSaleProducts(fournisseurProds)
      }

      setCategories(cats)
    } catch (error) {
      console.error('Error loading marketplace data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load
  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscription
  useEffect(() => {
    const subscription = subscribeToProducts(() => {
      loadData()
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [loadData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await invalidateProductCaches()
    await loadData()
    setRefreshing(false)
  }, [loadData])

  return (
    <View style={[styles.container, $topInsets]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.accent}
            colors={[COLORS.accent]}
          />
        }
      >
        {/* Video Advertisement Hero - Full Width */}
        <View style={styles.videoHeroContainer}>
          {/* Video Background */}
          <Video
            ref={videoRef}
            source={require("../../assets/videos/djezzy yassir)4m.mp4")}
            style={styles.videoBackground}
            resizeMode={ResizeMode.COVER}
            isLooping
            shouldPlay
            isMuted
          />

          {/* Floating Header with Icons */}
          <View style={styles.floatingHeader}>
            {/* Spacer for left side */}
            <View style={styles.logoContainer} />

            {/* Icons - Top Right */}
            <View style={styles.floatingHeaderIcons}>
              <Pressable style={styles.iconButton} onPress={() => setSearchVisible(true)}>
                <SearchIcon size={22} color="#FFFFFF" />
              </Pressable>
              <Pressable style={styles.iconButton} onPress={onNavigateToCart}>
                <CartIcon size={22} color="#FFFFFF" />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Categories */}
        {categories.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoriesContainer}
            contentContainerStyle={styles.categoriesContent}
          >
            {categories.map((category, index) => (
              <Pressable key={index} style={styles.categoryChip}>
                <Text style={styles.categoryName}>{category}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* New Products Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>New</Text>
              <Text style={styles.sectionSubtitle}>You've never seen it before!</Text>
            </View>
            <Pressable onPress={() => handleViewAll("New Products", allProducts.filter(p => p.is_new) || newProducts)}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : newProducts.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.productsRow}
            >
              {newProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  horizontal
                  onPress={onProductPress}
                  isInWishlist={wishlistIds.includes(product.id)}
                  onWishlistToggle={handleWishlistToggle}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products available</Text>
            </View>
          )}
        </View>

        {/* Fournisseur Products Section (Sale) - Vertical Grid */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.saleSectionTitle}>Sale</Text>
              <Text style={styles.sectionSubtitle}>Products from our suppliers</Text>
            </View>
            <Pressable onPress={() => handleViewAll("Sale Products", saleProducts)}>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : saleProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {saleProducts.map((product) => (
                <View key={product.id} style={styles.gridItem}>
                  <ProductCard
                    product={product}
                    onPress={onProductPress}
                    isInWishlist={wishlistIds.includes(product.id)}
                    onWishlistToggle={handleWishlistToggle}
                  />
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No products available</Text>
            </View>
          )}
        </View>

        {/* Spacer for bottom nav */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Search Modal */}
      <Modal
        visible={searchVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setSearchVisible(false)}
      >
        <View style={[styles.modalContainer, $topInsets]}>
          {/* Search Header */}
          <View style={styles.searchHeader}>
            <Pressable style={styles.backButton} onPress={() => {
              setSearchVisible(false)
              setSearchQuery("")
              setSearchResults([])
            }}>
              <BackIcon size={24} color={COLORS.text} />
            </Pressable>
            <View style={styles.searchInputContainer}>
              <SearchIcon size={18} color={COLORS.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search products..."
                placeholderTextColor={COLORS.textSecondary}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
                returnKeyType="search"
              />
              {searchQuery.length > 0 && (
                <Pressable onPress={() => {
                  setSearchQuery("")
                  setSearchResults([])
                }}>
                  <CloseIcon size={18} color={COLORS.textSecondary} />
                </Pressable>
              )}
            </View>
          </View>

          {/* Search Results */}
          <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
            {searchQuery.length === 0 ? (
              <View style={styles.searchPlaceholder}>
                <Text style={styles.searchPlaceholderText}>Search for products by name, brand, or category</Text>
              </View>
            ) : searchResults.length > 0 ? (
              <View style={styles.productsGrid}>
                {searchResults.map((product) => (
                  <View key={product.id} style={styles.gridItem}>
                    <ProductCard
                      product={product}
                      onPress={(p) => {
                        setSearchVisible(false)
                        onProductPress?.(p)
                      }}
                      isInWishlist={wishlistIds.includes(product.id)}
                      onWishlistToggle={handleWishlistToggle}
                    />
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>No products found for "{searchQuery}"</Text>
              </View>
            )}
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>

      {/* View All Modal */}
      <Modal
        visible={viewAllVisible}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setViewAllVisible(false)}
      >
        <View style={[styles.modalContainer, $topInsets]}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Pressable style={styles.backButton} onPress={() => setViewAllVisible(false)}>
              <BackIcon size={24} color={COLORS.text} />
            </Pressable>
            <Text style={styles.modalTitle}>{viewAllTitle}</Text>
            <View style={{ width: 40 }} />
          </View>

          {/* Products Grid */}
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.productsGrid}>
              {viewAllProducts.map((product) => (
                <View key={product.id} style={styles.gridItem}>
                  <ProductCard
                    product={product}
                    onPress={(p) => {
                      setViewAllVisible(false)
                      onProductPress?.(p)
                    }}
                    isInWishlist={wishlistIds.includes(product.id)}
                    onWishlistToggle={handleWishlistToggle}
                  />
                </View>
              ))}
            </View>
            <View style={{ height: 100 }} />
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  scrollView: {
    flex: 1,
  } as ViewStyle,

  scrollContent: {
    paddingBottom: 20,
  } as ViewStyle,

  // Video Hero Container - Full Width
  videoHeroContainer: {
    width: SCREEN_WIDTH,
    height: 300,
    position: "relative",
    overflow: "hidden",
    marginTop: -20,
  } as ViewStyle,

  videoBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
  } as ViewStyle,

  // Floating Header Over Video
  floatingHeader: {
    position: "absolute",
    top: 20,
    left: 20,
    right: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    zIndex: 100,
  } as ViewStyle,

  logoContainer: {
  } as ViewStyle,

  floatingHeaderIcons: {
    flexDirection: "row",
    gap: 10,
  } as ViewStyle,

  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0, 0, 0, 0.35)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  } as ViewStyle,

  // Categories
  categoriesContainer: {
    marginTop: 20,
  } as ViewStyle,

  categoriesContent: {
    paddingHorizontal: 20,
    gap: 10,
  } as ViewStyle,

  categoryChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
  } as ViewStyle,

  categoryName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,

  categoryCount: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.textMuted,
    marginLeft: 8,
  } as TextStyle,

  // Section
  section: {
    marginTop: 28,
  } as ViewStyle,

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 16,
  } as ViewStyle,

  sectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
  } as TextStyle,

  saleSectionTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.danger,
  } as TextStyle,

  sectionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  } as TextStyle,

  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.accent,
  } as TextStyle,

  productsRow: {
    paddingHorizontal: 20,
  } as ViewStyle,

  // Vertical Grid for Sale products
  productsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 16,
    justifyContent: "space-between",
  } as ViewStyle,

  gridItem: {
    width: (SCREEN_WIDTH - 48) / 2,
    marginBottom: 16,
  } as ViewStyle,

  // Product Card - Consistent Base Style
  productCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    overflow: "hidden",
  } as ViewStyle,

  productCardHorizontal: {
    width: HORIZONTAL_CARD_WIDTH,
    marginRight: 12,
  } as ViewStyle,

  discountBadge: {
    position: "absolute",
    top: 8,
    left: 8,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    zIndex: 10,
  } as ViewStyle,

  discountText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  productImageContainer: {
    width: "100%",
    aspectRatio: 1,
    backgroundColor: COLORS.surfaceElevated,
  } as ViewStyle,

  productImage: {
    width: "100%",
    height: "100%",
  } as ImageStyle,

  wishlistButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  } as ViewStyle,

  wishlistIcon: {
    fontSize: 16,
    color: COLORS.background,
  } as TextStyle,

  wishlistIconActive: {
    color: COLORS.danger,
  } as TextStyle,

  productInfo: {
    padding: 10,
    minHeight: 110,
  } as ViewStyle,

  ratingRow: {
    marginTop: 4,
    marginBottom: 6,
  } as ViewStyle,

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,

  ratingPlaceholder: {
    height: 16,
  } as ViewStyle,

  starIcon: {
    fontSize: 11,
    color: COLORS.accent,
  } as TextStyle,

  ratingText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 3,
  } as TextStyle,

  reviewsText: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginLeft: 2,
  } as TextStyle,

  brandText: {
    fontSize: 9,
    fontWeight: "500",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  } as TextStyle,

  productName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 17,
    marginBottom: 6,
  } as TextStyle,

  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 4,
  } as ViewStyle,

  productPrice: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
  } as TextStyle,

  originalPrice: {
    fontSize: 11,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
  } as TextStyle,

  imagePlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  imagePlaceholderText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.accent,
  } as TextStyle,

  loadingContainer: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  emptyState: {
    height: 100,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
  } as TextStyle,

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  } as ViewStyle,

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  modalContent: {
    flex: 1,
    paddingTop: 16,
  } as ViewStyle,

  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  // Search Styles
  searchHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  } as ViewStyle,

  searchInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  } as ViewStyle,

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.text,
    padding: 0,
  } as TextStyle,

  searchResults: {
    flex: 1,
    paddingTop: 16,
  } as ViewStyle,

  searchPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  } as ViewStyle,

  searchPlaceholderText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  } as TextStyle,

  noResults: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingTop: 60,
  } as ViewStyle,

  noResultsText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  } as TextStyle,
})
