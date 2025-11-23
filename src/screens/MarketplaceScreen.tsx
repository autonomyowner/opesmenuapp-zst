import { FC, useRef } from "react"
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
} from "react-native"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Mock product data
const NEW_PRODUCTS = [
  {
    id: "1",
    name: "Black North Face",
    brand: "North Face",
    price: "8000DA",
    originalPrice: "10000DA",
    discount: 20,
    rating: 4.8,
    reviews: 128,
    image: require("../../assets/images/black north face.png"),
  },
  {
    id: "2",
    name: "Blue North Face",
    brand: "North Face",
    price: "8000DA",
    originalPrice: "10000DA",
    discount: 20,
    rating: 4.6,
    reviews: 84,
    image: require("../../assets/images/bluie northface.png"),
  },
  {
    id: "3",
    name: "Brown Vest",
    brand: "ZST Wear",
    price: "7500DA",
    originalPrice: "9500DA",
    discount: 21,
    rating: 4.9,
    reviews: 256,
    image: require("../../assets/images/brown.png"),
  },
  {
    id: "4",
    name: "Grey Vest",
    brand: "ZST Wear",
    price: "7000DA",
    originalPrice: "9000DA",
    discount: 22,
    rating: 4.7,
    reviews: 142,
    image: require("../../assets/images/grey.png"),
  },
]

const SALE_PRODUCTS = [
  {
    id: "5",
    name: "White North Face",
    brand: "North Face",
    price: "7500DA",
    originalPrice: "9500DA",
    discount: 21,
    rating: 4.7,
    reviews: 312,
    image: require("../../assets/images/white north face.png"),
  },
  {
    id: "6",
    name: "Adidas White",
    brand: "Adidas",
    price: "6500DA",
    originalPrice: "8500DA",
    discount: 24,
    rating: 4.5,
    reviews: 98,
    image: require("../../assets/images/addidaswhite.png"),
  },
]

const CATEGORIES = [
  { id: "1", name: "Audio", count: 124 },
  { id: "2", name: "Wearables", count: 89 },
  { id: "3", name: "Gaming", count: 156 },
  { id: "4", name: "Smart Home", count: 67 },
]

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
  product: (typeof NEW_PRODUCTS)[0]
  compact?: boolean
}

const ProductCard: FC<ProductCardProps> = ({ product, compact }) => {
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

  return (
    <Pressable onPressIn={handlePressIn} onPressOut={handlePressOut}>
      <Animated.View
        style={[
          compact ? styles.productCardCompact : styles.productCard,
          { transform: [{ scale: scaleAnim }] },
        ]}
      >
        {/* Discount Badge */}
        <View style={styles.discountBadge}>
          <Text style={styles.discountText}>-{product.discount}%</Text>
        </View>

        {/* Product Image */}
        <View style={styles.productImageContainer}>
          <Image
            source={product.image}
            style={styles.productImage}
            resizeMode="cover"
          />
        </View>

        {/* Wishlist Button */}
        <Pressable style={styles.wishlistButton}>
          <Text style={styles.wishlistIcon}>&#9825;</Text>
        </Pressable>

        {/* Product Info */}
        <View style={styles.productInfo}>
          {/* Rating */}
          <View style={styles.ratingContainer}>
            <Text style={styles.starIcon}>&#9733;</Text>
            <Text style={styles.ratingText}>{product.rating}</Text>
            <Text style={styles.reviewsText}>({product.reviews})</Text>
          </View>

          <Text style={styles.brandText}>{product.brand}</Text>
          <Text style={styles.productName} numberOfLines={1}>
            {product.name}
          </Text>

          {/* Price */}
          <View style={styles.priceContainer}>
            <Text style={styles.originalPrice}>{product.originalPrice}</Text>
            <Text style={styles.currentPrice}>{product.price}</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  )
}

export const MarketplaceScreen: FC = function MarketplaceScreen() {
  const $topInsets = useSafeAreaInsetsStyle(["top"])

  return (
    <View style={[styles.container, $topInsets]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
            <Pressable style={styles.iconButton}>
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>3</Text>
              </View>
              <Text style={styles.iconText}>&#128722;</Text>
            </Pressable>
          </View>
        </View>

        {/* Hero Banner */}
        <View style={styles.heroBanner}>
          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>NEW COLLECTION</Text>
            <Text style={styles.heroTitle}>Premium{"\n"}Tech Gear</Text>
            <Text style={styles.heroSubtitle}>Discover the future of technology</Text>
            <Pressable style={styles.heroButton}>
              <Text style={styles.heroButtonText}>EXPLORE NOW</Text>
            </Pressable>
          </View>
          <View style={styles.heroAccent} />
        </View>

        {/* Categories */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.categoriesContainer}
          contentContainerStyle={styles.categoriesContent}
        >
          {CATEGORIES.map((category) => (
            <Pressable key={category.id} style={styles.categoryChip}>
              <Text style={styles.categoryName}>{category.name}</Text>
              <Text style={styles.categoryCount}>{category.count}</Text>
            </Pressable>
          ))}
        </ScrollView>

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

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsRow}
          >
            {NEW_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </ScrollView>
        </View>

        {/* Sale Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.saleSectionTitle}>Sale</Text>
              <Text style={styles.sectionSubtitle}>Super summer sale</Text>
            </View>
            <Pressable>
              <Text style={styles.viewAllText}>View all</Text>
            </Pressable>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.productsRow}
          >
            {SALE_PRODUCTS.map((product) => (
              <ProductCard key={product.id} product={product} compact />
            ))}
          </ScrollView>
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

  // Product Card
  productCard: {
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

  originalPrice: {
    fontSize: 12,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    marginRight: 8,
  } as TextStyle,

  currentPrice: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.danger,
  } as TextStyle,
})
