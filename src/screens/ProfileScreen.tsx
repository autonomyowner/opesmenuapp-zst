import { FC, useState, useCallback, useEffect } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextInput,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  ImageStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAuth } from "@/context/AuthContext"
import {
  fetchCustomerOrdersByUserId,
  CustomerOrder,
} from "@/services/supabase/orderService"

// Luxurious dark gold palette - Art Deco inspired
const COLORS = {
  background: "#0A0A0A",
  surface: "#141414",
  surfaceElevated: "#1A1A1A",
  gold: "#C9A227",
  goldLight: "#E5C158",
  goldDim: "#8B7119",
  text: "#FAFAFA",
  textSecondary: "#9A9A9A",
  textMuted: "#5A5A5A",
  error: "#E53935",
  success: "#4CAF50",
  inputBg: "#1E1E1E",
  inputBorder: "#2A2A2A",
  inputBorderFocus: "#C9A227",
}

type AuthView = "signIn" | "signUp"

// Auth screen components - inline to avoid circular dependencies
const AuthSignInScreen: FC<{ onNavigateToSignUp: () => void }> = ({ onNavigateToSignUp }) => {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { signIn, isLoading } = useAuth()

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const handleSignIn = useCallback(async () => {
    setError("")
    if (!email.trim()) {
      setError("Please enter your email")
      return
    }
    if (!password) {
      setError("Please enter your password")
      return
    }
    const response = await signIn({ email: email.trim(), password })
    if (!response.success) {
      setError(response.error || "Sign in failed")
    }
  }, [email, password, signIn])

  return (
    <View style={[authStyles.container, $topInsets]}>
      <LinearGradient
        colors={["#0A0A0A", "#111111", "#0A0A0A"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={authStyles.decorativeTop}>
        <View style={authStyles.decorativeLine} />
        <View style={authStyles.decorativeDiamond} />
        <View style={authStyles.decorativeLine} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={[authStyles.scrollContent, $bottomInsets]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View>
            <Text style={authStyles.welcomeText}>WELCOME BACK</Text>
            <Text style={authStyles.title}>Sign In</Text>
            <Text style={authStyles.subtitle}>Access your exclusive account</Text>
          </View>

          <View style={authStyles.formContainer}>
            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>EMAIL</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "email" && authStyles.inputWrapperFocused]}>
                <TextInput
                  style={authStyles.input}
                  placeholder="Enter your email"
                  placeholderTextColor={COLORS.textMuted}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocusedInput("email")}
                  onBlur={() => setFocusedInput(null)}
                />
              </View>
            </View>

            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>PASSWORD</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "password" && authStyles.inputWrapperFocused]}>
                <TextInput
                  style={[authStyles.input, authStyles.passwordInput]}
                  placeholder="Enter your password"
                  placeholderTextColor={COLORS.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  onFocus={() => setFocusedInput("password")}
                  onBlur={() => setFocusedInput(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.showPasswordButton}>
                  <Text style={authStyles.showPasswordText}>{showPassword ? "HIDE" : "SHOW"}</Text>
                </TouchableOpacity>
              </View>
            </View>

            {error ? (
              <View style={authStyles.errorContainer}>
                <Text style={authStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSignIn}
              disabled={isLoading}
              style={({ pressed }) => [
                authStyles.submitButton,
                pressed && authStyles.submitButtonPressed,
                isLoading && authStyles.submitButtonDisabled,
              ]}
            >
              <LinearGradient colors={[COLORS.gold, COLORS.goldDim]} style={authStyles.submitButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {isLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={authStyles.submitButtonText}>SIGN IN</Text>}
              </LinearGradient>
            </Pressable>

            <View style={authStyles.divider}>
              <View style={authStyles.dividerLine} />
              <Text style={authStyles.dividerText}>OR</Text>
              <View style={authStyles.dividerLine} />
            </View>

            <View style={authStyles.switchContainer}>
              <Text style={authStyles.switchText}>Don't have an account? </Text>
              <TouchableOpacity onPress={onNavigateToSignUp}>
                <Text style={authStyles.switchLink}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

const AuthSignUpScreen: FC<{ onNavigateToSignIn: () => void }> = ({ onNavigateToSignIn }) => {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { signUp, isLoading } = useAuth()

  const [fullName, setFullName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSignUp = useCallback(async () => {
    setError("")
    if (!fullName.trim()) { setError("Please enter your full name"); return }
    if (!email.trim()) { setError("Please enter your email"); return }
    if (!validateEmail(email.trim())) { setError("Please enter a valid email"); return }
    if (!password) { setError("Please enter a password"); return }
    if (password.length < 6) { setError("Password must be at least 6 characters"); return }
    if (password !== confirmPassword) { setError("Passwords do not match"); return }

    const response = await signUp({
      email: email.trim(),
      password,
      fullName: fullName.trim(),
      phone: phone.trim() || undefined,
    })
    if (!response.success) {
      setError(response.error || "Sign up failed")
    }
  }, [fullName, email, phone, password, confirmPassword, signUp])

  return (
    <View style={[authStyles.container, $topInsets]}>
      <LinearGradient colors={["#0A0A0A", "#111111", "#0A0A0A"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={authStyles.decorativeTop}>
        <View style={authStyles.decorativeLine} />
        <View style={authStyles.decorativeDiamond} />
        <View style={authStyles.decorativeLine} />
      </View>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={[authStyles.scrollContent, $bottomInsets]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View>
            <Text style={authStyles.welcomeText}>JOIN US</Text>
            <Text style={authStyles.title}>Create Account</Text>
            <Text style={authStyles.subtitle}>Begin your exclusive journey</Text>
          </View>

          <View style={authStyles.formContainer}>
            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>FULL NAME</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "fullName" && authStyles.inputWrapperFocused]}>
                <TextInput style={authStyles.input} placeholder="Enter your full name" placeholderTextColor={COLORS.textMuted} value={fullName} onChangeText={setFullName} autoCapitalize="words" onFocus={() => setFocusedInput("fullName")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>

            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>EMAIL</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "email" && authStyles.inputWrapperFocused]}>
                <TextInput style={authStyles.input} placeholder="Enter your email" placeholderTextColor={COLORS.textMuted} value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" onFocus={() => setFocusedInput("email")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>

            <View style={authStyles.inputGroup}>
              <View style={authStyles.labelRow}>
                <Text style={authStyles.inputLabel}>PHONE</Text>
                <Text style={authStyles.optionalLabel}>OPTIONAL</Text>
              </View>
              <View style={[authStyles.inputWrapper, focusedInput === "phone" && authStyles.inputWrapperFocused]}>
                <TextInput style={authStyles.input} placeholder="Enter your phone" placeholderTextColor={COLORS.textMuted} value={phone} onChangeText={setPhone} keyboardType="phone-pad" onFocus={() => setFocusedInput("phone")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>

            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>PASSWORD</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "password" && authStyles.inputWrapperFocused]}>
                <TextInput style={[authStyles.input, authStyles.passwordInput]} placeholder="Create a password" placeholderTextColor={COLORS.textMuted} value={password} onChangeText={setPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedInput("password")} onBlur={() => setFocusedInput(null)} />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={authStyles.showPasswordButton}>
                  <Text style={authStyles.showPasswordText}>{showPassword ? "HIDE" : "SHOW"}</Text>
                </TouchableOpacity>
              </View>
              <Text style={authStyles.passwordHint}>Minimum 6 characters</Text>
            </View>

            <View style={authStyles.inputGroup}>
              <Text style={authStyles.inputLabel}>CONFIRM PASSWORD</Text>
              <View style={[authStyles.inputWrapper, focusedInput === "confirmPassword" && authStyles.inputWrapperFocused]}>
                <TextInput style={authStyles.input} placeholder="Confirm password" placeholderTextColor={COLORS.textMuted} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry={!showPassword} onFocus={() => setFocusedInput("confirmPassword")} onBlur={() => setFocusedInput(null)} />
              </View>
            </View>

            {error ? (
              <View style={authStyles.errorContainer}>
                <Text style={authStyles.errorText}>{error}</Text>
              </View>
            ) : null}

            <Pressable onPress={handleSignUp} disabled={isLoading} style={({ pressed }) => [authStyles.submitButton, pressed && authStyles.submitButtonPressed, isLoading && authStyles.submitButtonDisabled]}>
              <LinearGradient colors={[COLORS.gold, COLORS.goldDim]} style={authStyles.submitButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                {isLoading ? <ActivityIndicator color={COLORS.background} /> : <Text style={authStyles.submitButtonText}>CREATE ACCOUNT</Text>}
              </LinearGradient>
            </Pressable>

            <View style={authStyles.divider}>
              <View style={authStyles.dividerLine} />
              <Text style={authStyles.dividerText}>OR</Text>
              <View style={authStyles.dividerLine} />
            </View>

            <View style={authStyles.switchContainer}>
              <Text style={authStyles.switchText}>Already have an account? </Text>
              <TouchableOpacity onPress={onNavigateToSignIn}>
                <Text style={authStyles.switchLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// Order status helper
const getOrderStatusInfo = (status: string) => {
  switch (status) {
    case "pending":
      return { label: "En attente", color: "#F59E0B", bgColor: "rgba(245, 158, 11, 0.15)" }
    case "processing":
      return { label: "En cours", color: "#3B82F6", bgColor: "rgba(59, 130, 246, 0.15)" }
    case "shipped":
      return { label: "Expediee", color: COLORS.gold, bgColor: "rgba(201, 162, 39, 0.15)" }
    case "delivered":
      return { label: "Livree", color: "#22C55E", bgColor: "rgba(34, 197, 94, 0.15)" }
    case "cancelled":
      return { label: "Annulee", color: "#EF4444", bgColor: "rgba(239, 68, 68, 0.15)" }
    default:
      return { label: status, color: COLORS.textSecondary, bgColor: "rgba(154, 154, 154, 0.15)" }
  }
}

// Order Card Component
const OrderCard: FC<{ order: CustomerOrder; expanded: boolean; onToggle: () => void }> = ({
  order,
  expanded,
  onToggle,
}) => {
  const statusInfo = getOrderStatusInfo(order.status)
  const date = new Date(order.created_at)
  const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`

  return (
    <View style={orderStyles.card}>
      <TouchableOpacity onPress={onToggle} activeOpacity={0.7}>
        <View style={orderStyles.cardHeader}>
          <View style={orderStyles.orderInfo}>
            <Text style={orderStyles.orderNumber}>#{order.order_number}</Text>
            <Text style={orderStyles.orderDate}>{formattedDate}</Text>
          </View>
          <View style={[orderStyles.statusBadge, { backgroundColor: statusInfo.bgColor }]}>
            <Text style={[orderStyles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
          </View>
        </View>

        <View style={orderStyles.cardSummary}>
          <Text style={orderStyles.itemCount}>
            {order.items.length} article{order.items.length > 1 ? "s" : ""}
          </Text>
          <Text style={orderStyles.totalPrice}>{(order.total || 0).toLocaleString()} DA</Text>
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={orderStyles.expandedContent}>
          <View style={orderStyles.divider} />

          {/* Order Items */}
          <Text style={orderStyles.sectionLabel}>ARTICLES</Text>
          {order.items.map((item) => (
            <View key={item.id} style={orderStyles.itemRow}>
              {item.product_image ? (
                <Image source={{ uri: item.product_image }} style={orderStyles.itemImage} />
              ) : (
                <View style={orderStyles.itemImagePlaceholder}>
                  <Text style={orderStyles.itemImagePlaceholderText}>
                    {item.product_name.charAt(0)}
                  </Text>
                </View>
              )}
              <View style={orderStyles.itemDetails}>
                <Text style={orderStyles.itemName} numberOfLines={1}>{item.product_name}</Text>
                <Text style={orderStyles.itemQty}>Qte: {item.quantity}</Text>
              </View>
              <Text style={orderStyles.itemPrice}>{(item.subtotal || 0).toLocaleString()} DA</Text>
            </View>
          ))}

          {/* Delivery Info */}
          <View style={orderStyles.deliverySection}>
            <Text style={orderStyles.sectionLabel}>LIVRAISON</Text>
            <Text style={orderStyles.deliveryAddress}>{order.customer_address}</Text>
            <Text style={orderStyles.deliveryWilaya}>{order.customer_wilaya}</Text>
          </View>

          {/* Tracking Info */}
          {order.tracking_number && (
            <View style={orderStyles.trackingSection}>
              <Text style={orderStyles.sectionLabel}>SUIVI</Text>
              <Text style={orderStyles.trackingNumber}>{order.tracking_number}</Text>
            </View>
          )}

          {/* Status Timeline */}
          <View style={orderStyles.timelineSection}>
            <Text style={orderStyles.sectionLabel}>STATUT</Text>
            <View style={orderStyles.timeline}>
              <View style={[orderStyles.timelineStep, orderStyles.timelineStepActive]}>
                <View style={[orderStyles.timelineDot, orderStyles.timelineDotActive]} />
                <Text style={orderStyles.timelineLabel}>Commande recue</Text>
              </View>
              <View style={[orderStyles.timelineStep, order.status !== "pending" && orderStyles.timelineStepActive]}>
                <View style={[orderStyles.timelineDot, order.status !== "pending" && orderStyles.timelineDotActive]} />
                <Text style={orderStyles.timelineLabel}>En traitement</Text>
              </View>
              <View style={[orderStyles.timelineStep, (order.status === "shipped" || order.status === "delivered") && orderStyles.timelineStepActive]}>
                <View style={[orderStyles.timelineDot, (order.status === "shipped" || order.status === "delivered") && orderStyles.timelineDotActive]} />
                <Text style={orderStyles.timelineLabel}>Expediee</Text>
              </View>
              <View style={[orderStyles.timelineStep, order.status === "delivered" && orderStyles.timelineStepActive]}>
                <View style={[orderStyles.timelineDot, order.status === "delivered" && orderStyles.timelineDotActive]} />
                <Text style={orderStyles.timelineLabel}>Livree</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  )
}

export const ProfileScreen: FC = function ProfileScreen() {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { user, isAuthenticated, isLoading, signOut, updateProfile } = useAuth()

  const [authView, setAuthView] = useState<AuthView>("signIn")
  const [isEditing, setIsEditing] = useState(false)
  const [editFullName, setEditFullName] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [focusedInput, setFocusedInput] = useState<string | null>(null)

  // Order history state
  const [orders, setOrders] = useState<CustomerOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(false)
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null)

  // Load orders for authenticated user - only their own orders
  useEffect(() => {
    const loadOrders = async () => {
      if (isAuthenticated && user?.id) {
        setOrdersLoading(true)
        const customerOrders = await fetchCustomerOrdersByUserId(user.id)
        setOrders(customerOrders)
        setOrdersLoading(false)
      } else {
        setOrders([])
      }
    }

    loadOrders()
  }, [isAuthenticated, user?.id])

  const handleSignOut = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => { await signOut() } },
    ])
  }, [signOut])

  const handleStartEdit = useCallback(() => {
    setEditFullName(user?.full_name || "")
    setEditPhone(user?.phone || "")
    setIsEditing(true)
  }, [user])

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false)
    setEditFullName("")
    setEditPhone("")
  }, [])

  const handleSaveProfile = useCallback(async () => {
    setIsSaving(true)
    try {
      const response = await updateProfile({
        full_name: editFullName.trim() || undefined,
        phone: editPhone.trim() || undefined,
      })
      if (response.success) {
        setIsEditing(false)
      } else {
        Alert.alert("Error", response.error || "Failed to update profile")
      }
    } finally {
      setIsSaving(false)
    }
  }, [editFullName, editPhone, updateProfile])

  // Show loading state
  if (isLoading && !isAuthenticated) {
    return (
      <View style={[styles.container, styles.centerContent, $topInsets]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
      </View>
    )
  }

  // Show auth screens if not authenticated
  if (!isAuthenticated) {
    if (authView === "signIn") {
      return <AuthSignInScreen onNavigateToSignUp={() => setAuthView("signUp")} />
    }
    return <AuthSignUpScreen onNavigateToSignIn={() => setAuthView("signIn")} />
  }

  // Show profile when authenticated
  return (
    <View style={[styles.container, $topInsets]}>
      <LinearGradient colors={["#0A0A0A", "#111111", "#0A0A0A"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <View style={styles.decorativeTop}>
        <View style={styles.decorativeLine} />
        <View style={styles.decorativeDiamond} />
        <View style={styles.decorativeLine} />
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, $bottomInsets]} showsVerticalScrollIndicator={false}>
        <View>
          <Text style={styles.welcomeText}>YOUR ACCOUNT</Text>
          <Text style={styles.title}>Profile</Text>
        </View>

        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <LinearGradient colors={[COLORS.gold, COLORS.goldDim]} style={styles.avatarGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={styles.avatarInitials}>
                {user?.full_name ? user.full_name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : user?.email?.[0]?.toUpperCase() || "U"}
              </Text>
            </LinearGradient>
          </View>
          <Text style={styles.userName}>{user?.full_name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{user?.role?.toUpperCase() || "CUSTOMER"}</Text>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>ACCOUNT DETAILS</Text>
            {!isEditing && (
              <TouchableOpacity onPress={handleStartEdit}>
                <Text style={styles.editButton}>EDIT</Text>
              </TouchableOpacity>
            )}
          </View>

          {isEditing ? (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FULL NAME</Text>
                <View style={[styles.inputWrapper, focusedInput === "fullName" && styles.inputWrapperFocused]}>
                  <TextInput style={styles.input} placeholder="Enter your full name" placeholderTextColor={COLORS.textMuted} value={editFullName} onChangeText={setEditFullName} autoCapitalize="words" onFocus={() => setFocusedInput("fullName")} onBlur={() => setFocusedInput(null)} />
                </View>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PHONE</Text>
                <View style={[styles.inputWrapper, focusedInput === "phone" && styles.inputWrapperFocused]}>
                  <TextInput style={styles.input} placeholder="Enter your phone" placeholderTextColor={COLORS.textMuted} value={editPhone} onChangeText={setEditPhone} keyboardType="phone-pad" onFocus={() => setFocusedInput("phone")} onBlur={() => setFocusedInput(null)} />
                </View>
              </View>
              <View style={styles.editActions}>
                <TouchableOpacity onPress={handleCancelEdit} style={styles.cancelButton}>
                  <Text style={styles.cancelButtonText}>CANCEL</Text>
                </TouchableOpacity>
                <Pressable onPress={handleSaveProfile} disabled={isSaving} style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed, isSaving && styles.saveButtonDisabled]}>
                  <LinearGradient colors={[COLORS.gold, COLORS.goldDim]} style={styles.saveButtonGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    {isSaving ? <ActivityIndicator color={COLORS.background} size="small" /> : <Text style={styles.saveButtonText}>SAVE</Text>}
                  </LinearGradient>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>FULL NAME</Text>
                <Text style={styles.infoValue}>{user?.full_name || "Not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>EMAIL</Text>
                <Text style={styles.infoValue}>{user?.email}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>PHONE</Text>
                <Text style={styles.infoValue}>{user?.phone || "Not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>MEMBER SINCE</Text>
                <Text style={styles.infoValue}>
                  {user?.created_at ? new Date(user.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Unknown"}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Order History Section */}
        <View style={styles.ordersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>MES COMMANDES</Text>
            {orders.length > 0 && (
              <Text style={styles.orderCount}>{orders.length}</Text>
            )}
          </View>

          {ordersLoading ? (
            <View style={styles.ordersLoading}>
              <ActivityIndicator size="small" color={COLORS.gold} />
              <Text style={styles.ordersLoadingText}>Chargement...</Text>
            </View>
          ) : orders.length === 0 ? (
            <View style={styles.noOrders}>
              <Text style={styles.noOrdersText}>Aucune commande</Text>
              <Text style={styles.noOrdersSubtext}>
                Vos commandes apparaitront ici apres votre premier achat
              </Text>
            </View>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                expanded={expandedOrderId === order.id}
                onToggle={() => setExpandedOrderId(expandedOrderId === order.id ? null : order.id)}
              />
            ))
          )}
        </View>

        <View style={styles.signOutSection}>
          <Pressable onPress={handleSignOut} style={({ pressed }) => [styles.signOutButton, pressed && styles.signOutButtonPressed]}>
            <Text style={styles.signOutButtonText}>SIGN OUT</Text>
          </Pressable>
        </View>

        <View style={styles.decorativeBottom}>
          <View style={styles.decorativeLineSmall} />
          <View style={styles.decorativeDot} />
          <View style={styles.decorativeLineSmall} />
        </View>
      </ScrollView>
    </View>
  )
}

// Auth screen styles
const authStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background } as ViewStyle,
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 40, paddingBottom: 24 } as ViewStyle,
  decorativeTop: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 16, paddingHorizontal: 32 } as ViewStyle,
  decorativeLine: { flex: 1, height: 1, backgroundColor: COLORS.gold, opacity: 0.3 } as ViewStyle,
  decorativeDiamond: { width: 8, height: 8, backgroundColor: COLORS.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 16 } as ViewStyle,
  welcomeText: { fontSize: 11, fontWeight: "600", color: COLORS.gold, letterSpacing: 4, marginBottom: 8 } as TextStyle,
  title: { fontSize: 42, fontWeight: "200", color: COLORS.text, letterSpacing: 2, marginBottom: 8 } as TextStyle,
  subtitle: { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 0.5, marginBottom: 48 } as TextStyle,
  formContainer: { flex: 1 } as ViewStyle,
  inputGroup: { marginBottom: 24 } as ViewStyle,
  labelRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 } as ViewStyle,
  inputLabel: { fontSize: 10, fontWeight: "700", color: COLORS.gold, letterSpacing: 2, marginBottom: 10 } as TextStyle,
  optionalLabel: { fontSize: 9, fontWeight: "500", color: COLORS.textMuted, letterSpacing: 1, marginLeft: 8, marginBottom: 10 } as TextStyle,
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 4, overflow: "hidden" } as ViewStyle,
  inputWrapperFocused: { borderColor: COLORS.inputBorderFocus } as ViewStyle,
  input: { flex: 1, height: 56, paddingHorizontal: 18, fontSize: 15, color: COLORS.text, letterSpacing: 0.3 } as TextStyle,
  passwordInput: { paddingRight: 70 } as TextStyle,
  showPasswordButton: { position: "absolute", right: 18, height: 56, justifyContent: "center" } as ViewStyle,
  showPasswordText: { fontSize: 10, fontWeight: "700", color: COLORS.gold, letterSpacing: 1 } as TextStyle,
  passwordHint: { fontSize: 11, color: COLORS.textMuted, marginTop: 6, letterSpacing: 0.2 } as TextStyle,
  errorContainer: { backgroundColor: "rgba(229, 57, 53, 0.1)", borderRadius: 4, padding: 14, marginBottom: 24, borderLeftWidth: 3, borderLeftColor: COLORS.error } as ViewStyle,
  errorText: { fontSize: 13, color: COLORS.error, letterSpacing: 0.2 } as TextStyle,
  submitButton: { borderRadius: 4, overflow: "hidden", marginBottom: 32 } as ViewStyle,
  submitButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] } as ViewStyle,
  submitButtonDisabled: { opacity: 0.6 } as ViewStyle,
  submitButtonGradient: { height: 56, justifyContent: "center", alignItems: "center" } as ViewStyle,
  submitButtonText: { fontSize: 13, fontWeight: "700", color: COLORS.background, letterSpacing: 3 } as TextStyle,
  divider: { flexDirection: "row", alignItems: "center", marginBottom: 32 } as ViewStyle,
  dividerLine: { flex: 1, height: 1, backgroundColor: COLORS.inputBorder } as ViewStyle,
  dividerText: { fontSize: 11, color: COLORS.textMuted, letterSpacing: 2, marginHorizontal: 20 } as TextStyle,
  switchContainer: { flexDirection: "row", justifyContent: "center", alignItems: "center" } as ViewStyle,
  switchText: { fontSize: 14, color: COLORS.textSecondary } as TextStyle,
  switchLink: { fontSize: 14, fontWeight: "600", color: COLORS.gold, letterSpacing: 0.3 } as TextStyle,
})

// Profile screen styles
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background } as ViewStyle,
  centerContent: { justifyContent: "center", alignItems: "center" } as ViewStyle,
  scrollContent: { flexGrow: 1, paddingHorizontal: 32, paddingTop: 24, paddingBottom: 120 } as ViewStyle,
  decorativeTop: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 16, paddingHorizontal: 32 } as ViewStyle,
  decorativeLine: { flex: 1, height: 1, backgroundColor: COLORS.gold, opacity: 0.3 } as ViewStyle,
  decorativeDiamond: { width: 8, height: 8, backgroundColor: COLORS.gold, transform: [{ rotate: "45deg" }], marginHorizontal: 16 } as ViewStyle,
  welcomeText: { fontSize: 11, fontWeight: "600", color: COLORS.gold, letterSpacing: 4, marginBottom: 8 } as TextStyle,
  title: { fontSize: 42, fontWeight: "200", color: COLORS.text, letterSpacing: 2, marginBottom: 32 } as TextStyle,
  avatarSection: { alignItems: "center", marginBottom: 40 } as ViewStyle,
  avatarContainer: { width: 100, height: 100, borderRadius: 50, overflow: "hidden", marginBottom: 16 } as ViewStyle,
  avatarGradient: { flex: 1, justifyContent: "center", alignItems: "center" } as ViewStyle,
  avatarInitials: { fontSize: 36, fontWeight: "300", color: COLORS.background, letterSpacing: 2 } as TextStyle,
  userName: { fontSize: 24, fontWeight: "300", color: COLORS.text, letterSpacing: 1, marginBottom: 4 } as TextStyle,
  userEmail: { fontSize: 14, color: COLORS.textSecondary, letterSpacing: 0.3, marginBottom: 12 } as TextStyle,
  roleBadge: { backgroundColor: "rgba(201, 162, 39, 0.15)", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, borderWidth: 1, borderColor: "rgba(201, 162, 39, 0.3)" } as ViewStyle,
  roleText: { fontSize: 10, fontWeight: "700", color: COLORS.gold, letterSpacing: 2 } as TextStyle,
  infoSection: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: COLORS.inputBorder } as ViewStyle,
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 24, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: COLORS.inputBorder } as ViewStyle,
  sectionTitle: { fontSize: 11, fontWeight: "700", color: COLORS.gold, letterSpacing: 2 } as TextStyle,
  editButton: { fontSize: 11, fontWeight: "700", color: COLORS.gold, letterSpacing: 1 } as TextStyle,
  infoRow: { marginBottom: 20 } as ViewStyle,
  infoLabel: { fontSize: 10, fontWeight: "600", color: COLORS.textMuted, letterSpacing: 1.5, marginBottom: 6 } as TextStyle,
  infoValue: { fontSize: 16, color: COLORS.text, letterSpacing: 0.3 } as TextStyle,
  inputWrapper: { flexDirection: "row", alignItems: "center", backgroundColor: COLORS.inputBg, borderWidth: 1, borderColor: COLORS.inputBorder, borderRadius: 4, overflow: "hidden" } as ViewStyle,
  inputWrapperFocused: { borderColor: COLORS.inputBorderFocus } as ViewStyle,
  input: { flex: 1, height: 48, paddingHorizontal: 16, fontSize: 15, color: COLORS.text, letterSpacing: 0.3 } as TextStyle,
  editActions: { flexDirection: "row", justifyContent: "flex-end", gap: 12, marginTop: 8 } as ViewStyle,
  cancelButton: { height: 44, paddingHorizontal: 24, justifyContent: "center", alignItems: "center", borderRadius: 4, borderWidth: 1, borderColor: COLORS.inputBorder } as ViewStyle,
  cancelButtonText: { fontSize: 11, fontWeight: "700", color: COLORS.textSecondary, letterSpacing: 1 } as TextStyle,
  saveButton: { borderRadius: 4, overflow: "hidden" } as ViewStyle,
  saveButtonPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] } as ViewStyle,
  saveButtonDisabled: { opacity: 0.6 } as ViewStyle,
  saveButtonGradient: { height: 44, paddingHorizontal: 32, justifyContent: "center", alignItems: "center" } as ViewStyle,
  saveButtonText: { fontSize: 11, fontWeight: "700", color: COLORS.background, letterSpacing: 2 } as TextStyle,
  signOutSection: { marginTop: 8 } as ViewStyle,
  signOutButton: { height: 52, justifyContent: "center", alignItems: "center", borderRadius: 4, borderWidth: 1, borderColor: COLORS.error, backgroundColor: "rgba(229, 57, 53, 0.08)" } as ViewStyle,
  signOutButtonPressed: { backgroundColor: "rgba(229, 57, 53, 0.15)" } as ViewStyle,
  signOutButtonText: { fontSize: 12, fontWeight: "700", color: COLORS.error, letterSpacing: 2 } as TextStyle,
  decorativeBottom: { flexDirection: "row", alignItems: "center", justifyContent: "center", paddingTop: 48 } as ViewStyle,
  decorativeLineSmall: { width: 40, height: 1, backgroundColor: COLORS.gold, opacity: 0.2 } as ViewStyle,
  decorativeDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: COLORS.gold, marginHorizontal: 12, opacity: 0.4 } as ViewStyle,
  // Orders section
  ordersSection: { backgroundColor: COLORS.surface, borderRadius: 8, padding: 24, marginBottom: 24, borderWidth: 1, borderColor: COLORS.inputBorder } as ViewStyle,
  orderCount: { fontSize: 12, fontWeight: "600", color: COLORS.gold, backgroundColor: "rgba(201, 162, 39, 0.15)", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 } as TextStyle,
  ordersLoading: { alignItems: "center", paddingVertical: 32 } as ViewStyle,
  ordersLoadingText: { fontSize: 13, color: COLORS.textSecondary, marginTop: 12 } as TextStyle,
  noOrders: { alignItems: "center", paddingVertical: 32 } as ViewStyle,
  noOrdersText: { fontSize: 16, color: COLORS.textSecondary, marginBottom: 8 } as TextStyle,
  noOrdersSubtext: { fontSize: 13, color: COLORS.textMuted, textAlign: "center" } as TextStyle,
})

// Order card styles
const orderStyles = StyleSheet.create({
  card: { backgroundColor: COLORS.surfaceElevated, borderRadius: 8, padding: 16, marginTop: 12, borderWidth: 1, borderColor: COLORS.inputBorder } as ViewStyle,
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 } as ViewStyle,
  orderInfo: {} as ViewStyle,
  orderNumber: { fontSize: 14, fontWeight: "600", color: COLORS.text, letterSpacing: 0.5 } as TextStyle,
  orderDate: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 } as TextStyle,
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 } as ViewStyle,
  statusText: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 } as TextStyle,
  cardSummary: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" } as ViewStyle,
  itemCount: { fontSize: 13, color: COLORS.textSecondary } as TextStyle,
  totalPrice: { fontSize: 16, fontWeight: "700", color: COLORS.gold } as TextStyle,
  expandedContent: { marginTop: 8 } as ViewStyle,
  divider: { height: 1, backgroundColor: COLORS.inputBorder, marginVertical: 16 } as ViewStyle,
  sectionLabel: { fontSize: 10, fontWeight: "700", color: COLORS.gold, letterSpacing: 1.5, marginBottom: 12 } as TextStyle,
  itemRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 } as ViewStyle,
  itemImage: { width: 48, height: 48, borderRadius: 6, backgroundColor: COLORS.inputBg } as ImageStyle,
  itemImagePlaceholder: { width: 48, height: 48, borderRadius: 6, backgroundColor: COLORS.inputBg, justifyContent: "center", alignItems: "center" } as ViewStyle,
  itemImagePlaceholderText: { fontSize: 18, fontWeight: "600", color: COLORS.gold } as TextStyle,
  itemDetails: { flex: 1, marginLeft: 12 } as ViewStyle,
  itemName: { fontSize: 14, color: COLORS.text, marginBottom: 2 } as TextStyle,
  itemQty: { fontSize: 12, color: COLORS.textMuted } as TextStyle,
  itemPrice: { fontSize: 14, fontWeight: "600", color: COLORS.text } as TextStyle,
  deliverySection: { marginTop: 16 } as ViewStyle,
  deliveryAddress: { fontSize: 14, color: COLORS.text, marginBottom: 4 } as TextStyle,
  deliveryWilaya: { fontSize: 13, color: COLORS.textSecondary } as TextStyle,
  trackingSection: { marginTop: 16 } as ViewStyle,
  trackingNumber: { fontSize: 14, color: COLORS.gold, fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace" } as TextStyle,
  timelineSection: { marginTop: 16 } as ViewStyle,
  timeline: { flexDirection: "row", justifyContent: "space-between" } as ViewStyle,
  timelineStep: { alignItems: "center", flex: 1, opacity: 0.4 } as ViewStyle,
  timelineStepActive: { opacity: 1 } as ViewStyle,
  timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.textMuted, marginBottom: 6 } as ViewStyle,
  timelineDotActive: { backgroundColor: COLORS.gold } as ViewStyle,
  timelineLabel: { fontSize: 9, color: COLORS.textSecondary, textAlign: "center" } as TextStyle,
})
