import { FC, useEffect, useState, useCallback, useRef } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Dimensions,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Switch,
  Image,
  ImageStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as ImagePicker from "expo-image-picker"
import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAuth } from "@/context/AuthContext"
import {
  fetchSellerStats,
  fetchSellerRecentOrders,
  fetchSellerProducts,
  fetchSellerOrders,
  SellerStats,
  SellerOrder,
  SellerProduct,
  subscribeToSellerOrdersWithCache,
  subscribeToSellerProductsWithCache,
  addProductWithCache,
  deleteProductWithCache,
  updateOrderStatusWithCache,
  invalidateSellerCaches,
  NewProductInput,
} from "@/services/supabase/sellerService.cached"
import { fetchProductCategories } from "@/services/supabase/productService.cached"
import { getProductCategories } from "@/services/supabase/sellerService"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Luxe Art Deco Color Palette
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
  info: "#3B82F6",
  infoMuted: "rgba(59, 130, 246, 0.15)",
}

type TabType = "overview" | "products" | "orders"

// Stats card component
interface StatCardProps {
  label: string
  value: string | number
  suffix?: string
  variant?: "default" | "gold" | "success" | "warning"
}

const StatCard: FC<StatCardProps> = ({ label, value, suffix, variant = "default" }) => {
  const getVariantStyles = () => {
    switch (variant) {
      case "gold":
        return { borderColor: COLORS.goldDark, bgColor: COLORS.goldMuted }
      case "success":
        return { borderColor: COLORS.success, bgColor: COLORS.successMuted }
      case "warning":
        return { borderColor: COLORS.warning, bgColor: COLORS.warningMuted }
      default:
        return { borderColor: COLORS.surfaceBorder, bgColor: "transparent" }
    }
  }

  const variantStyles = getVariantStyles()

  return (
    <View
      style={[
        styles.statCard,
        { borderColor: variantStyles.borderColor, backgroundColor: variantStyles.bgColor },
      ]}
    >
      <Text style={styles.statLabel}>{label}</Text>
      <View style={styles.statValueRow}>
        <Text style={[styles.statValue, variant === "gold" && styles.statValueGold]}>
          {value}
        </Text>
        {suffix && <Text style={styles.statSuffix}>{suffix}</Text>}
      </View>
    </View>
  )
}

// Product item component
interface ProductItemProps {
  product: SellerProduct
  onDelete: (id: string) => void
}

