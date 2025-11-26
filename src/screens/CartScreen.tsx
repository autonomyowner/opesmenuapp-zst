import { FC, useState, useEffect, useCallback, useRef } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageStyle,
  Animated,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import Svg, { Path } from "react-native-svg"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAuth } from "@/context/AuthContext"
import {
  getCartItems,
  updateCartItemQuantity,
  removeFromCart,
  clearCart,
  subscribeToCart,
  CartItem,
} from "@/services/supabase/cartService"
import { ProductWithImage } from "@/services/supabase/productService"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Luxe Art Deco Color Palette - matching Dashboard
const COLORS = {
  background: "#08080A",
  surface: "#111114",
  surfaceElevated: "#1A1A1F",
  surfaceBorder: "#2A2A30",
  gold: "#C9A227",
  goldLight: "#E8C547",
  goldDark: "#9A7B1A",
  goldMuted: "rgba(201, 162, 39, 0.15)",
  text: "#FAFAFA",
  textSecondary: "#9A9AA0",
  textMuted: "#5A5A60",
  success: "#22C55E",
  successMuted: "rgba(34, 197, 94, 0.15)",
  warning: "#F59E0B",
  warningMuted: "rgba(245, 158, 11, 0.15)",
  error: "#EF4444",
  errorMuted: "rgba(239, 68, 68, 0.15)",
}

// Minimal SVG Icons
const TrashIcon: FC<{ size?: number; color?: string }> = ({ size = 18, color = COLORS.error }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M3 6H5H21"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <Path
      d="M19 6V20C19 21.1 18.1 22 17 22H7C5.9 22 5 21.1 5 20V6M8 6V4C8 2.9 8.9 2 10 2H14C15.1 2 16 2.9 16 4V6"
      stroke={color}
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const PlusIcon: FC<{ size?: number; color?: string }> = ({ size = 14, color = COLORS.text }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M12 5V19M5 12H19"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

const MinusIcon: FC<{ size?: number; color?: string }> = ({ size = 14, color = COLORS.text }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path
      d="M5 12H19"
      stroke={color}
      strokeWidth={2.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </Svg>
)

interface CartScreenProps {
  isVisible?: boolean
  onCheckoutItem?: (product: ProductWithImage, quantity: number, cartItemId: string) => void
}

interface CartItemCardProps {
  item: CartItem
  index: number
  onUpdateQuantity: (id: string, quantity: number) => void
  onRemove: (id: string) => void
  onCheckout: (item: CartItem) => void
}

const CartItemCard: FC<CartItemCardProps> = ({ item, index, onUpdateQuantity, onRemove, onCheckout }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 80,
        friction: 12,
        delay: index * 80,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        delay: index * 80,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  const handleRemove = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -50,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onRemove(item.id)
    })
  }

  const itemTotal = item.product_price * item.quantity

  return (
    <Animated.View
      style={[
        styles.cartItemCard,
        {
          opacity: scaleAnim,
          transform: [
            { scale: scaleAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
            { translateY: slideAnim },
          ],
        },
      ]}
    >
      {/* Product Image */}
      <TouchableOpacity
        style={styles.cartItemImageContainer}
        onPress={() => onCheckout(item)}
        activeOpacity={0.8}
      >
        {item.product_image ? (
          <Image
            source={{ uri: item.product_image }}
            style={styles.cartItemImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.cartItemImagePlaceholder}>
            <Text style={styles.cartItemImagePlaceholderText}>
              {item.product_name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        {/* Gold accent corner */}
        <View style={styles.imageAccent} />
      </TouchableOpacity>

      {/* Product Info */}
      <View style={styles.cartItemInfo}>
        <TouchableOpacity onPress={() => onCheckout(item)} activeOpacity={0.7}>
          <Text style={styles.cartItemName} numberOfLines={2}>
            {item.product_name}
          </Text>
        </TouchableOpacity>

        <Text style={styles.cartItemPrice}>
          {item.product_price.toLocaleString("fr-DZ")} DA
        </Text>

        {/* Quantity Controls */}
        <View style={styles.quantityRow}>
          <View style={styles.quantityContainer}>
            <TouchableOpacity
              style={[
                styles.quantityButton,
                item.quantity <= 1 && styles.quantityButtonDisabled,
              ]}
              onPress={() => onUpdateQuantity(item.id, item.quantity - 1)}
              activeOpacity={0.7}
            >
              <MinusIcon size={12} color={item.quantity <= 1 ? COLORS.textMuted : COLORS.text} />
            </TouchableOpacity>

            <View style={styles.quantityDisplay}>
              <Text style={styles.quantityText}>{item.quantity}</Text>
            </View>

            <TouchableOpacity
              style={styles.quantityButton}
              onPress={() => onUpdateQuantity(item.id, item.quantity + 1)}
              activeOpacity={0.7}
            >
              <PlusIcon size={12} color={COLORS.text} />
            </TouchableOpacity>
          </View>

          {/* Remove Button */}
          <TouchableOpacity
            style={styles.removeButton}
            onPress={handleRemove}
            activeOpacity={0.7}
          >
            <TrashIcon size={16} color={COLORS.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Item Total & Checkout */}
      <View style={styles.itemFooter}>
        <View style={styles.itemTotalSection}>
          <Text style={styles.itemTotalLabel}>SOUS-TOTAL</Text>
          <Text style={styles.itemTotalPrice}>
            {itemTotal.toLocaleString("fr-DZ")} DA
          </Text>
        </View>

        <TouchableOpacity
          style={styles.itemCheckoutButton}
          onPress={() => onCheckout(item)}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.goldDark, COLORS.gold]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.checkoutGradient}
          >
            <Text style={styles.itemCheckoutButtonText}>Commander</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

// Summary Card Component
const CartSummary: FC<{ itemCount: number; totalAmount: number }> = ({ itemCount, totalAmount }) => (
  <View style={styles.summaryCard}>
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Articles</Text>
      <Text style={styles.summaryValue}>{itemCount}</Text>
    </View>
    <View style={styles.summaryDivider} />
    <View style={styles.summaryRow}>
      <Text style={styles.summaryLabel}>Total Panier</Text>
      <Text style={styles.summaryTotal}>{totalAmount.toLocaleString("fr-DZ")} DA</Text>
    </View>
  </View>
)

// Empty State Component
const EmptyCartView: FC<{ isGuest?: boolean }> = ({ isGuest }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const scaleAnim = useRef(new Animated.Value(0.9)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 60,
        friction: 12,
        useNativeDriver: true,
      }),
    ]).start()
  }, [])

  return (
    <Animated.View
      style={[
        styles.emptyContainer,
        { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
      ]}
    >
      <View style={styles.emptyIconContainer}>
        <View style={styles.emptyIconInner}>
          <Text style={styles.emptyIcon}>[ ]</Text>
        </View>
      </View>

      <Text style={styles.emptyTitle}>
        {isGuest ? "Acces Reserve" : "Panier Vide"}
      </Text>

      <Text style={styles.emptySubtitle}>
        {isGuest
          ? "Connectez-vous pour acceder a votre panier"
          : "Explorez notre catalogue et ajoutez des produits"}
      </Text>

      <View style={styles.emptyDivider} />

      <Text style={styles.emptyHint}>
        {isGuest
          ? "Allez dans Profil pour vous connecter"
          : "Vos articles seront sauvegardes"}
      </Text>
    </Animated.View>
  )
}

