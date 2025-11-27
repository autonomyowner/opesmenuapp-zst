import { FC, useCallback, useRef, useState, useEffect } from "react"
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Pressable,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  StatusBar,
  Platform,
} from "react-native"
import { Video, ResizeMode } from "expo-av"
import { LinearGradient } from "expo-linear-gradient"
import PagerView from "react-native-pager-view"

import { Text } from "@/components/Text"
import { useProductReels } from "@/hooks/useProductReels"
import { ProductReel, ProductWithImage } from "@/services/supabase/productService"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

// Dark immersive cinema palette with Luxe Art Deco gold
const COLORS = {
  background: "#000000",
  surface: "#0A0A0A",
  overlay: "rgba(0,0,0,0.3)",
  overlayDark: "rgba(0,0,0,0.6)",
  // Luxe Art Deco gold palette (matching Dashboard)
  gold: "#C9A227",
  goldLight: "#E8C547",
  goldDark: "#9A7B1A",
  goldMuted: "rgba(201, 162, 39, 0.15)",
  accent: "#C9A227", // Updated to match gold
  accentGlow: "rgba(201, 162, 39, 0.4)",
  white: "#FFFFFF",
  whiteMuted: "rgba(255,255,255,0.85)",
  whiteSubtle: "rgba(255,255,255,0.6)",
  whiteGhost: "rgba(255,255,255,0.3)",
  success: "#22C55E",
}

interface ShopScreenProps {
  isVisible?: boolean
  onProductPress?: (product: ProductWithImage) => void
}

interface ReelItemProps {
  reel: ProductReel
  isActive: boolean
  index: number
  isScreenVisible: boolean
  onBuyPress: (reel: ProductReel) => void
}

