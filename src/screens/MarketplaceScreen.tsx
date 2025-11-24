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
} from "react-native"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import {
  fetchNewProducts,
  fetchFournisseurProducts,
  fetchProductCategories,
  fetchAllProducts,
  subscribeToProducts,
  ProductWithImage,
} from "@/services/supabase"

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

interface ProductCardProps {
  product: ProductWithImage
  compact?: boolean
  horizontal?: boolean
}

const ProductCard: FC<ProductCardProps> = ({ product, compact, horizontal }) => {
  const scaleAnim = useRef(new Animated.Value(1)).current

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start()
  }

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start()
  }

  // Calculate discount percentage
  const discount = product.original_price
    ? Math.round(((product.original_price - product.price) / product.original_price) * 100)
    : 0

  // Determine card style based on props
  const getCardStyle = () => {
    if (compact) return styles.productCardCompact
    if (horizontal) return styles.productCardHorizontal
    return styles.productCard
  }

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          getCardStyle(),
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
              <Text style={styles.imagePlaceholderText}>{product.name.charAt(0)}</Text>
            </View>
          )}
        </View>

        {/* Wishlist Button */}
        <Pressable style={styles.wishlistButton}>
          <Text style={styles.wishlistIcon}>&#9825;</Text>
        </Pressable>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Rating */}
          {product.rating && (
            <View style={styles.ratingContainer}>
              <Text style={styles.starIcon}>&#9733;</Text>
              <Text style={styles.ratingText}>{product.rating.toFixed(1)}</Text>
              <Text style={styles.reviewsText}>({product.viewers_count})</Text>
            </View>
          )}

          <Text style={styles.brandText}>{product.brand}</Text>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.productPrice}>{product.price.toLocaleString('fr-DZ')} DA</Text>
            {product.original_price && product.original_price > product.price && (
              <Text style={styles.originalPrice}>{product.original_price.toLocaleString('fr-DZ')} DA</Text>
            )}
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

interface MarketplaceScreenProps {
  onNavigateToCart?: () => void
}

export const MarketplaceScreen: FC<MarketplaceScreenProps> = function MarketplaceScreen({ onNavigateToCart }) {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [newProducts, setNewProducts] = useState<ProductWithImage[]>([])
  const [saleProducts, setSaleProducts] = useState<ProductWithImage[]>([])
  const [categories, setCategories] = useState<string[]>([])

  // Fetch data from Supabase
  const loadData = useCallback(async () => {
    try {
      const [newProds, fournisseurProds, cats] = await Promise.all([
        fetchNewProducts(10),
        fetchFournisseurProducts(20),
        fetchProductCategories(),
      ])

      // If no "new" products, fetch all products
      if (newProds.length === 0) {
        const allProducts = await fetchAllProducts()
        setNewProducts(allProducts.slice(0, 10))
      } else {
        setNewProducts(newProds)
      }

      // Display products from fournisseurs in the Sale section
      if (fournisseurProds.length === 0) {
        // Fallback: if no fournisseur products, show all products
        const allProducts = await fetchAllProducts()
        setSaleProducts(allProducts.slice(0, 10))
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
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.brandLogo}>ZST</Text>
            <Text style={styles.brandTagline}>MARKETPLACE</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable style={styles.iconButton}>
              <Text style={styles.iconText}>&#128269;</Text>
            </Pressable>
            <Pressable style={styles.iconButton} onPress={onNavigateToCart}>
              <Text style={styles.iconText}>&#128722;</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>NEW COLLECTION</Text>
            <Text style={styles.heroTitle}>Premium{"\n"}Products</Text>
            <Text style={styles.heroSubtitle}>Discover the best deals</Text>
            <Pressable style={styles.heroButton}>
              <Text style={styles.heroButtonText}>EXPLORE NOW</Text>
            </Pressable>
          </View>
          <View style={styles.heroAccent} />
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
            <Pressable>
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
                <ProductCard key={product.id} product={product} horizontal />
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
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={COLORS.accent} />
            </View>
          ) : saleProducts.length > 0 ? (
            <View style={styles.productsGrid}>
              {saleProducts.map((product) => (
                <View key={product.id} style={styles.gridItem}>
                  <ProductCard product={product} />
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

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  } as ViewStyle,

  brandLogo: {
    fontSize: 32,
    fontWeight: "900",
    color: COLORS.accent,
    letterSpacing: 4,
  } as TextStyle,

  brandTagline: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 3,
    marginTop: -2,
  } as TextStyle,

  headerIcons: {
    flexDirection: "row",
    gap: 8,
  } as ViewStyle,

  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  iconText: {
    fontSize: 20,
  } as TextStyle,

  cartBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: COLORS.danger,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  } as ViewStyle,

  cartBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  // Hero Banner
  heroBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    height: 200,
    borderRadius: 24,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    position: "relative",
  } as ViewStyle,

  heroContent: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
  } as ViewStyle,

  heroLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 2,
    marginBottom: 8,
  } as TextStyle,

  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.text,
    lineHeight: 34,
    marginBottom: 8,
  } as TextStyle,

  heroSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  } as TextStyle,

  heroButton: {
    backgroundColor: COLORS.accent,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: "flex-start",
  } as ViewStyle,

  heroButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.background,
    letterSpacing: 1,
  } as TextStyle,

  heroAccent: {
    position: "absolute",
    right: -40,
    top: -40,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accent,
    opacity: 0.15,
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

  // Product Card
  productCard: {
    width: "100%",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
  } as ViewStyle,

  productCardHorizontal: {
    width: SCREEN_WIDTH * 0.44,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 14,
  } as ViewStyle,

  productCardCompact: {
    width: SCREEN_WIDTH * 0.38,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    overflow: "hidden",
    marginRight: 14,
  } as ViewStyle,

  discountBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    zIndex: 10,
  } as ViewStyle,

  discountText: {
    fontSize: 11,
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.text,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  } as ViewStyle,

  wishlistIcon: {
    fontSize: 18,
    color: COLORS.background,
  } as TextStyle,

  productInfo: {
    padding: 12,
  } as ViewStyle,

  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  } as ViewStyle,

  starIcon: {
    fontSize: 12,
    color: COLORS.accent,
  } as TextStyle,

  ratingText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.text,
    marginLeft: 4,
  } as TextStyle,

  reviewsText: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginLeft: 2,
  } as TextStyle,

  brandText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    marginBottom: 2,
  } as TextStyle,

  productName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  } as TextStyle,

  priceContainer: {
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,

  productPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.accent,
  } as TextStyle,

  originalPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    marginLeft: 6,
  } as TextStyle,

  imagePlaceholder: {
    flex: 1,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  imagePlaceholderText: {
    fontSize: 32,
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
})
