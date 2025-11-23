import { FC, useCallback, useRef, useState, useEffect } from "react"
import {
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
import PagerView from "react-native-pager-view"
import { Text } from "@/components/Text"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

// Dark immersive cinema palette
const COLORS = {
  background: "#000000",
  surface: "#0A0A0A",
  overlay: "rgba(0,0,0,0.3)",
  overlayDark: "rgba(0,0,0,0.6)",
  accent: "#FF2D55",
  accentGlow: "rgba(255,45,85,0.4)",
  white: "#FFFFFF",
  whiteMuted: "rgba(255,255,255,0.85)",
  whiteSubtle: "rgba(255,255,255,0.6)",
  whiteGhost: "rgba(255,255,255,0.3)",
}

// Sample reels data using local videos
const REELS_DATA = [
  {
    id: "1",
    video: require("../../assets/videos/DJwd0gEh5mS.mp4"),
    username: "@zst_official",
    caption: "New collection dropping soon. Stay tuned for the reveal.",
  },
  {
    id: "2",
    video: require("../../assets/videos/DFwAwjbRNR9.mp4"),
    username: "@fashion_forward",
    caption: "Street style meets haute couture. This is the future.",
  },
  {
    id: "3",
    video: require("../../assets/videos/DCXARZ4SQKs.mp4"),
    username: "@style_maven",
    caption: "Behind the scenes of our latest photoshoot. Pure magic.",
  },
  {
    id: "4",
    video: require("../../assets/videos/DDsWliiOVxD.mp4"),
    username: "@urban_threads",
    caption: "Craftsmanship meets creativity. Every stitch tells a story.",
  },
]

interface ReelItemProps {
  reel: (typeof REELS_DATA)[0]
  isActive: boolean
  index: number
}

const ReelItem: FC<ReelItemProps> = ({ reel, isActive, index }) => {
  const videoRef = useRef<Video>(null)
  const [isPlaying, setIsPlaying] = useState(true)
  const [showHeart, setShowHeart] = useState(false)

  // Animations
  const heartScale = useRef(new Animated.Value(0)).current
  const heartOpacity = useRef(new Animated.Value(0)).current
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(50)).current

  // Handle video playback based on active state
  useEffect(() => {
    if (isActive) {
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
  }, [isActive, fadeAnim, slideAnim])

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

  return (
    <View style={styles.reelContainer}>
      {/* Video */}
      <Pressable style={styles.videoWrapper} onPress={handleTap}>
        <Video
          ref={videoRef}
          source={reel.video}
          style={styles.video}
          resizeMode={ResizeMode.COVER}
          isLooping
          shouldPlay={isActive}
          isMuted={false}
        />

        {/* Gradient overlays for depth */}
        <View style={styles.gradientTop} />
        <View style={styles.gradientBottom} />

        {/* Pause indicator */}
        {!isPlaying && (
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
        {/* Username */}
        <View style={styles.usernameRow}>
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{reel.username.charAt(1).toUpperCase()}</Text>
          </View>
          <Text style={styles.username}>{reel.username}</Text>
          <Pressable style={styles.followButton}>
            <Text style={styles.followText}>Follow</Text>
          </Pressable>
        </View>

        {/* Caption */}
        <Text style={styles.caption} numberOfLines={2}>
          {reel.caption}
        </Text>

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

export const ShopScreen: FC = function ShopScreen() {
  const [activeIndex, setActiveIndex] = useState(0)
  const pagerRef = useRef<PagerView>(null)

  const handlePageSelected = useCallback((e: { nativeEvent: { position: number } }) => {
    setActiveIndex(e.nativeEvent.position)
  }, [])

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Reels</Text>
        <View style={styles.headerTabs}>
          <Pressable style={styles.headerTab}>
            <Text style={[styles.headerTabText, styles.headerTabActive]}>For You</Text>
            <View style={styles.headerTabIndicator} />
          </Pressable>
          <Pressable style={styles.headerTab}>
            <Text style={styles.headerTabText}>Following</Text>
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
        {REELS_DATA.map((reel, index) => (
          <View key={reel.id} style={styles.page}>
            <ReelItem reel={reel} isActive={index === activeIndex} index={index} />
          </View>
        ))}
      </PagerView>

      {/* Swipe hint for first load */}
      {activeIndex === 0 && (
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

  // Gradient overlays
  gradientTop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 200,
    backgroundColor: "rgba(0,0,0,0.4)",
  } as ViewStyle,

  gradientBottom: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 300,
    backgroundColor: "rgba(0,0,0,0.5)",
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

  // Bottom overlay
  bottomOverlay: {
    position: "absolute",
    bottom: 100,
    left: 16,
    right: 16,
  } as ViewStyle,

  usernameRow: {
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
    color: COLORS.white,
  } as TextStyle,

  username: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.white,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  followButton: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: COLORS.white,
    marginLeft: 4,
  } as ViewStyle,

  followText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.white,
  } as TextStyle,

  caption: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.whiteMuted,
    lineHeight: 20,
    marginBottom: 12,
    textShadowColor: COLORS.overlayDark,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  } as TextStyle,

  // Progress bar
  progressContainer: {
    position: "absolute",
    bottom: 85,
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