const ReelItem: FC<ReelItemProps> = ({ reel, isActive, index, isScreenVisible, onBuyPress }) => {
  const videoRef = useRef<Video>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [isVideoLoading, setIsVideoLoading] = useState(true)

  // Determine if video should actually play (both active reel AND screen visible)
  const shouldPlay = isActive && isScreenVisible
  const [showHeart, setShowHeart] = useState(false)

  // Animations
  const heartScale = useRef(new Animated.Value(0)).current
  const heartOpacity = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // Handle video playback based on active state and screen visibility
  useEffect(() => {
    if (shouldPlay) {
      videoRef.current?.playAsync()
      setIsPlaying(true)
      // Animate in overlay elements
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          delay: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start()
    } else {
      videoRef.current?.pauseAsync()
      setIsPlaying(false)
      fadeAnim.setValue(0)
      slideAnim.setValue(50)
    }
  }, [shouldPlay, fadeAnim, slideAnim])

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      videoRef.current?.pauseAsync()
    } else {
      videoRef.current?.playAsync()
    }
    setIsPlaying(!isPlaying)
  }, [isPlaying])

  const handleDoubleTap = useCallback(() => {
    setShowHeart(true)

    heartScale.setValue(0)
    heartOpacity.setValue(1)

    Animated.sequence([
      Animated.spring(heartScale, {
        toValue: 1,
        tension: 100,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.timing(heartOpacity, {
        toValue: 0,
        duration: 400,
        delay: 200,
        useNativeDriver: true,
      }),
    ]).start(() => setShowHeart(false))
  }, [heartScale, heartOpacity])

  // Double tap detection
  const lastTap = useRef<number>(0)
  const handleTap = useCallback(() => {
    const now = Date.now()
    if (now - lastTap.current < 300) {
      handleDoubleTap()
    } else {
      togglePlayPause()
    }
    lastTap.current = now
  }, [handleDoubleTap, togglePlayPause])

  const handleVideoLoad = useCallback(() => {
    setIsVideoLoading(false)
  }, [])

  // Format price with DA currency
  const formatPrice = (price: number) => {
    return `${price.toLocaleString()} DA`
  }

  return (
    <View style={styles.reelContainer}>
      {/* Video */}
      <Pressable style={styles.videoWrapper} onPress={handleTap}>
        <Video
          ref={videoRef}
          source={{ uri: reel.video_url }}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={shouldPlay}
          isMuted={false}
          onLoad={handleVideoLoad}
        />

        {/* Loading indicator */}
        {isVideoLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}

        {/* Pause indicator */}
        {!isPlaying && !isVideoLoading && (
          <View style={styles.pauseOverlay}>
            <View style={styles.pauseIcon}>
              <View style={styles.pauseBar} />
              <View style={styles.pauseBar} />
            </View>
          </View>
        )}

        {/* Double tap heart animation */}
        {showHeart && (
          <Animated.View
            style={[
              styles.bigHeart,
              {
                transform: [{ scale: heartScale }],
                opacity: heartOpacity,
              },
            ]}
          >
            <Text style={styles.bigHeartText}>&#9829;</Text>
          </Animated.View>
        )}
      </Pressable>

      {/* Right side actions (placeholder for like, comment, share) */}
      <Animated.View
        style={[
          styles.rightActions,
          {
            opacity: fadeAnim,
          },
        ]}
      >
        {/* Placeholder for future actions */}
      </Animated.View>

      {/* Bottom info overlay */}
      <Animated.View
        style={[
          styles.bottomOverlay,
          {
            opacity: fadeAnim,
            transform: [{ translateY: Animated.multiply(slideAnim, -0.5) }],
          },
        ]}
      >
        {/* Seller info row */}
        <View style={styles.sellerRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {reel.seller_name.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.sellerInfo}>
            <Text style={styles.sellerName}>{reel.seller_name}</Text>
            <Text style={styles.productName} numberOfLines={1}>
              {reel.product_name}
            </Text>
          </View>
        </View>

        {/* Price and Buy button row */}
        <View style={styles.actionRow}>
          <Text style={styles.priceValue}>{formatPrice(reel.product_price)}</Text>
          <Pressable
            style={styles.buyButton}
            onPress={() => onBuyPress(reel)}
          >
            <LinearGradient
              colors={[COLORS.goldDark, COLORS.gold, COLORS.goldLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.buyButtonGradient}
            >
              <Text style={styles.buyButtonText}>BUY</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </Animated.View>

      {/* Progress bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <Animated.View style={styles.progressFill} />
        </View>
      </View>
    </View>
  )
}

export const ShopScreen: FC<ShopScreenProps> = function ShopScreen({
  isVisible = true,
  onProductPress,
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const pagerRef = useRef<PagerView>(null)

  const { reels, isLoading, error, refresh, getProductDetails } = useProductReels({
    enabled: true,
    limit: 20,
  })

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    setActiveIndex(e.nativeEvent.position)
  }, [])

  const handleBuyPress = useCallback(
    async (reel: ProductReel) => {
      if (!onProductPress) return

      // Fetch full product details
      const product = await getProductDetails(reel.product_id)
      if (product) {
        onProductPress(product)
      }
    },
    [onProductPress, getProductDetails]
  )

  // Empty state - no reels available
  if (!isLoading && reels.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <View style={styles.emptyContent}>
          <Text style={styles.emptyTitle}>No Reels Yet</Text>
          <Text style={styles.emptySubtitle}>
            Sellers haven't uploaded any product videos yet.
          </Text>
          <Text style={styles.emptyHint}>
            Check back soon for exciting product showcases!
          </Text>
          <Pressable style={styles.refreshButton} onPress={refresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </Pressable>
        </View>
      </View>
    )
  }

  // Loading state
  if (isLoading && reels.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        <ActivityIndicator size="large" color={COLORS.accent} />
        <Text style={styles.loadingText}>Loading reels...</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reels</Text>
        <View style={styles.headerTabs}>
          <Pressable style={styles.headerTab}>
            <Text style={[styles.headerTabText, styles.headerTabActive]}>Trending</Text>
            <View style={styles.headerTabIndicator} />
          </Pressable>
          <Pressable style={styles.headerTab} onPress={refresh}>
            <Text style={styles.headerTabText}>New</Text>
          </Pressable>
        </View>
      </View>

      {/* Vertical Pager for Reels */}
      <PagerView
        ref={pagerRef}
        style={styles.pager}
        initialPage={0}
        orientation="vertical"
        onPageSelected={handlePageSelected}
        overdrag
      >
        {reels.map((reel, index) => (
          <View key={reel.id} style={styles.page}>
            <ReelItem
              reel={reel}
              isActive={index === activeIndex}
              index={index}
              isScreenVisible={isVisible}
              onBuyPress={handleBuyPress}
            />
          </View>
        ))}
      </PagerView>

      {/* Swipe hint for first load */}
      {activeIndex === 0 && reels.length > 1 && (
        <View style={styles.swipeHint}>
          <View style={styles.swipeArrow} />
          <Text style={styles.swipeText}>Swipe up for more</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  // Loading state
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.whiteSubtle,
  } as TextStyle,

  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  } as ViewStyle,

  emptyContent: {
    alignItems: "center",
  } as ViewStyle,

  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
  } as TextStyle,

  emptySubtitle: {
    fontSize: 16,
    color: COLORS.whiteSubtle,
    textAlign: "center",
    marginBottom: 8,
  } as TextStyle,

  emptyHint: {
    fontSize: 14,
    color: COLORS.whiteGhost,
    textAlign: "center",
    marginBottom: 24,
  } as TextStyle,

  refreshButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
    borderRadius: 8,
  } as ViewStyle,

  refreshButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.background,
  } as TextStyle,

  // Header
  header: {
    position: "absolute",
    top: Platform.OS === "ios" ? 50 : 30,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 20,
  } as ViewStyle,

  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: COLORS.white,
    textAlign: "center",
    letterSpacing: 1,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    marginBottom: 12,
  } as TextStyle,

  headerTabs: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  } as ViewStyle,

  headerTab: {
    alignItems: "center",
  } as ViewStyle,

  headerTabText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.whiteSubtle,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  headerTabActive: {
    color: COLORS.white,
  } as TextStyle,

  headerTabIndicator: {
    width: 24,
    height: 3,
    backgroundColor: COLORS.white,
    borderRadius: 2,
    marginTop: 6,
  } as ViewStyle,

  // Pager
  pager: {
    flex: 1,
  } as ViewStyle,

  page: {
    flex: 1,
  } as ViewStyle,

  // Reel Item
  reelContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,

  videoWrapper: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  video: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  } as ViewStyle,

  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  // Pause overlay
  pauseOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.overlay,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  pauseIcon: {
    flexDirection: "row",
    gap: 12,
  } as ViewStyle,

  pauseBar: {
    width: 8,
    height: 40,
    backgroundColor: COLORS.white,
    borderRadius: 4,
  } as ViewStyle,

  // Double tap heart
  bigHeart: {
    position: "absolute",
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,

  bigHeartText: {
    fontSize: 120,
    color: COLORS.accent,
    textShadowColor: COLORS.accentGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 30,
  } as TextStyle,

  // Right side actions container (for like, comment, share)
  rightActions: {
    position: "absolute",
    right: 12,
    bottom: 160,
    alignItems: "center",
    gap: 20,
  } as ViewStyle,

  // Bottom overlay
  bottomOverlay: {
    position: "absolute",
    bottom: 20,
    left: 12,
    right: 80,
  } as ViewStyle,

  sellerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  } as ViewStyle,

  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
  } as ViewStyle,

  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.background,
  } as TextStyle,

  sellerInfo: {
    flex: 1,
  } as ViewStyle,

  sellerName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  productName: {
    fontSize: 13,
    fontWeight: "500",
    color: COLORS.whiteMuted,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  // Action row with price and buy button
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  } as ViewStyle,

  priceValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.accent,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  buyButton: {
    borderRadius: 8,
    overflow: "hidden",
  } as ViewStyle,

  buyButtonGradient: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    alignItems: "center",
    justifyContent: "center",
  } as ViewStyle,

  buyButtonText: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.background,
    letterSpacing: 2,
  } as TextStyle,

  // Progress bar
  progressContainer: {
    position: "absolute",
    bottom: 5,
    left: 0,
    right: 0,
    paddingHorizontal: 2,
  } as ViewStyle,

  progressBar: {
    height: 2,
    backgroundColor: COLORS.whiteGhost,
    borderRadius: 1,
  } as ViewStyle,

  progressFill: {
    height: "100%",
    width: "35%",
    backgroundColor: COLORS.white,
    borderRadius: 1,
  } as ViewStyle,

  // Swipe hint
  swipeHint: {
    position: "absolute",
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: "center",
  } as ViewStyle,

  swipeArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderBottomColor: COLORS.whiteSubtle,
    marginBottom: 6,
  } as ViewStyle,

  swipeText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.whiteSubtle,
    letterSpacing: 0.5,
  } as TextStyle,
})