export const CartScreen: FC<CartScreenProps> = function CartScreen({
  isVisible = false,
  onCheckoutItem,
}) {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { user } = useAuth()
  const [cartItems, setCartItems] = useState<CartItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const hasLoadedOnce = useRef(false)

  const headerAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(headerAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start()
  }, [])

  // Load cart items
  const loadCartItems = useCallback(async () => {
    try {
      const items = await getCartItems()
      setCartItems(items)
    } catch (error) {
      console.error("Error loading cart:", error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // Initial load and subscription
  useEffect(() => {
    if (user) {
      loadCartItems()
      hasLoadedOnce.current = true
      const subscription = subscribeToCart(setCartItems)
      return () => subscription.unsubscribe()
    } else {
      setIsLoading(false)
    }
    return undefined
  }, [user, loadCartItems])

  // Reload cart when tab becomes visible
  useEffect(() => {
    if (isVisible && user && hasLoadedOnce.current) {
      loadCartItems()
    }
  }, [isVisible, user, loadCartItems])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadCartItems()
    setRefreshing(false)
  }, [loadCartItems])

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      setCartItems((prev) => prev.filter((item) => item.id !== itemId))
      await removeFromCart(itemId)
    } else {
      setCartItems((prev) =>
        prev.map((item) =>
          item.id === itemId ? { ...item, quantity: newQuantity } : item
        )
      )
      await updateCartItemQuantity(itemId, newQuantity)
    }
  }

  const handleRemoveItem = async (itemId: string) => {
    setCartItems((prev) => prev.filter((item) => item.id !== itemId))
    await removeFromCart(itemId)
  }

  const handleClearCart = async () => {
    setCartItems([])
    await clearCart()
  }

  const handleCheckoutItem = (item: CartItem) => {
    if (onCheckoutItem) {
      const product: ProductWithImage = {
        id: item.product_id,
        name: item.product_name,
        slug: item.product_id,
        price: item.product_price,
        image_url: item.product_image,
        brand: "",
        category: "",
        description: undefined,
        original_price: undefined,
        is_new: false,
        is_promo: false,
        in_stock: true,
        rating: undefined,
        viewers_count: undefined,
        video_url: undefined,
        seller_id: undefined,
        created_at: item.created_at,
        updated_at: item.updated_at,
      }
      onCheckoutItem(product, item.quantity, item.id)
    }
  }

  // Calculate totals
  const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0)
  const totalAmount = cartItems.reduce(
    (sum, item) => sum + item.product_price * item.quantity,
    0
  )

  // Not authenticated
  if (!user) {
    return (
      <View style={[styles.container, $topInsets]}>
        <Animated.View
          style={[styles.header, { opacity: headerAnim }]}
        >
          <View>
            <Text style={styles.headerLabel}>VOTRE</Text>
            <Text style={styles.headerTitle}>Panier</Text>
          </View>
        </Animated.View>
        <EmptyCartView isGuest />
      </View>
    )
  }

  // Loading state
  if (isLoading) {
    return (
      <View style={[styles.container, $topInsets]}>
        <Animated.View style={[styles.header, { opacity: headerAnim }]}>
          <View>
            <Text style={styles.headerLabel}>VOTRE</Text>
            <Text style={styles.headerTitle}>Panier</Text>
          </View>
        </Animated.View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.gold} />
          <Text style={styles.loadingText}>Chargement...</Text>
        </View>
      </View>
    )
  }

  return (
    <View style={[styles.container, $topInsets]}>
      {/* Header */}
      <Animated.View style={[styles.header, { opacity: headerAnim }]}>
        <View>
          <Text style={styles.headerLabel}>VOTRE</Text>
          <Text style={styles.headerTitle}>Panier</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClearCart}
            activeOpacity={0.7}
          >
            <Text style={styles.clearButtonText}>Vider</Text>
          </TouchableOpacity>
        )}
      </Animated.View>

      {cartItems.length === 0 ? (
        <EmptyCartView />
      ) : (
        <>
          {/* Cart Summary */}
          <CartSummary itemCount={itemCount} totalAmount={totalAmount} />

          {/* Cart Items */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, $bottomInsets]}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={COLORS.gold}
                colors={[COLORS.gold]}
              />
            }
          >
            <Text style={styles.sectionTitle}>ARTICLES</Text>

            {cartItems.map((item, index) => (
              <CartItemCard
                key={item.id}
                item={item}
                index={index}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                onCheckout={handleCheckoutItem}
              />
            ))}

            {/* Bottom hint */}
            <View style={styles.bottomHint}>
              <Text style={styles.bottomHintText}>
                Cliquez sur "Commander" pour passer commande
              </Text>
            </View>

            <View style={{ height: 100 }} />
          </ScrollView>
        </>
      )}

      {/* Top gradient overlay */}
      <LinearGradient
        colors={["rgba(8, 8, 10, 1)", "rgba(8, 8, 10, 0)"]}
        style={styles.topGradient}
        pointerEvents="none"
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  topGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 60,
  } as ViewStyle,

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  } as ViewStyle,

  headerLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 2,
    marginBottom: 2,
  } as TextStyle,

  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  clearButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.errorMuted,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  } as ViewStyle,

  clearButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.error,
  } as TextStyle,

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Summary Card
  summaryCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
  } as ViewStyle,

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,

  summaryLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,

  summaryValue: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,

  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 12,
  } as ViewStyle,

  summaryTotal: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,

  // Scroll
  scrollView: {
    flex: 1,
  } as ViewStyle,

  scrollContent: {
    paddingHorizontal: 16,
  } as ViewStyle,

  sectionTitle: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1.5,
    marginBottom: 12,
  } as TextStyle,

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingBottom: 80,
  } as ViewStyle,

  emptyIconContainer: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  } as ViewStyle,

  emptyIconInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: COLORS.goldMuted,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  emptyIcon: {
    fontSize: 24,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,

  emptyTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 10,
    textAlign: "center",
  } as TextStyle,

  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  } as TextStyle,

  emptyDivider: {
    height: 1,
    width: 60,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 20,
  } as ViewStyle,

  emptyHint: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,

  // Cart Item Card
  cartItemCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 10,
  } as ViewStyle,

  cartItemImageContainer: {
    width: 72,
    height: 72,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surfaceElevated,
    position: "absolute",
    top: 14,
    left: 14,
  } as ViewStyle,

  cartItemImage: {
    width: "100%",
    height: "100%",
  } as ImageStyle,

  cartItemImagePlaceholder: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.goldMuted,
  } as ViewStyle,

  cartItemImagePlaceholderText: {
    fontSize: 26,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,

  imageAccent: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    backgroundColor: COLORS.goldMuted,
    borderTopLeftRadius: 10,
  } as ViewStyle,

  cartItemInfo: {
    marginLeft: 86,
    minHeight: 72,
  } as ViewStyle,

  cartItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
    lineHeight: 18,
  } as TextStyle,

  cartItemPrice: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gold,
    marginBottom: 10,
  } as TextStyle,

  quantityRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  } as ViewStyle,

  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,

  quantityButton: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  quantityButtonDisabled: {
    opacity: 0.4,
  } as ViewStyle,

  quantityDisplay: {
    paddingHorizontal: 12,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,

  quantityText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  removeButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: COLORS.errorMuted,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  // Item Footer
  itemFooter: {
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,

  itemTotalSection: {} as ViewStyle,

  itemTotalLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 0.5,
    marginBottom: 2,
  } as TextStyle,

  itemTotalPrice: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  itemCheckoutButton: {
    borderRadius: 10,
    overflow: "hidden",
  } as ViewStyle,

  checkoutGradient: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  } as ViewStyle,

  itemCheckoutButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.background,
    letterSpacing: 0.3,
  } as TextStyle,

  // Bottom Hint
  bottomHint: {
    alignItems: "center",
    paddingVertical: 20,
  } as ViewStyle,

  bottomHintText: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
})
