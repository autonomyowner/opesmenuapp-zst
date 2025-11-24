import { FC, useRef, useState } from "react"
import {
  View,
  StyleSheet,
  Pressable,
  Text,
  ViewStyle,
  TextStyle,
  Animated,
} from "react-native"
import PagerView from "react-native-pager-view"
import { useSafeAreaInsets } from "react-native-safe-area-context"

import { MarketplaceScreen } from "./MarketplaceScreen"
import { ShopScreen } from "./ShopScreen"
import { CartScreen } from "./CartScreen"
import { DashboardScreen } from "./DashboardScreen"
import { ProfileScreen } from "./ProfileScreen"

const COLORS = {
  background: "#0D0D0D",
  surface: "#1A1A1A",
  accent: "#D4A84B",
  textMuted: "#5A5A5A",
  text: "#FFFFFF",
}

const TABS = [
  { key: "home", label: "Home", icon: "🏠" },
  { key: "shop", label: "Shop", icon: "🛍" },
  { key: "freelance", label: "Freelance", icon: "💼" },
  { key: "dashboard", label: "Dashboard", icon: "📊" },
  { key: "profile", label: "Profile", icon: "👤" },
]

export const MainTabsScreen: FC = function MainTabsScreen() {
  const insets = useSafeAreaInsets()
  const pagerRef = useRef<PagerView>(null)
  const [currentPage, setCurrentPage] = useState(0)

  // Animation for tab indicator
  const indicatorPosition = useRef(new Animated.Value(0)).current

  const handlePageSelected = (e: { nativeEvent: { position: number } }) => {
    const position = e.nativeEvent.position
    setCurrentPage(position)

    // Animate indicator
    Animated.spring(indicatorPosition, {
      toValue: position,
      useNativeDriver: true,
      friction: 8,
      tension: 50,
    }).start()
  }

  const handleTabPress = (index: number) => {
    pagerRef.current?.setPage(index)
  }

  const handleNavigateToCart = () => {
    pagerRef.current?.setPage(2) // Cart is at index 2
  }

  const tabWidth = 100 / TABS.length

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
          <MarketplaceScreen onNavigateToCart={handleNavigateToCart} />
        </View>
        <View key="shop" style={styles.page}>
          <ShopScreen />
        </View>
        <View key="cart" style={styles.page}>
          <CartScreen />
        </View>
        <View key="dashboard" style={styles.page}>
          <DashboardScreen />
        </View>
        <View key="profile" style={styles.page}>
          <ProfileScreen />
        </View>
      </PagerView>

      {/* Bottom Tab Bar */}
      <View style={[styles.tabBar, { paddingBottom: insets.bottom + 8 }]}>
        {/* Animated Indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: `${tabWidth}%`,
              transform: [
                {
                  translateX: indicatorPosition.interpolate({
                    inputRange: [0, TABS.length - 1],
                    outputRange: [0, (TABS.length - 1) * (100 / TABS.length) * 3.9],
                  }),
                },
              ],
            },
          ]}
        />

        {TABS.map((tab, index) => (
          <Pressable
            key={tab.key}
            style={styles.tabItem}
            onPress={() => handleTabPress(index)}
          >
            <Text
              style={[
                styles.tabIcon,
                currentPage === index && styles.tabIconActive,
              ]}
            >
              {tab.icon}
            </Text>
            <Text
              style={[
                styles.tabLabel,
                currentPage === index && styles.tabLabelActive,
              ]}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
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

  tabBar: {
    flexDirection: "row",
    backgroundColor: COLORS.surface,
    paddingTop: 12,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 10,
  } as ViewStyle,

  tabIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    height: 3,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  } as ViewStyle,

  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  } as ViewStyle,

  tabIcon: {
    fontSize: 22,
    color: COLORS.textMuted,
    marginBottom: 4,
  } as TextStyle,

  tabIconActive: {
    color: COLORS.accent,
  } as TextStyle,

  tabLabel: {
    fontSize: 10,
    fontWeight: "500",
    color: COLORS.textMuted,
  } as TextStyle,

  tabLabelActive: {
    fontWeight: "700",
    color: COLORS.accent,
  } as TextStyle,
})
