import { FC, useRef, useState, useEffect, useCallback } from "react"
import {
  View,
  StyleSheet,
  Pressable,
  ViewStyle,
  Animated,
} from "react-native"
import PagerView from "react-native-pager-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { MarketplaceScreen } from "./MarketplaceScreen"
import { ShopScreen } from "./ShopScreen"
import { CartScreen } from "./CartScreen"
import { DashboardScreen } from "./DashboardScreen"
import { ProfileScreen } from "./ProfileScreen"
import { ProductDetailScreen } from "./ProductDetailScreen"
import { ProductWithImage } from "@/services/supabase/productService"
import { TabIcon } from "@/components/TabIcon"
import { useAuth } from "@/context/AuthContext"
import { useRealtimeOrders } from "@/hooks/useRealtimeOrders"
import { getCartItemCount, cartEvents, removeFromCart } from "@/services/supabase/cartService"

const COLORS = {
  background: "#0D0D0D",
  navBackground: "#0A0A0A",
  accent: "#D4A84B",
  iconInactive: "#4A4A4A",
  iconActive: "#FFFFFF",
  divider: "rgba(255, 255, 255, 0.06)",
}

const TABS = [
  { key: "home", label: "Home", iconName: "home" as const },
  { key: "shop", label: "Shop", iconName: "shop" as const },
  { key: "freelance", label: "Freelance", iconName: "freelance" as const },
  { key: "dashboard", label: "Dashboard", iconName: "dashboard" as const },
  { key: "profile", label: "Profile", iconName: "profile" as const },
]

interface SelectedProductState {
  product: ProductWithImage
  initialQuantity?: number
  cartItemId?: string
}

export const MainTabsScreen: FC = function MainTabsScreen() {
  const insets = useSafeAreaInsets()
  const pagerRef = useRef<PagerView>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [selectedProduct, setSelectedProduct] = useState<SelectedProductState | null>(null)

  // Get authenticated user
  const { user } = useAuth()

  // Subscribe to real-time orders for seller (only if user is authenticated and is a seller)
  const { pendingCount } = useRealtimeOrders({
    sellerId: user?.id || '',
    enabled: !!user?.id && user?.role === 'seller',
  })

  // Cart item count for badge
  const [cartCount, setCartCount] = useState(0)

  const loadCartCount = useCallback(async () => {
    if (user) {
      const count = await getCartItemCount()
      setCartCount(count)
    } else {
      setCartCount(0)
    }
  }, [user])

  // Load cart count and subscribe to changes
  useEffect(() => {
    if (user) {
      loadCartCount()
      const unsubscribe = cartEvents.subscribe(() => {
        loadCartCount()
      })
      return unsubscribe
    } else {
      setCartCount(0)
    }
    return undefined
  }, [user, loadCartCount])

  // Animation values for each tab
  const scaleAnims = useRef(
    TABS.map(() => new Animated.Value(1))
  ).current

  const handlePageSelected = (e: { nativeEvent: { position: number } }) => {
    const position = e.nativeEvent.position
    setCurrentPage(position)

    // Animate all tabs
    scaleAnims.forEach((anim, i) => {
      Animated.spring(anim, {
        toValue: i === position ? 1.15 : 1,
        useNativeDriver: true,
        friction: 6,
        tension: 120,
      }).start()
    })
  }

  const handleTabPress = (index: number) => {
    // Immediate scale down feedback
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnims[index], {
        toValue: currentPage === index ? 1.15 : 1,
        friction: 6,
        tension: 120,
        useNativeDriver: true,
      }),
    ]).start()

    pagerRef.current?.setPage(index)
  }

  const handleNavigateToCart = () => {
    pagerRef.current?.setPage(2) // Cart is at index 2
  }

  const handleProductPress = (product: ProductWithImage) => {
    setSelectedProduct({ product })
  }

  const handleCartCheckoutItem = (product: ProductWithImage, quantity: number, cartItemId: string) => {
    setSelectedProduct({ product, initialQuantity: quantity, cartItemId })
  }

  const handleBackFromProduct = async () => {
    // If this was a cart checkout and order was placed, remove item from cart
    if (selectedProduct?.cartItemId) {
      await removeFromCart(selectedProduct.cartItemId)
    }
    setSelectedProduct(null)
  }

  const handleCancelFromProduct = () => {
    // Just go back without removing from cart
    setSelectedProduct(null)
  }

  // Show ProductDetailScreen if a product is selected
  if (selectedProduct) {
    return (
      <ProductDetailScreen
        product={selectedProduct.product}
        initialQuantity={selectedProduct.initialQuantity}
        cartItemId={selectedProduct.cartItemId}
        onBack={handleBackFromProduct}
        onCancel={handleCancelFromProduct}
      />
    )
  }

  return (
    <View style={styles.container}>
      {/* Swipeable Content */}
      <PagerView
        ref={pagerRef}
        style={styles.pagerView}
        initialPage={0}
        onPageSelected={handlePageSelected}
        overdrag={true}
        overScrollMode="always"
      >
        <View key="home" style={styles.page}>
          <MarketplaceScreen onNavigateToCart={handleNavigateToCart} onProductPress={handleProductPress} />
        </View>
        <View key="shop" style={styles.page}>
          <ShopScreen isVisible={currentPage === 1} onProductPress={handleProductPress} />
        </View>
        <View key="cart" style={styles.page}>
          <CartScreen isVisible={currentPage === 2} onCheckoutItem={handleCartCheckoutItem} />
        </View>
        <View key="dashboard" style={styles.page}>
          <DashboardScreen />
        </View>
        <View key="profile" style={styles.page}>
          <ProfileScreen />
        </View>
      </PagerView>

      {/* Fixed Bottom Tab Bar */}
      <View style={[styles.tabBarContainer, { paddingBottom: Math.max(insets.bottom, 8) }]}>
        <View style={styles.divider} />
        <View style={styles.tabBar}>
          {TABS.map((tab, index) => (
            <Pressable
              key={tab.key}
              style={styles.tabItem}
              onPress={() => handleTabPress(index)}
            >
              <Animated.View
                style={[
                  styles.iconWrapper,
                  {
                    transform: [{ scale: scaleAnims[index] }],
                  },
                ]}
              >
                <TabIcon
                  name={tab.iconName}
                  active={currentPage === index}
                  size={22}
                  color={currentPage === index ? COLORS.iconActive : COLORS.iconInactive}
                  badge={tab.key === 'dashboard' ? pendingCount : tab.key === 'freelance' ? cartCount : undefined}
                  badgeColor={tab.key === 'freelance' ? '#22C55E' : '#D4A84B'}
                />
              </Animated.View>
            </Pressable>
          ))}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  pagerView: {
    flex: 1,
  } as ViewStyle,

  page: {
    flex: 1,
  } as ViewStyle,

  tabBarContainer: {
    backgroundColor: COLORS.navBackground,
  } as ViewStyle,

  divider: {
    height: 1,
    backgroundColor: COLORS.divider,
  } as ViewStyle,

  tabBar: {
    flexDirection: "row",
    paddingTop: 8,
    paddingBottom: 4,
  } as ViewStyle,

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  iconWrapper: {
    alignItems: "center",
    justifyContent: "center",
    width: 40,
    height: 40,
  } as ViewStyle,
})