const ProductItem: FC<ProductItemProps> = ({ product, onDelete }) => {
  const handleDelete = () => {
    Alert.alert(
      "Supprimer le produit",
      `Voulez-vous vraiment supprimer "${product.name}"?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => onDelete(product.id) },
      ]
    )
  }

  return (
    <View style={styles.productItem}>
      <View style={styles.productInfo}>
        <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
        <Text style={styles.productCategory}>{product.category}</Text>
        <View style={styles.productMeta}>
          <Text style={styles.productPrice}>{(product.price || 0).toLocaleString()} DA</Text>
          <View style={[styles.stockBadge, product.in_stock ? styles.stockIn : styles.stockOut]}>
            <Text style={styles.stockText}>{product.in_stock ? "En stock" : "Rupture"}</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
        <Text style={styles.deleteBtnText}>X</Text>
      </TouchableOpacity>
    </View>
  )
}

// Order item component with actions - uses correct database field names
interface OrderItemProps {
  order: SellerOrder
  onUpdateStatus: (orderId: string, status: SellerOrder["status"]) => void
}

const OrderItem: FC<OrderItemProps> = ({ order, onUpdateStatus }) => {
  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending":
        return { bg: COLORS.warningMuted, text: COLORS.warning, label: "En Attente" }
      case "processing":
        return { bg: COLORS.infoMuted, text: COLORS.info, label: "En cours" }
      case "shipped":
        return { bg: COLORS.goldMuted, text: COLORS.gold, label: "Expediee" }
      case "delivered":
        return { bg: COLORS.successMuted, text: COLORS.success, label: "Livree" }
      case "cancelled":
        return { bg: COLORS.errorMuted, text: COLORS.error, label: "Annulee" }
      default:
        return { bg: COLORS.surfaceBorder, text: COLORS.textSecondary, label: status }
    }
  }

  const statusStyle = getStatusStyle(order.status)
  const date = new Date(order.created_at)
  const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`

  const getNextStatus = (): { status: SellerOrder["status"]; label: string } | null => {
    switch (order.status) {
      case "pending":
        return { status: "processing", label: "Traiter" }
      case "processing":
        return { status: "shipped", label: "Expedier" }
      case "shipped":
        return { status: "delivered", label: "Livree" }
      default:
        return null
    }
  }

  const nextStatus = getNextStatus()

  return (
    <View style={styles.orderItem}>
      <View style={styles.orderHeader}>
        <Text style={styles.orderId}>#{order.order_number || order.id.slice(0, 8).toUpperCase()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
          <Text style={[styles.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
        </View>
      </View>

      <View style={styles.orderBody}>
        <View style={styles.orderInfo}>
          <Text style={styles.orderAmount}>{(order.total || 0).toLocaleString()} DA</Text>
          <Text style={styles.orderDate}>{formattedDate}</Text>
          {order.customer_name && (
            <Text style={styles.orderCustomer}>{order.customer_name} - {order.customer_phone}</Text>
          )}
          {order.customer_address && (
            <Text style={styles.orderAddress} numberOfLines={1}>{order.customer_address}</Text>
          )}
        </View>
      </View>

      {(order.status === "pending" || order.status === "processing" || order.status === "shipped") && (
        <View style={styles.orderActions}>
          {nextStatus && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={() => onUpdateStatus(order.id, nextStatus.status)}
            >
              <Text style={styles.actionBtnText}>{nextStatus.label}</Text>
            </TouchableOpacity>
          )}
          {order.status === "pending" && (
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={() => onUpdateStatus(order.id, "cancelled")}
            >
              <Text style={[styles.actionBtnText, styles.cancelBtnText]}>Annuler</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  )
}

// Add Product Modal
interface AddProductModalProps {
  visible: boolean
  onClose: () => void
  onAdd: (product: NewProductInput) => void
  categories: string[]
}

const AddProductModal: FC<AddProductModalProps> = ({ visible, onClose, onAdd, categories }) => {
  const [name, setName] = useState("")
  const [price, setPrice] = useState("")
  const [category, setCategory] = useState(categories[0] || "")
  const [productType, setProductType] = useState("")
  const [description, setDescription] = useState("")
  const [stockQty, setStockQty] = useState("")
  const [isNew, setIsNew] = useState(false)
  const [isPromo, setIsPromo] = useState(false)
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [videoUri, setVideoUri] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission requise", "L'acces a la galerie est necessaire")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking image:", error)
      Alert.alert("Erreur", "Impossible de selectionner l'image")
    }
  }

  const pickVideo = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permission requise", "L'acces a la galerie est necessaire")
        return
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        allowsEditing: true,
        quality: 0.8,
      })

      if (!result.canceled && result.assets[0]) {
        setVideoUri(result.assets[0].uri)
      }
    } catch (error) {
      console.error("Error picking video:", error)
      Alert.alert("Erreur", "Impossible de selectionner la video")
    }
  }

  const handleSubmit = () => {
    if (!name.trim()) {
      Alert.alert("Erreur", "Le nom du produit est requis")
      return
    }
    if (!price || parseFloat(price) <= 0) {
      Alert.alert("Erreur", "Le prix doit etre superieur a 0")
      return
    }
    if (!productType.trim()) {
      Alert.alert("Erreur", "Le type de produit est requis")
      return
    }

    setUploading(true)

    onAdd({
      name: name.trim(),
      price: parseFloat(price),
      category: category || "Autre",
      product_type: productType.trim(),
      description: description.trim(),
      stock_quantity: parseInt(stockQty) || 0,
      is_new: isNew,
      is_promo: isPromo,
      image_uri: imageUri || undefined,
      video_uri: videoUri || undefined,
    })

    // Reset form
    setName("")
    setPrice("")
    setProductType("")
    setDescription("")
    setStockQty("")
    setIsNew(false)
    setIsPromo(false)
    setImageUri(null)
    setVideoUri(null)
    setUploading(false)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouveau Produit</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Nom *</Text>
            <TextInput
              style={styles.textInput}
              value={name}
              onChangeText={setName}
              placeholder="Nom du produit"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Prix (DA) *</Text>
            <TextInput
              style={styles.textInput}
              value={price}
              onChangeText={setPrice}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Type de produit *</Text>
            <TextInput
              style={styles.textInput}
              value={productType}
              onChangeText={setProductType}
              placeholder="Ex: Parfum Homme, Vetements Hiver, etc."
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Categorie</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryChip, category === cat && styles.categoryChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.categoryChipText, category === cat && styles.categoryChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={styles.inputLabel}>Image du produit</Text>
            <TouchableOpacity style={styles.mediaUploadBtn} onPress={pickImage}>
              <Text style={styles.mediaUploadBtnText}>
                {imageUri ? "✓ Image selectionnee" : "Cliquez pour selectionner une image"}
              </Text>
              <Text style={styles.mediaUploadHint}>JPG, PNG, WebP ou GIF (max. 5MB)</Text>
            </TouchableOpacity>
            {imageUri && (
              <View style={styles.mediaPreview}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => setImageUri(null)}
                >
                  <Text style={styles.removeMediaBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>Video de demonstration (optionnel)</Text>
            <TouchableOpacity style={styles.mediaUploadBtn} onPress={pickVideo}>
              <Text style={styles.mediaUploadBtnText}>
                {videoUri ? "✓ Video selectionnee" : "Cliquez pour ajouter une video"}
              </Text>
              <Text style={styles.mediaUploadHint}>MP4/WebM - 30s max - 10 MB max</Text>
            </TouchableOpacity>
            {videoUri && (
              <View style={styles.mediaPreview}>
                <Text style={styles.videoPreviewText}>Video selectionnee</Text>
                <TouchableOpacity
                  style={styles.removeMediaBtn}
                  onPress={() => setVideoUri(null)}
                >
                  <Text style={styles.removeMediaBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            )}

            <Text style={styles.inputLabel}>Description</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description du produit"
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={3}
            />

            <Text style={styles.inputLabel}>Quantite en stock</Text>
            <TextInput
              style={styles.textInput}
              value={stockQty}
              onChangeText={setStockQty}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Nouveau produit</Text>
              <Switch
                value={isNew}
                onValueChange={setIsNew}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.goldMuted }}
                thumbColor={isNew ? COLORS.gold : COLORS.textMuted}
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>En promotion</Text>
              <Switch
                value={isPromo}
                onValueChange={setIsPromo}
                trackColor={{ false: COLORS.surfaceBorder, true: COLORS.goldMuted }}
                thumbColor={isPromo ? COLORS.gold : COLORS.textMuted}
              />
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, uploading && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={uploading}
          >
            <Text style={styles.submitBtnText}>
              {uploading ? "Ajout en cours..." : "Ajouter le produit"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Not authenticated view
const NotAuthenticatedView: FC = () => (
  <View style={styles.notAuthContainer}>
    <View style={styles.lockContainer}>
      <Text style={styles.lockIcon}>[ ]</Text>
    </View>
    <Text style={styles.notAuthTitle}>Acces Reserve</Text>
    <Text style={styles.notAuthSubtitle}>
      Connectez-vous avec un compte vendeur pour acceder au tableau de bord
    </Text>
    <View style={styles.notAuthDivider} />
    <Text style={styles.notAuthHint}>Allez dans Profil pour vous connecter</Text>
  </View>
)

// Not seller view
const NotSellerView: FC = () => (
  <View style={styles.notAuthContainer}>
    <View style={styles.lockContainer}>
      <Text style={styles.lockIcon}>!</Text>
    </View>
    <Text style={styles.notAuthTitle}>Compte Non-Vendeur</Text>
    <Text style={styles.notAuthSubtitle}>
      Votre compte n'est pas configure comme vendeur. Contactez l'administrateur pour obtenir l'acces.
    </Text>
  </View>
)

export const DashboardScreen: FC = function DashboardScreen() {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { user, isAuthenticated, isLoading: authLoading } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>("overview")
  const [stats, setStats] = useState<SellerStats>({
    totalProducts: 0,
    totalOrders: 0,
    totalRevenue: 0,
    pendingOrders: 0,
  })
  const [recentOrders, setRecentOrders] = useState<SellerOrder[]>([])
  const [allOrders, setAllOrders] = useState<SellerOrder[]>([])
  const [products, setProducts] = useState<SellerProduct[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [showAddProduct, setShowAddProduct] = useState(false)

  const isSeller = user?.role === "seller" || user?.role === "admin"

  const loadDashboardData = useCallback(async () => {
    if (!user?.id || !isSeller) return

    // Always invalidate stale cache before fetching fresh data
    await invalidateSellerCaches(user.id)

    try {
      const [statsData, ordersData, productsData, categoriesData, allOrdersData] = await Promise.all([
        fetchSellerStats(user.id),
        fetchSellerRecentOrders(user.id, 5),
        fetchSellerProducts(user.id),
        getProductCategories(),
        fetchSellerOrders(user.id),
      ])
      setStats(statsData)
      setRecentOrders(ordersData)
      setProducts(productsData)
      setCategories(categoriesData)
      setAllOrders(allOrdersData)
    } catch (error) {
      console.error("Error loading dashboard:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, isSeller])

  useEffect(() => {
    if (isAuthenticated && isSeller) {
      loadDashboardData()

      // Subscribe to real-time updates with cache invalidation
      const ordersSubscription = subscribeToSellerOrdersWithCache(user!.id)
      const productsSubscription = subscribeToSellerProductsWithCache(user!.id)

      return () => {
        ordersSubscription.unsubscribe()
        productsSubscription.unsubscribe()
      }
    } else {
      setIsLoading(false)
      return undefined
    }
  }, [isAuthenticated, isSeller, loadDashboardData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    if (user?.id) {
      await invalidateSellerCaches(user.id)
    }
    await loadDashboardData()
    setRefreshing(false)
  }, [loadDashboardData, user?.id])

  const handleAddProduct = async (productData: NewProductInput) => {
    if (!user?.id) return

    const result = await addProductWithCache(user.id, {
      ...productData,
      seller_category: user.seller_category || "fournisseur",  // Use correct enum value
    })

    if (result.success) {
      Alert.alert("Succes", "Produit ajoute avec succes")
      loadDashboardData()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de l'ajout du produit")
    }
  }

  const handleDeleteProduct = async (productId: string) => {
    if (!user?.id) return

    const result = await deleteProductWithCache(productId, user.id)
    if (result.success) {
      Alert.alert("Succes", "Produit supprime")
      loadDashboardData()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de la suppression")
    }
  }

  const handleUpdateOrderStatus = async (orderId: string, status: SellerOrder["status"]) => {
    if (!user?.id) return

    const result = await updateOrderStatusWithCache(orderId, status, user.id)
    if (result.success) {
      loadDashboardData()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de la mise a jour")
    }
  }

  // Loading state
  if (authLoading || (isAuthenticated && isLoading)) {
    return (
      <View style={[styles.container, $topInsets, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    )
  }

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, $topInsets]}>
        <NotAuthenticatedView />
      </View>
    )
  }

  // Not a seller
  if (!isSeller) {
    return (
      <View style={[styles.container, $topInsets]}>
        <NotSellerView />
      </View>
    )
  }

  return (
    <View style={[styles.container, $topInsets]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>Bonjour,</Text>
        <Text style={styles.userName}>{user?.full_name || "Vendeur"}</Text>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "overview" && styles.tabActive]}
          onPress={() => setActiveTab("overview")}
        >
          <Text style={[styles.tabText, activeTab === "overview" && styles.tabTextActive]}>Vue</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "products" && styles.tabActive]}
          onPress={() => setActiveTab("products")}
        >
          <Text style={[styles.tabText, activeTab === "products" && styles.tabTextActive]}>
            Produits ({products.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "orders" && styles.tabActive]}
          onPress={() => setActiveTab("orders")}
        >
          <Text style={[styles.tabText, activeTab === "orders" && styles.tabTextActive]}>
            Commandes ({stats.pendingOrders})
          </Text>
        </TouchableOpacity>
      </View>

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
        {/* Overview Tab */}
        {activeTab === "overview" && (
          <>
            {/* Stats Grid */}
            <View style={styles.statsSection}>
              <Text style={styles.sectionTitle}>Statistiques</Text>
              <View style={styles.statsGrid}>
                <StatCard
                  label="Revenu"
                  value={(stats.totalRevenue || 0).toLocaleString()}
                  suffix="DA"
                  variant="gold"
                />
                <StatCard label="Commandes" value={stats.totalOrders || 0} />
                <StatCard
                  label="En Attente"
                  value={stats.pendingOrders || 0}
                  variant={stats.pendingOrders > 0 ? "warning" : "default"}
                />
                <StatCard label="Produits" value={stats.totalProducts || 0} />
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionsSection}>
              <Text style={styles.sectionTitle}>Actions Rapides</Text>
              <TouchableOpacity style={styles.quickAction} onPress={() => setShowAddProduct(true)}>
                <Text style={styles.quickActionTitle}>Nouveau Produit</Text>
                <Text style={styles.quickActionSubtitle}>Ajouter au catalogue</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab("orders")}>
                <Text style={styles.quickActionTitle}>Commandes</Text>
                <Text style={styles.quickActionSubtitle}>Gerer les commandes</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.quickAction} onPress={() => setActiveTab("products")}>
                <Text style={styles.quickActionTitle}>Inventaire</Text>
                <Text style={styles.quickActionSubtitle}>Voir vos produits</Text>
              </TouchableOpacity>
            </View>

            {/* Recent Orders */}
            <View style={styles.ordersSection}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Commandes Recentes</Text>
                <TouchableOpacity onPress={() => setActiveTab("orders")}>
                  <Text style={styles.seeAllText}>Voir tout</Text>
                </TouchableOpacity>
              </View>
              {recentOrders.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateText}>Aucune commande recente</Text>
                </View>
              ) : (
                recentOrders.slice(0, 3).map((order) => (
                  <OrderItem
                    key={order.id}
                    order={order}
                    onUpdateStatus={handleUpdateOrderStatus}
                  />
                ))
              )}
            </View>
          </>
        )}

        {/* Products Tab */}
        {activeTab === "products" && (
          <View style={styles.productsSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Mes Produits</Text>
              <TouchableOpacity style={styles.addBtn} onPress={() => setShowAddProduct(true)}>
                <Text style={styles.addBtnText}>+ Ajouter</Text>
              </TouchableOpacity>
            </View>
            {products.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucun produit</Text>
                <TouchableOpacity
                  style={styles.emptyStateBtn}
                  onPress={() => setShowAddProduct(true)}
                >
                  <Text style={styles.emptyStateBtnText}>Ajouter un produit</Text>
                </TouchableOpacity>
              </View>
            ) : (
              products.map((product) => (
                <ProductItem
                  key={product.id}
                  product={product}
                  onDelete={handleDeleteProduct}
                />
              ))
            )}
          </View>
        )}

        {/* Orders Tab */}
        {activeTab === "orders" && (
          <View style={styles.ordersSection}>
            <Text style={styles.sectionTitle}>Toutes les Commandes</Text>
            {allOrders.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune commande</Text>
              </View>
            ) : (
              allOrders.map((order) => (
                <OrderItem
                  key={order.id}
                  order={order}
                  onUpdateStatus={handleUpdateOrderStatus}
                />
              ))
            )}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Add Product Modal */}
      <AddProductModal
        visible={showAddProduct}
        onClose={() => setShowAddProduct(false)}
        onAdd={handleAddProduct}
        categories={categories}
      />

      {/* Top gradient */}
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
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 12,
  } as ViewStyle,
  greeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  } as TextStyle,
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  } as ViewStyle,
  tab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  tabActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  tabText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  } as TextStyle,
  tabTextActive: {
    color: COLORS.gold,
  } as TextStyle,

  // Loading
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Not Auth
  notAuthContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  } as ViewStyle,
  lockContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  } as ViewStyle,
  lockIcon: {
    fontSize: 32,
    color: COLORS.gold,
  } as TextStyle,
  notAuthTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  } as TextStyle,
  notAuthSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  } as TextStyle,
  notAuthDivider: {
    height: 1,
    width: 60,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 24,
  } as ViewStyle,
  notAuthHint: {
    fontSize: 13,
    color: COLORS.textMuted,
  } as TextStyle,

  // Section
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 12,
  } as TextStyle,
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  seeAllText: {
    fontSize: 13,
    color: COLORS.gold,
  } as TextStyle,

  // Stats
  statsSection: {
    marginBottom: 24,
  } as ViewStyle,
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginHorizontal: -4,
  } as ViewStyle,
  statCard: {
    width: (SCREEN_WIDTH - 32 - 16) / 2,
    marginHorizontal: 4,
    marginBottom: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  } as ViewStyle,
  statLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 6,
  } as TextStyle,
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
  } as ViewStyle,
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,
  statValueGold: {
    color: COLORS.gold,
  } as TextStyle,
  statSuffix: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginLeft: 4,
  } as TextStyle,

  // Quick Actions
  actionsSection: {
    marginBottom: 24,
    gap: 8,
  } as ViewStyle,
  quickAction: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
  } as ViewStyle,
  quickActionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  } as TextStyle,
  quickActionSubtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Products
  productsSection: {
    marginBottom: 24,
  } as ViewStyle,
  productItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  productInfo: {
    flex: 1,
    marginRight: 12,
  } as ViewStyle,
  productName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  } as TextStyle,
  productCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  } as TextStyle,
  productMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  } as ViewStyle,
  productPrice: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
  } as TextStyle,
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  } as ViewStyle,
  stockIn: {
    backgroundColor: COLORS.successMuted,
  } as ViewStyle,
  stockOut: {
    backgroundColor: COLORS.errorMuted,
  } as ViewStyle,
  stockText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  deleteBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.errorMuted,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  deleteBtnText: {
    fontSize: 14,
    color: COLORS.error,
    fontWeight: "600",
  } as TextStyle,
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
  } as ViewStyle,
  addBtnText: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,

  // Orders
  ordersSection: {
    marginBottom: 24,
  } as ViewStyle,
  orderItem: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 8,
  } as ViewStyle,
  orderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  } as ViewStyle,
  orderId: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  } as ViewStyle,
  statusText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  } as TextStyle,
  orderBody: {
    marginBottom: 10,
  } as ViewStyle,
  orderInfo: {} as ViewStyle,
  orderAmount: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gold,
    marginBottom: 4,
  } as TextStyle,
  orderDate: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
  orderCustomer: {
    fontSize: 13,
    color: COLORS.text,
    marginTop: 4,
  } as TextStyle,
  orderAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
  } as TextStyle,
  orderActions: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  } as ViewStyle,
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
    alignItems: "center",
  } as ViewStyle,
  actionBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.gold,
  } as TextStyle,
  cancelBtn: {
    backgroundColor: COLORS.errorMuted,
  } as ViewStyle,
  cancelBtnText: {
    color: COLORS.error,
  } as TextStyle,

  // Empty state
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 32,
    alignItems: "center",
  } as ViewStyle,
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 12,
  } as TextStyle,
  emptyStateBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
  } as ViewStyle,
  emptyStateBtnText: {
    fontSize: 13,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  } as ViewStyle,
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
  } as ViewStyle,
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,
  modalClose: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  } as TextStyle,
  modalBody: {
    padding: 20,
  } as ViewStyle,
  inputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 16,
  } as TextStyle,
  textInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
  } as TextStyle,
  textArea: {
    height: 80,
    textAlignVertical: "top",
  } as TextStyle,
  categoryPicker: {
    flexDirection: "row",
    marginTop: 4,
  } as ViewStyle,
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginRight: 8,
  } as ViewStyle,
  categoryChipActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  categoryChipText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,
  categoryChipTextActive: {
    color: COLORS.gold,
  } as TextStyle,
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    paddingVertical: 8,
  } as ViewStyle,
  switchLabel: {
    fontSize: 14,
    color: COLORS.text,
  } as TextStyle,
  submitBtn: {
    margin: 20,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  submitBtnDisabled: {
    backgroundColor: COLORS.textMuted,
    opacity: 0.5,
  } as ViewStyle,
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,
  mediaUploadBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderStyle: "dashed",
    borderRadius: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  mediaUploadBtnText: {
    fontSize: 14,
    color: COLORS.text,
    marginBottom: 4,
  } as TextStyle,
  mediaUploadHint: {
    fontSize: 11,
    color: COLORS.textMuted,
  } as TextStyle,
  mediaPreview: {
    position: "relative",
    marginBottom: 16,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  imagePreview: {
    width: "100%",
    height: 200,
    resizeMode: "cover",
  } as ImageStyle,
  videoPreviewText: {
    fontSize: 14,
    color: COLORS.text,
    padding: 40,
    textAlign: "center",
  } as TextStyle,
  removeMediaBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  removeMediaBtnText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: "700",
  } as TextStyle,
})
