import { FC, useState, useEffect } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  Image,
  ImageStyle,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { ProductWithImage } from "@/services/supabase/productService"
import { createOrder, WILAYAS, DeliveryType } from "@/services/supabase/orderService"
import { useAuth } from "@/context/AuthContext"

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window")

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
  error: "#EF4444",
  errorMuted: "rgba(239, 68, 68, 0.15)",
}

interface ProductDetailScreenProps {
  product: ProductWithImage
  onBack: () => void
}

export const ProductDetailScreen: FC<ProductDetailScreenProps> = ({ product, onBack }) => {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { user, isAuthenticated } = useAuth()

  const [quantity, setQuantity] = useState(1)
  const [showOrderForm, setShowOrderForm] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Order form state
  const [customerName, setCustomerName] = useState("")
  const [customerPhone, setCustomerPhone] = useState("")
  const [wilaya, setWilaya] = useState("")
  const [commune, setCommune] = useState("")
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("home")
  const [showWilayaPicker, setShowWilayaPicker] = useState(false)

  const totalPrice = (product.price || 0) * quantity

  const handleQuantityChange = (delta: number) => {
    const newQty = quantity + delta
    if (newQty >= 1 && newQty <= 10) {
      setQuantity(newQty)
    }
  }

  const handleSubmitOrder = async () => {
    // Validation
    if (!customerName.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre nom complet")
      return
    }
    if (!customerPhone.trim() || customerPhone.length < 10) {
      Alert.alert("Erreur", "Veuillez entrer un numero de telephone valide")
      return
    }
    if (!wilaya) {
      Alert.alert("Erreur", "Veuillez selectionner une wilaya")
      return
    }
    if (!commune.trim()) {
      Alert.alert("Erreur", "Veuillez entrer votre commune")
      return
    }

    setIsSubmitting(true)

    const result = await createOrder({
      product_id: product.id,
      product_name: product.name,
      product_image: product.image_url,
      quantity,
      unit_price: product.price,
      total_amount: totalPrice,
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      wilaya,
      commune: commune.trim(),
      delivery_type: deliveryType,
      seller_id: (product as any).seller_id,  // Pass seller for order tracking
      user_id: isAuthenticated && user?.id ? user.id : undefined,  // Link order to authenticated user
    })

    setIsSubmitting(false)

    if (result.success) {
      Alert.alert(
        "Commande confirmee",
        `Votre commande #${result.orderNumber || result.orderId?.slice(0, 8).toUpperCase()} a ete passee avec succes. Vous serez contacte bientot.`,
        [{ text: "OK", onPress: onBack }]
      )
    } else {
      Alert.alert("Erreur", result.error || "Une erreur est survenue")
    }
  }

  // Wilaya Picker Modal
  const WilayaPickerModal = () => (
    <Modal visible={showWilayaPicker} transparent animationType="slide">
      <View style={styles.pickerOverlay}>
        <View style={styles.pickerContent}>
          <View style={styles.pickerHeader}>
            <Text style={styles.pickerTitle}>Selectionnez une wilaya</Text>
            <TouchableOpacity onPress={() => setShowWilayaPicker(false)}>
              <Text style={styles.pickerClose}>X</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.pickerList}>
            {WILAYAS.map((w, index) => (
              <TouchableOpacity
                key={w}
                style={[styles.pickerItem, wilaya === w && styles.pickerItemActive]}
                onPress={() => {
                  setWilaya(w)
                  setShowWilayaPicker(false)
                }}
              >
                <Text style={styles.pickerItemNumber}>{(index + 1).toString().padStart(2, "0")}</Text>
                <Text style={[styles.pickerItemText, wilaya === w && styles.pickerItemTextActive]}>
                  {w}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  )

  return (
    <View style={[styles.container, $topInsets]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, $bottomInsets]}
          showsVerticalScrollIndicator={false}
        >
          {/* Back Button */}
          <TouchableOpacity style={styles.backButton} onPress={onBack}>
            <Text style={styles.backButtonText}>← Retour</Text>
          </TouchableOpacity>

          {/* Product Image */}
          <View style={styles.imageContainer}>
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
            {product.is_promo && (
              <View style={styles.promoBadge}>
                <Text style={styles.promoText}>PROMO</Text>
              </View>
            )}
          </View>

          {/* Product Info */}
          <View style={styles.productInfo}>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productName}>{product.name}</Text>
            {product.description && (
              <Text style={styles.productDescription}>{product.description}</Text>
            )}

            <View style={styles.priceRow}>
              <Text style={styles.productPrice}>{(product.price || 0).toLocaleString()} DA</Text>
              {product.original_price && product.original_price > product.price && (
                <Text style={styles.originalPrice}>
                  {product.original_price.toLocaleString()} DA
                </Text>
              )}
            </View>

            {/* Stock Status */}
            <View style={[styles.stockBadge, product.in_stock ? styles.stockIn : styles.stockOut]}>
              <Text style={styles.stockText}>
                {product.in_stock ? "En stock" : "Rupture de stock"}
              </Text>
            </View>
          </View>

          {/* Order Section */}
          {product.in_stock && !showOrderForm && (
            <View style={styles.orderSection}>
              {/* Quantity Selector */}
              <View style={styles.quantitySection}>
                <Text style={styles.sectionLabel}>Quantite</Text>
                <View style={styles.quantitySelector}>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => handleQuantityChange(-1)}
                  >
                    <Text style={styles.quantityBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.quantityValue}>{quantity}</Text>
                  <TouchableOpacity
                    style={styles.quantityBtn}
                    onPress={() => handleQuantityChange(1)}
                  >
                    <Text style={styles.quantityBtnText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Order Summary */}
              <View style={styles.summaryCard}>
                <Text style={styles.summaryTitle}>Resume de la commande</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Produit:</Text>
                  <Text style={styles.summaryValue} numberOfLines={1}>{product.name}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Quantite:</Text>
                  <Text style={styles.summaryValue}>{quantity}</Text>
                </View>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryRow}>
                  <Text style={styles.totalLabel}>Prix total:</Text>
                  <Text style={styles.totalValue}>{totalPrice.toLocaleString()} DA</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.buyButton} onPress={() => setShowOrderForm(true)}>
                <Text style={styles.buyButtonText}>Commander maintenant</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Order Form */}
          {product.in_stock && showOrderForm && (
            <View style={styles.orderForm}>
              <Text style={styles.formTitle}>Informations de livraison</Text>

              {/* Order Summary Mini */}
              <View style={styles.miniSummary}>
                <Text style={styles.miniSummaryText}>
                  {product.name} x{quantity} = {totalPrice.toLocaleString()} DA
                </Text>
              </View>

              {/* Customer Name */}
              <Text style={styles.inputLabel}>Nom complet *</Text>
              <TextInput
                style={styles.textInput}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="Votre nom complet"
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Numero de telephone *</Text>
              <TextInput
                style={styles.textInput}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="0X XX XX XX XX"
                placeholderTextColor={COLORS.textMuted}
                keyboardType="phone-pad"
              />

              {/* Wilaya */}
              <Text style={styles.inputLabel}>Wilaya *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setShowWilayaPicker(true)}
              >
                <Text style={wilaya ? styles.selectText : styles.selectPlaceholder}>
                  {wilaya || "Selectionnez une wilaya"}
                </Text>
                <Text style={styles.selectArrow}>▼</Text>
              </TouchableOpacity>

              {/* Commune */}
              <Text style={styles.inputLabel}>Baladia (Commune) *</Text>
              <TextInput
                style={styles.textInput}
                value={commune}
                onChangeText={setCommune}
                placeholder="Nom de votre commune"
                placeholderTextColor={COLORS.textMuted}
              />

              {/* Delivery Type */}
              <Text style={styles.inputLabel}>Type de livraison *</Text>
              <View style={styles.deliveryOptions}>
                <TouchableOpacity
                  style={[styles.deliveryOption, deliveryType === "home" && styles.deliveryOptionActive]}
                  onPress={() => setDeliveryType("home")}
                >
                  <View style={[styles.radioOuter, deliveryType === "home" && styles.radioOuterActive]}>
                    {deliveryType === "home" && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.deliveryOptionText}>
                    <Text style={styles.deliveryOptionTitle}>A domicile</Text>
                    <Text style={styles.deliveryOptionDesc}>Livraison a votre adresse</Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.deliveryOption, deliveryType === "office" && styles.deliveryOptionActive]}
                  onPress={() => setDeliveryType("office")}
                >
                  <View style={[styles.radioOuter, deliveryType === "office" && styles.radioOuterActive]}>
                    {deliveryType === "office" && <View style={styles.radioInner} />}
                  </View>
                  <View style={styles.deliveryOptionText}>
                    <Text style={styles.deliveryOptionTitle}>Au bureau</Text>
                    <Text style={styles.deliveryOptionDesc}>Livraison au lieu de travail</Text>
                  </View>
                </TouchableOpacity>
              </View>

              {/* Actions */}
              <View style={styles.formActions}>
                <TouchableOpacity
                  style={styles.cancelFormBtn}
                  onPress={() => setShowOrderForm(false)}
                >
                  <Text style={styles.cancelFormBtnText}>Annuler</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                  onPress={handleSubmitOrder}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color={COLORS.background} />
                  ) : (
                    <Text style={styles.submitBtnText}>Confirmer la commande</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <WilayaPickerModal />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,
  flex: {
    flex: 1,
  } as ViewStyle,
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
  } as ViewStyle,

  // Back Button
  backButton: {
    paddingVertical: 12,
  } as ViewStyle,
  backButtonText: {
    fontSize: 15,
    color: COLORS.gold,
    fontWeight: "500",
  } as TextStyle,

  // Image
  imageContainer: {
    width: "100%",
    aspectRatio: 1,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    overflow: "hidden",
    marginBottom: 20,
  } as ViewStyle,
  productImage: {
    width: "100%",
    height: "100%",
  } as ImageStyle,
  imagePlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surfaceElevated,
  } as ViewStyle,
  imagePlaceholderText: {
    fontSize: 64,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  promoBadge: {
    position: "absolute",
    top: 16,
    left: 16,
    backgroundColor: COLORS.error,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  promoText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,

  // Product Info
  productInfo: {
    marginBottom: 24,
  } as ViewStyle,
  productCategory: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  productName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
  } as TextStyle,
  productDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
    marginBottom: 16,
  } as TextStyle,
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  } as ViewStyle,
  productPrice: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.gold,
  } as TextStyle,
  originalPrice: {
    fontSize: 16,
    color: COLORS.textMuted,
    textDecorationLine: "line-through",
    marginLeft: 12,
  } as TextStyle,
  stockBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  } as ViewStyle,
  stockIn: {
    backgroundColor: COLORS.successMuted,
  } as ViewStyle,
  stockOut: {
    backgroundColor: COLORS.errorMuted,
  } as ViewStyle,
  stockText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,

  // Order Section
  orderSection: {
    marginBottom: 24,
  } as ViewStyle,
  sectionLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  } as TextStyle,
  quantitySection: {
    marginBottom: 20,
  } as ViewStyle,
  quantitySelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    alignSelf: "flex-start",
  } as ViewStyle,
  quantityBtn: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  quantityBtnText: {
    fontSize: 24,
    color: COLORS.gold,
    fontWeight: "500",
  } as TextStyle,
  quantityValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    paddingHorizontal: 20,
  } as TextStyle,

  // Summary Card
  summaryCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    marginBottom: 20,
  } as ViewStyle,
  summaryTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 16,
  } as TextStyle,
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  } as ViewStyle,
  summaryLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,
  summaryValue: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
    textAlign: "right",
    marginLeft: 12,
  } as TextStyle,
  summaryDivider: {
    height: 1,
    backgroundColor: COLORS.surfaceBorder,
    marginVertical: 12,
  } as ViewStyle,
  totalLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  totalValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,

  buyButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  buyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,

  // Order Form
  orderForm: {
    marginBottom: 24,
  } as ViewStyle,
  formTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
  } as TextStyle,
  miniSummary: {
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  } as ViewStyle,
  miniSummaryText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
    textAlign: "center",
  } as TextStyle,

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
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
  } as TextStyle,
  selectInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  selectText: {
    fontSize: 15,
    color: COLORS.text,
  } as TextStyle,
  selectPlaceholder: {
    fontSize: 15,
    color: COLORS.textMuted,
  } as TextStyle,
  selectArrow: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,

  // Delivery Options
  deliveryOptions: {
    gap: 12,
  } as ViewStyle,
  deliveryOption: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
  } as ViewStyle,
  deliveryOptionActive: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.goldMuted,
  } as ViewStyle,
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: COLORS.surfaceBorder,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  } as ViewStyle,
  radioOuterActive: {
    borderColor: COLORS.gold,
  } as ViewStyle,
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.gold,
  } as ViewStyle,
  deliveryOptionText: {} as ViewStyle,
  deliveryOptionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 2,
  } as TextStyle,
  deliveryOptionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Form Actions
  formActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  } as ViewStyle,
  cancelFormBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: "center",
  } as ViewStyle,
  cancelFormBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textSecondary,
  } as TextStyle,
  submitBtn: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 12,
    backgroundColor: COLORS.gold,
    alignItems: "center",
  } as ViewStyle,
  submitBtnDisabled: {
    opacity: 0.7,
  } as ViewStyle,
  submitBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "flex-end",
  } as ViewStyle,
  pickerContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  } as ViewStyle,
  pickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  pickerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,
  pickerClose: {
    fontSize: 20,
    color: COLORS.textSecondary,
    padding: 4,
  } as TextStyle,
  pickerList: {
    padding: 16,
  } as ViewStyle,
  pickerItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 4,
  } as ViewStyle,
  pickerItemActive: {
    backgroundColor: COLORS.goldMuted,
  } as ViewStyle,
  pickerItemNumber: {
    fontSize: 12,
    color: COLORS.textMuted,
    width: 30,
    fontWeight: "500",
  } as TextStyle,
  pickerItemText: {
    fontSize: 15,
    color: COLORS.text,
  } as TextStyle,
  pickerItemTextActive: {
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,
})
