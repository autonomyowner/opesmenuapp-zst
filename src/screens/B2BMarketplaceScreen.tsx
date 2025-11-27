import { FC, useEffect, useState, useCallback } from "react"
import {
  View,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  Alert,
  Image,
  ImageStyle,
} from "react-native"
import { LinearGradient } from "expo-linear-gradient"
import * as ImagePicker from "expo-image-picker"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import { useAuth } from "@/context/AuthContext"
import {
  B2BOffer,
  B2BFilters,
  NewB2BOffer,
  B2BOfferResponse,
  B2BNotification,
  fetchB2BOffers,
  fetchMyB2BOffers,
  fetchMyOfferResponses,
  fetchB2BNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  getUnreadNotificationCount,
  createB2BOffer,
  deleteB2BOffer,
  submitB2BResponse,
  updateResponseStatus,
  canSellInB2B,
  canBuyInB2B,
  getTargetCategoryForSelling,
  B2BOfferType,
  B2BResponseStatus,
  B2BNotificationType,
} from "@/services/supabase/b2bService"
import { SellerCategory } from "@/services/supabase/types"

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

type TabType = "buy" | "sell" | "orders" | "notifications"

interface B2BMarketplaceScreenProps {
  onBack: () => void
}

// Offer Card Component
interface OfferCardProps {
  offer: B2BOffer
  onPress?: () => void
  showDelete?: boolean
  onDelete?: (id: string) => void
}

const OfferCard: FC<OfferCardProps> = ({ offer, onPress, showDelete, onDelete }) => {
  const handleDelete = () => {
    Alert.alert(
      "Supprimer l'offre",
      `Voulez-vous vraiment supprimer "${offer.title}"?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Supprimer", style: "destructive", onPress: () => onDelete?.(offer.id) },
      ]
    )
  }

  const getOfferTypeLabel = (type: B2BOfferType) => {
    return type === "auction" ? "Enchere" : "Negociable"
  }

  return (
    <TouchableOpacity style={styles.offerCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.offerCardRow}>
        {/* Image thumbnail */}
        {offer.images && offer.images.length > 0 ? (
          <Image source={{ uri: offer.images[0] }} style={styles.offerThumb} />
        ) : (
          <View style={styles.offerThumbPlaceholder}>
            <Text style={styles.offerThumbPlaceholderText}>B2B</Text>
          </View>
        )}

        {/* Content */}
        <View style={styles.offerContent}>
          <View style={styles.offerHeader}>
            <Text style={styles.offerTitle} numberOfLines={1}>{offer.title}</Text>
            <View style={[styles.offerTypeBadge, offer.offer_type === "auction" && styles.auctionBadge]}>
              <Text style={styles.offerTypeText}>{getOfferTypeLabel(offer.offer_type)}</Text>
            </View>
          </View>

          <Text style={styles.offerDescription} numberOfLines={1}>{offer.description}</Text>

          <View style={styles.offerBottomRow}>
            <Text style={styles.priceValue}>{offer.base_price.toLocaleString()} DA</Text>
            <Text style={styles.offerQty}>Min: {offer.min_quantity} | Dispo: {offer.available_quantity}</Text>
          </View>
        </View>

        {showDelete && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Text style={styles.deleteBtnText}>X</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  )
}

// Filter Modal Component
interface FilterModalProps {
  visible: boolean
  onClose: () => void
  filters: B2BFilters
  onApply: (filters: B2BFilters) => void
}

const FilterModal: FC<FilterModalProps> = ({ visible, onClose, filters, onApply }) => {
  const [localFilters, setLocalFilters] = useState<B2BFilters>(filters)

  useEffect(() => {
    setLocalFilters(filters)
  }, [filters])

  const handleApply = () => {
    onApply(localFilters)
    onClose()
  }

  const handleReset = () => {
    setLocalFilters({})
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Filtres</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <Text style={styles.inputLabel}>Prix minimum (DA)</Text>
            <TextInput
              style={styles.textInput}
              value={localFilters.minPrice?.toString() || ""}
              onChangeText={(v) => setLocalFilters({ ...localFilters, minPrice: v ? parseInt(v) : undefined })}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Prix maximum (DA)</Text>
            <TextInput
              style={styles.textInput}
              value={localFilters.maxPrice?.toString() || ""}
              onChangeText={(v) => setLocalFilters({ ...localFilters, maxPrice: v ? parseInt(v) : undefined })}
              placeholder="1000000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Quantite minimum</Text>
            <TextInput
              style={styles.textInput}
              value={localFilters.minQuantity?.toString() || ""}
              onChangeText={(v) => setLocalFilters({ ...localFilters, minQuantity: v ? parseInt(v) : undefined })}
              placeholder="1"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Quantite maximum</Text>
            <TextInput
              style={styles.textInput}
              value={localFilters.maxQuantity?.toString() || ""}
              onChangeText={(v) => setLocalFilters({ ...localFilters, maxQuantity: v ? parseInt(v) : undefined })}
              placeholder="10000"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Type d'offre</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, !localFilters.offerType && styles.typeOptionActive]}
                onPress={() => setLocalFilters({ ...localFilters, offerType: undefined })}
              >
                <Text style={[styles.typeOptionText, !localFilters.offerType && styles.typeOptionTextActive]}>
                  Tous
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, localFilters.offerType === "negotiable" && styles.typeOptionActive]}
                onPress={() => setLocalFilters({ ...localFilters, offerType: "negotiable" })}
              >
                <Text style={[styles.typeOptionText, localFilters.offerType === "negotiable" && styles.typeOptionTextActive]}>
                  Negociable
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, localFilters.offerType === "auction" && styles.typeOptionActive]}
                onPress={() => setLocalFilters({ ...localFilters, offerType: "auction" })}
              >
                <Text style={[styles.typeOptionText, localFilters.offerType === "auction" && styles.typeOptionTextActive]}>
                  Enchere
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Recherche</Text>
            <TextInput
              style={styles.textInput}
              value={localFilters.searchQuery || ""}
              onChangeText={(v) => setLocalFilters({ ...localFilters, searchQuery: v || undefined })}
              placeholder="Rechercher..."
              placeholderTextColor={COLORS.textMuted}
            />
          </ScrollView>

          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.resetBtn} onPress={handleReset}>
              <Text style={styles.resetBtnText}>Reinitialiser</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyBtn} onPress={handleApply}>
              <Text style={styles.applyBtnText}>Appliquer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  )
}

// Create Offer Modal
interface CreateOfferModalProps {
  visible: boolean
  onClose: () => void
  onSubmit: (offer: NewB2BOffer) => void
  targetCategory: SellerCategory
}

const CreateOfferModal: FC<CreateOfferModalProps> = ({ visible, onClose, onSubmit, targetCategory }) => {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [basePrice, setBasePrice] = useState("")
  const [minQuantity, setMinQuantity] = useState("")
  const [availableQuantity, setAvailableQuantity] = useState("")
  const [offerType, setOfferType] = useState<B2BOfferType>("negotiable")
  const [tags, setTags] = useState("")
  const [imageUri, setImageUri] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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
    }
  }

  const handleSubmit = () => {
    if (!title.trim()) {
      Alert.alert("Erreur", "Le titre est requis")
      return
    }
    if (!description.trim()) {
      Alert.alert("Erreur", "La description est requise")
      return
    }
    if (!basePrice || parseFloat(basePrice) <= 0) {
      Alert.alert("Erreur", "Le prix doit etre superieur a 0")
      return
    }
    if (!minQuantity || parseInt(minQuantity) <= 0) {
      Alert.alert("Erreur", "La quantite minimum doit etre superieure a 0")
      return
    }
    if (!availableQuantity || parseInt(availableQuantity) <= 0) {
      Alert.alert("Erreur", "La quantite disponible doit etre superieure a 0")
      return
    }

    setIsSubmitting(true)

    const tagsArray = tags
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0)

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      base_price: parseFloat(basePrice),
      min_quantity: parseInt(minQuantity),
      available_quantity: parseInt(availableQuantity),
      offer_type: offerType,
      target_category: targetCategory,
      tags: tagsArray,
      images: imageUri ? [imageUri] : [],
    })

    // Reset form
    setTitle("")
    setDescription("")
    setBasePrice("")
    setMinQuantity("")
    setAvailableQuantity("")
    setOfferType("negotiable")
    setTags("")
    setImageUri(null)
    setIsSubmitting(false)
    onClose()
  }

  const getTargetLabel = (category: SellerCategory) => {
    switch (category) {
      case "fournisseur":
        return "Fournisseurs"
      case "grossiste":
        return "Grossistes"
      default:
        return category
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Nouvelle Offre B2B</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody}>
            <View style={styles.targetInfo}>
              <Text style={styles.targetLabel}>Offre destinee aux:</Text>
              <Text style={styles.targetValue}>{getTargetLabel(targetCategory)}</Text>
            </View>

            <Text style={styles.inputLabel}>Titre *</Text>
            <TextInput
              style={styles.textInput}
              value={title}
              onChangeText={setTitle}
              placeholder="Titre de l'offre"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Description *</Text>
            <TextInput
              style={[styles.textInput, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Description detaillee..."
              placeholderTextColor={COLORS.textMuted}
              multiline
              numberOfLines={4}
            />

            <Text style={styles.inputLabel}>Prix de base (DA) *</Text>
            <TextInput
              style={styles.textInput}
              value={basePrice}
              onChangeText={setBasePrice}
              placeholder="0"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Quantite minimum *</Text>
            <TextInput
              style={styles.textInput}
              value={minQuantity}
              onChangeText={setMinQuantity}
              placeholder="10"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Quantite disponible *</Text>
            <TextInput
              style={styles.textInput}
              value={availableQuantity}
              onChangeText={setAvailableQuantity}
              placeholder="100"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="numeric"
            />

            <Text style={styles.inputLabel}>Type d'offre</Text>
            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeOption, offerType === "negotiable" && styles.typeOptionActive]}
                onPress={() => setOfferType("negotiable")}
              >
                <Text style={[styles.typeOptionText, offerType === "negotiable" && styles.typeOptionTextActive]}>
                  Negociable
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeOption, offerType === "auction" && styles.typeOptionActive]}
                onPress={() => setOfferType("auction")}
              >
                <Text style={[styles.typeOptionText, offerType === "auction" && styles.typeOptionTextActive]}>
                  Enchere
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Categories (separees par virgule)</Text>
            <TextInput
              style={styles.textInput}
              value={tags}
              onChangeText={setTags}
              placeholder="Electronique, Telephone, Accessoires"
              placeholderTextColor={COLORS.textMuted}
            />

            <Text style={styles.inputLabel}>Image (optionnel)</Text>
            <TouchableOpacity style={styles.mediaUploadBtn} onPress={pickImage}>
              <Text style={styles.mediaUploadBtnText}>
                {imageUri ? "Image selectionnee" : "Ajouter une image"}
              </Text>
            </TouchableOpacity>
            {imageUri && (
              <View style={styles.mediaPreview}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} />
                <TouchableOpacity style={styles.removeMediaBtn} onPress={() => setImageUri(null)}>
                  <Text style={styles.removeMediaBtnText}>X</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>

          <TouchableOpacity
            style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.submitBtnText}>
              {isSubmitting ? "Creation..." : "Creer l'offre"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Offer Detail Modal - Full screen experience like ProductDetailScreen
interface OfferDetailModalProps {
  visible: boolean
  offer: B2BOffer | null
  onClose: () => void
  onSubmitResponse: (offerId: string, amount: number, quantity: number, message?: string) => void
}

const OfferDetailModal: FC<OfferDetailModalProps> = ({ visible, offer, onClose, onSubmitResponse }) => {
  const [proposedPrice, setProposedPrice] = useState("")
  const [quantity, setQuantity] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (offer) {
      setProposedPrice(offer.base_price.toString())
      setQuantity(offer.min_quantity.toString())
      setMessage("")
    }
  }, [offer])

  if (!offer) return null

  const getOfferTypeLabel = (type: B2BOfferType) => {
    return type === "auction" ? "Enchere" : "Negociable"
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return null
    const date = new Date(dateStr)
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()}`
  }

  const handleSubmit = async () => {
    const priceNum = parseFloat(proposedPrice)
    const qtyNum = parseInt(quantity)

    if (!priceNum || priceNum <= 0) {
      Alert.alert("Erreur", "Veuillez entrer un prix valide")
      return
    }
    if (!qtyNum || qtyNum < offer.min_quantity) {
      Alert.alert("Erreur", `La quantite minimum est ${offer.min_quantity}`)
      return
    }
    if (qtyNum > offer.available_quantity) {
      Alert.alert("Erreur", `Quantite maximum disponible: ${offer.available_quantity}`)
      return
    }

    setIsSubmitting(true)
    await onSubmitResponse(offer.id, priceNum, qtyNum, message || undefined)
    setIsSubmitting(false)
  }

  const totalPrice = (parseFloat(proposedPrice) || 0) * (parseInt(quantity) || 0)

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={styles.detailContainer}>
        {/* Header */}
        <View style={styles.detailHeader}>
          <TouchableOpacity style={styles.detailBackBtn} onPress={onClose}>
            <Text style={styles.detailBackText}>Retour</Text>
          </TouchableOpacity>
          <View style={[styles.offerTypeBadge, offer.offer_type === "auction" && styles.auctionBadge]}>
            <Text style={styles.offerTypeText}>{getOfferTypeLabel(offer.offer_type)}</Text>
          </View>
        </View>

        <ScrollView style={styles.detailScrollView} showsVerticalScrollIndicator={false}>
          {/* Image */}
          {offer.images && offer.images.length > 0 ? (
            <Image source={{ uri: offer.images[0] }} style={styles.detailImage} />
          ) : (
            <View style={styles.detailImagePlaceholder}>
              <Text style={styles.detailImagePlaceholderText}>Pas d'image</Text>
            </View>
          )}

          {/* Content */}
          <View style={styles.detailContent}>
            <Text style={styles.detailTitle}>{offer.title}</Text>

            {offer.seller && (
              <Text style={styles.detailSeller}>Vendeur: {offer.seller.full_name}</Text>
            )}

            {/* Price Section */}
            <View style={styles.detailPriceSection}>
              <View style={styles.detailPriceRow}>
                <Text style={styles.detailPriceLabel}>Prix de base</Text>
                <Text style={styles.detailPriceValue}>{offer.base_price.toLocaleString()} DA</Text>
              </View>
              {offer.offer_type === "auction" && offer.current_bid && (
                <View style={styles.detailPriceRow}>
                  <Text style={styles.detailPriceLabel}>Enchere actuelle</Text>
                  <Text style={[styles.detailPriceValue, styles.bidValue]}>{offer.current_bid.toLocaleString()} DA</Text>
                </View>
              )}
            </View>

            {/* Details */}
            <View style={styles.detailInfoSection}>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Quantite minimum</Text>
                <Text style={styles.detailInfoValue}>{offer.min_quantity} unites</Text>
              </View>
              <View style={styles.detailInfoRow}>
                <Text style={styles.detailInfoLabel}>Quantite disponible</Text>
                <Text style={styles.detailInfoValue}>{offer.available_quantity} unites</Text>
              </View>
              {offer.ends_at && (
                <View style={styles.detailInfoRow}>
                  <Text style={styles.detailInfoLabel}>Date d'expiration</Text>
                  <Text style={styles.detailInfoValue}>{formatDate(offer.ends_at)}</Text>
                </View>
              )}
            </View>

            {/* Description */}
            <View style={styles.detailDescSection}>
              <Text style={styles.detailDescTitle}>Description</Text>
              <Text style={styles.detailDescText}>{offer.description}</Text>
            </View>

            {/* Tags */}
            {offer.tags && offer.tags.length > 0 && (
              <View style={styles.detailTagsSection}>
                <Text style={styles.detailTagsTitle}>Categories</Text>
                <View style={styles.detailTagsContainer}>
                  {offer.tags.map((tag, index) => (
                    <View key={index} style={styles.detailTag}>
                      <Text style={styles.detailTagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Order Form */}
            <View style={styles.orderFormSection}>
              <Text style={styles.orderFormTitle}>
                {offer.offer_type === "auction" ? "Placer une enchere" : "Faire une offre"}
              </Text>

              <Text style={styles.orderInputLabel}>
                {offer.offer_type === "auction" ? "Votre enchere (DA)" : "Prix propose (DA)"}
              </Text>
              <TextInput
                style={styles.orderInput}
                value={proposedPrice}
                onChangeText={setProposedPrice}
                keyboardType="numeric"
                placeholder={offer.base_price.toString()}
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.orderInputLabel}>Quantite</Text>
              <TextInput
                style={styles.orderInput}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder={offer.min_quantity.toString()}
                placeholderTextColor={COLORS.textMuted}
              />

              <Text style={styles.orderInputLabel}>Message (optionnel)</Text>
              <TextInput
                style={[styles.orderInput, styles.orderInputMultiline]}
                value={message}
                onChangeText={setMessage}
                placeholder="Ajoutez un message pour le vendeur..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={3}
              />

              {/* Total */}
              <View style={styles.orderTotalSection}>
                <Text style={styles.orderTotalLabel}>Total estime</Text>
                <Text style={styles.orderTotalValue}>{totalPrice.toLocaleString()} DA</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Bottom Action */}
        <View style={styles.detailBottomAction}>
          <TouchableOpacity
            style={[styles.detailSubmitBtn, isSubmitting && styles.submitBtnDisabled]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.detailSubmitBtnText}>
              {isSubmitting
                ? "Envoi en cours..."
                : offer.offer_type === "auction"
                ? "Placer l'enchere"
                : "Envoyer l'offre"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

// Response Card Component - for viewing incoming orders/bids
interface ResponseCardProps {
  response: B2BOfferResponse
  onAccept: (id: string) => void
  onReject: (id: string) => void
}

const ResponseCard: FC<ResponseCardProps> = ({ response, onAccept, onReject }) => {
  const getStatusColor = (status: B2BResponseStatus) => {
    switch (status) {
      case "pending":
        return { bg: COLORS.warningMuted, text: COLORS.warning }
      case "accepted":
        return { bg: COLORS.successMuted, text: COLORS.success }
      case "rejected":
        return { bg: COLORS.errorMuted, text: COLORS.error }
      default:
        return { bg: COLORS.surfaceElevated, text: COLORS.textSecondary }
    }
  }

  const getStatusLabel = (status: B2BResponseStatus) => {
    switch (status) {
      case "pending":
        return "En attente"
      case "accepted":
        return "Accepte"
      case "rejected":
        return "Refuse"
      case "outbid":
        return "Depasse"
      case "withdrawn":
        return "Retire"
      default:
        return status
    }
  }

  const getTypeLabel = (type: string) => {
    return type === "bid" ? "Enchere" : "Negociation"
  }

  const getCategoryLabel = (category?: SellerCategory) => {
    if (!category) return ""
    switch (category) {
      case "fournisseur":
        return "Fournisseur"
      case "grossiste":
        return "Grossiste"
      case "importateur":
        return "Importateur"
      default:
        return category
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}/${date.getFullYear()} ${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`
  }

  const statusColors = getStatusColor(response.status)
  const totalAmount = response.amount * response.quantity

  const handleAccept = () => {
    Alert.alert(
      "Accepter cette offre",
      `Voulez-vous accepter l'offre de ${response.buyer?.full_name || "ce client"} pour ${totalAmount.toLocaleString()} DA?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Accepter", onPress: () => onAccept(response.id) },
      ]
    )
  }

  const handleReject = () => {
    Alert.alert(
      "Refuser cette offre",
      `Voulez-vous refuser l'offre de ${response.buyer?.full_name || "ce client"}?`,
      [
        { text: "Annuler", style: "cancel" },
        { text: "Refuser", style: "destructive", onPress: () => onReject(response.id) },
      ]
    )
  }

  return (
    <View style={styles.responseCard}>
      {/* Header with offer info if available */}
      {response.offer && (
        <View style={styles.responseOfferInfo}>
          <Text style={styles.responseOfferTitle} numberOfLines={1}>
            {(response.offer as { title?: string }).title || "Offre"}
          </Text>
        </View>
      )}

      {/* Buyer info row */}
      <View style={styles.responseBuyerRow}>
        <View style={styles.responseBuyerInfo}>
          <Text style={styles.responseBuyerName}>{response.buyer?.full_name || "Acheteur"}</Text>
          {response.buyer?.seller_category && (
            <View style={styles.responseBuyerCategory}>
              <Text style={styles.responseBuyerCategoryText}>
                {getCategoryLabel(response.buyer.seller_category)}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.responseStatusBadge, { backgroundColor: statusColors.bg }]}>
          <Text style={[styles.responseStatusText, { color: statusColors.text }]}>
            {getStatusLabel(response.status)}
          </Text>
        </View>
      </View>

      {/* Type badge */}
      <View style={styles.responseTypeBadge}>
        <Text style={styles.responseTypeText}>{getTypeLabel(response.response_type)}</Text>
      </View>

      {/* Amount and quantity */}
      <View style={styles.responseDetails}>
        <View style={styles.responseDetailItem}>
          <Text style={styles.responseDetailLabel}>Prix unitaire</Text>
          <Text style={styles.responseDetailValue}>{response.amount.toLocaleString()} DA</Text>
        </View>
        <View style={styles.responseDetailItem}>
          <Text style={styles.responseDetailLabel}>Quantite</Text>
          <Text style={styles.responseDetailValue}>{response.quantity} unites</Text>
        </View>
        <View style={styles.responseDetailItem}>
          <Text style={styles.responseDetailLabel}>Total</Text>
          <Text style={styles.responseDetailValueGold}>{totalAmount.toLocaleString()} DA</Text>
        </View>
      </View>

      {/* Message if any */}
      {response.message && (
        <View style={styles.responseMessageBox}>
          <Text style={styles.responseMessageLabel}>Message:</Text>
          <Text style={styles.responseMessageText}>{response.message}</Text>
        </View>
      )}

      {/* Date */}
      <Text style={styles.responseDate}>{formatDate(response.created_at)}</Text>

      {/* Actions for pending responses */}
      {response.status === "pending" && (
        <View style={styles.responseActions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={handleReject}>
            <Text style={styles.rejectBtnText}>Refuser</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={handleAccept}>
            <Text style={styles.acceptBtnText}>Accepter</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Phone contact for accepted */}
      {response.status === "accepted" && response.buyer?.phone && (
        <View style={styles.contactSection}>
          <Text style={styles.contactLabel}>Contact:</Text>
          <Text style={styles.contactPhone}>{response.buyer.phone}</Text>
        </View>
      )}
    </View>
  )
}

// Notification Card Component
interface NotificationCardProps {
  notification: B2BNotification
  onPress: (id: string) => void
}

const NotificationCard: FC<NotificationCardProps> = ({ notification, onPress }) => {
  const getTypeIcon = (type: B2BNotificationType): string => {
    switch (type) {
      case "bid_accepted":
      case "negotiation_accepted":
      case "auction_won":
        return "OK"
      case "bid_rejected":
      case "negotiation_rejected":
      case "auction_lost":
        return "X"
      case "new_offer":
      case "new_bid":
      case "negotiation_submitted":
        return "+"
      case "outbid":
        return "!"
      case "auction_ending_soon":
        return "T"
      case "offer_expired":
        return "-"
      default:
        return "N"
    }
  }

  const getTypeColor = (type: B2BNotificationType) => {
    switch (type) {
      case "bid_accepted":
      case "negotiation_accepted":
      case "auction_won":
        return { bg: COLORS.successMuted, text: COLORS.success }
      case "bid_rejected":
      case "negotiation_rejected":
      case "auction_lost":
      case "offer_expired":
        return { bg: COLORS.errorMuted, text: COLORS.error }
      case "outbid":
      case "auction_ending_soon":
        return { bg: COLORS.warningMuted, text: COLORS.warning }
      default:
        return { bg: COLORS.infoMuted, text: COLORS.info }
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "A l'instant"
    if (diffMins < 60) return `Il y a ${diffMins} min`
    if (diffHours < 24) return `Il y a ${diffHours}h`
    if (diffDays < 7) return `Il y a ${diffDays}j`
    return `${date.getDate().toString().padStart(2, "0")}/${(date.getMonth() + 1).toString().padStart(2, "0")}`
  }

  const typeColors = getTypeColor(notification.notification_type)

  return (
    <TouchableOpacity
      style={[styles.notificationCard, !notification.is_read && styles.notificationCardUnread]}
      onPress={() => onPress(notification.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.notificationIconBox, { backgroundColor: typeColors.bg }]}>
        <Text style={[styles.notificationIconText, { color: typeColors.text }]}>
          {getTypeIcon(notification.notification_type)}
        </Text>
      </View>
      <View style={styles.notificationContent}>
        <Text style={styles.notificationTitle}>{notification.title}</Text>
        <Text style={styles.notificationMessage} numberOfLines={2}>{notification.message}</Text>
        <Text style={styles.notificationTime}>{formatDate(notification.created_at)}</Text>
      </View>
      {!notification.is_read && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  )
}

export const B2BMarketplaceScreen: FC<B2BMarketplaceScreenProps> = ({ onBack }) => {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])
  const { user } = useAuth()

  const [activeTab, setActiveTab] = useState<TabType>("buy")
  const [offers, setOffers] = useState<B2BOffer[]>([])
  const [myOffers, setMyOffers] = useState<B2BOffer[]>([])
  const [myResponses, setMyResponses] = useState<B2BOfferResponse[]>([])
  const [notifications, setNotifications] = useState<B2BNotification[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [filters, setFilters] = useState<B2BFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [showCreateOffer, setShowCreateOffer] = useState(false)
  const [selectedOffer, setSelectedOffer] = useState<B2BOffer | null>(null)
  const [pendingCount, setPendingCount] = useState(0)
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  const userCategory = user?.seller_category || "fournisseur"
  const canBuy = canBuyInB2B(userCategory)
  const canSell = canSellInB2B(userCategory)
  const targetCategory = getTargetCategoryForSelling(userCategory)

  const loadOffers = useCallback(async () => {
    if (!user?.id) return

    try {
      if (activeTab === "buy" && canBuy) {
        const result = await fetchB2BOffers(userCategory, filters)
        setOffers(result.data)
      } else if (activeTab === "sell" && canSell) {
        const result = await fetchMyB2BOffers(user.id)
        setMyOffers(result.data)
      } else if (activeTab === "orders" && canSell) {
        const result = await fetchMyOfferResponses(user.id)
        setMyResponses(result.data)
        // Count pending responses
        const pending = result.data.filter((r) => r.status === "pending").length
        setPendingCount(pending)
      } else if (activeTab === "notifications") {
        const result = await fetchB2BNotifications(user.id)
        setNotifications(result.data)
        const unread = result.data.filter((n) => !n.is_read).length
        setUnreadNotifCount(unread)
      }
    } catch (error) {
      console.error("Error loading offers:", error)
    } finally {
      setIsLoading(false)
    }
  }, [user?.id, activeTab, canBuy, canSell, userCategory, filters])

  // Load pending count when sell tab is active
  useEffect(() => {
    if (user?.id && canSell && activeTab !== "orders") {
      fetchMyOfferResponses(user.id).then((result) => {
        const pending = result.data.filter((r) => r.status === "pending").length
        setPendingCount(pending)
      })
    }
  }, [user?.id, canSell, activeTab])

  // Load unread notification count
  useEffect(() => {
    if (user?.id && activeTab !== "notifications") {
      getUnreadNotificationCount(user.id).then(setUnreadNotifCount)
    }
  }, [user?.id, activeTab])

  useEffect(() => {
    setIsLoading(true)
    loadOffers()
  }, [loadOffers])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadOffers()
    setRefreshing(false)
  }, [loadOffers])

  const handleCreateOffer = async (offer: NewB2BOffer) => {
    if (!user?.id) return

    const result = await createB2BOffer(user.id, offer)
    if (result.success) {
      Alert.alert("Succes", "Offre creee avec succes")
      loadOffers()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de la creation")
    }
  }

  const handleDeleteOffer = async (offerId: string) => {
    if (!user?.id) return

    const result = await deleteB2BOffer(offerId, user.id)
    if (result.success) {
      Alert.alert("Succes", "Offre supprimee")
      loadOffers()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de la suppression")
    }
  }

  const handleSubmitResponse = async (offerId: string, amount: number, quantity: number, message?: string) => {
    if (!user?.id) return

    const offer = offers.find((o) => o.id === offerId)
    const responseType = offer?.offer_type === "auction" ? "bid" : "negotiation"

    const result = await submitB2BResponse(user.id, offerId, responseType, amount, quantity, message)
    if (result.success) {
      Alert.alert(
        "Succes",
        offer?.offer_type === "auction"
          ? "Votre enchere a ete placee avec succes"
          : "Votre offre a ete envoyee au vendeur"
      )
      setSelectedOffer(null)
      loadOffers()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de l'envoi")
    }
  }

  const handleAcceptResponse = async (responseId: string) => {
    if (!user?.id) return

    const result = await updateResponseStatus(responseId, user.id, "accepted")
    if (result.success) {
      Alert.alert("Succes", "L'offre a ete acceptee")
      loadOffers()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors de l'acceptation")
    }
  }

  const handleRejectResponse = async (responseId: string) => {
    if (!user?.id) return

    const result = await updateResponseStatus(responseId, user.id, "rejected")
    if (result.success) {
      Alert.alert("Succes", "L'offre a ete refusee")
      loadOffers()
    } else {
      Alert.alert("Erreur", result.error || "Erreur lors du refus")
    }
  }

  const handleNotificationPress = async (notificationId: string) => {
    await markNotificationAsRead(notificationId)
    // Update local state
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
    )
    setUnreadNotifCount((prev) => Math.max(0, prev - 1))
  }

  const handleMarkAllRead = async () => {
    if (!user?.id) return
    await markAllNotificationsAsRead(user.id)
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    setUnreadNotifCount(0)
  }

  const getCategoryLabel = (category: SellerCategory) => {
    switch (category) {
      case "fournisseur":
        return "Fournisseur"
      case "grossiste":
        return "Grossiste"
      case "importateur":
        return "Importateur"
      default:
        return category
    }
  }

  return (
    <View style={[styles.container, $topInsets]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.greeting}>Bienvenue,</Text>
          <View style={styles.userRow}>
            <Text style={styles.userName}>{user?.full_name || "Vendeur"}</Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{getCategoryLabel(userCategory)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {canBuy && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "buy" && styles.tabActive]}
            onPress={() => setActiveTab("buy")}
          >
            <Text style={[styles.tabText, activeTab === "buy" && styles.tabTextActive]}>
              Acheter
            </Text>
          </TouchableOpacity>
        )}
        {canSell && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "sell" && styles.tabActive]}
            onPress={() => setActiveTab("sell")}
          >
            <Text style={[styles.tabText, activeTab === "sell" && styles.tabTextActive]}>
              Vendre
            </Text>
          </TouchableOpacity>
        )}
        {canSell && (
          <TouchableOpacity
            style={[styles.tab, activeTab === "orders" && styles.tabActive]}
            onPress={() => setActiveTab("orders")}
          >
            <View style={styles.tabWithBadge}>
              <Text style={[styles.tabText, activeTab === "orders" && styles.tabTextActive]}>
                Commandes
              </Text>
              {pendingCount > 0 && (
                <View style={styles.tabBadge}>
                  <Text style={styles.tabBadgeText}>{pendingCount}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.tab, activeTab === "notifications" && styles.tabActive]}
          onPress={() => setActiveTab("notifications")}
        >
          <View style={styles.tabWithBadge}>
            <Text style={[styles.tabText, activeTab === "notifications" && styles.tabTextActive]}>
              Notifs
            </Text>
            {unreadNotifCount > 0 && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>{unreadNotifCount}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
        {activeTab === "buy" && canBuy && (
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilters(true)}>
            <Text style={styles.filterBtnText}>Filtres</Text>
          </TouchableOpacity>
        )}
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
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={COLORS.gold} />
            <Text style={styles.loadingText}>Chargement...</Text>
          </View>
        ) : activeTab === "buy" ? (
          <>
            {!canBuy ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Les importateurs ne peuvent pas acheter sur le marche B2B
                </Text>
              </View>
            ) : offers.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune offre disponible</Text>
                <Text style={styles.emptyStateSubtext}>
                  Revenez plus tard pour voir les nouvelles offres
                </Text>
              </View>
            ) : (
              offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onPress={() => setSelectedOffer(offer)}
                />
              ))
            )}
          </>
        ) : activeTab === "sell" ? (
          <>
            {!canSell ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>
                  Les fournisseurs ne peuvent pas vendre sur le marche B2B
                </Text>
                <Text style={styles.emptyStateSubtext}>
                  Ils vendent directement aux clients
                </Text>
              </View>
            ) : (
              <>
                <View style={styles.sellHeader}>
                  <Text style={styles.sectionTitle}>Mes Offres B2B</Text>
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => setShowCreateOffer(true)}
                  >
                    <Text style={styles.addBtnText}>+ Nouvelle offre</Text>
                  </TouchableOpacity>
                </View>

                {myOffers.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>Aucune offre creee</Text>
                    <TouchableOpacity
                      style={styles.emptyStateBtn}
                      onPress={() => setShowCreateOffer(true)}
                    >
                      <Text style={styles.emptyStateBtnText}>Creer une offre</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  myOffers.map((offer) => (
                    <OfferCard
                      key={offer.id}
                      offer={offer}
                      showDelete
                      onDelete={handleDeleteOffer}
                    />
                  ))
                )}
              </>
            )}
          </>
        ) : activeTab === "orders" ? (
          // Orders tab
          <>
            <View style={styles.sellHeader}>
              <Text style={styles.sectionTitle}>Commandes recues</Text>
              {pendingCount > 0 && (
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>{pendingCount} en attente</Text>
                </View>
              )}
            </View>

            {myResponses.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune commande recue</Text>
                <Text style={styles.emptyStateSubtext}>
                  Les commandes de vos offres B2B apparaitront ici
                </Text>
              </View>
            ) : (
              myResponses.map((response) => (
                <ResponseCard
                  key={response.id}
                  response={response}
                  onAccept={handleAcceptResponse}
                  onReject={handleRejectResponse}
                />
              ))
            )}
          </>
        ) : (
          // Notifications tab
          <>
            <View style={styles.sellHeader}>
              <Text style={styles.sectionTitle}>Notifications</Text>
              {unreadNotifCount > 0 && (
                <TouchableOpacity style={styles.markAllReadBtn} onPress={handleMarkAllRead}>
                  <Text style={styles.markAllReadText}>Tout marquer lu</Text>
                </TouchableOpacity>
              )}
            </View>

            {notifications.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>Aucune notification</Text>
                <Text style={styles.emptyStateSubtext}>
                  Vos notifications B2B apparaitront ici
                </Text>
              </View>
            ) : (
              notifications.map((notification) => (
                <NotificationCard
                  key={notification.id}
                  notification={notification}
                  onPress={handleNotificationPress}
                />
              ))
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Modals */}
      <FilterModal
        visible={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onApply={setFilters}
      />

      {targetCategory && (
        <CreateOfferModal
          visible={showCreateOffer}
          onClose={() => setShowCreateOffer(false)}
          onSubmit={handleCreateOffer}
          targetCategory={targetCategory}
        />
      )}

      {/* Offer Detail Modal */}
      <OfferDetailModal
        visible={!!selectedOffer}
        offer={selectedOffer}
        onClose={() => setSelectedOffer(null)}
        onSubmitResponse={handleSubmitResponse}
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
  backBtn: {
    marginBottom: 12,
  } as ViewStyle,
  backBtnText: {
    fontSize: 14,
    color: COLORS.gold,
  } as TextStyle,
  headerContent: {} as ViewStyle,
  greeting: {
    fontSize: 13,
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  } as TextStyle,
  userRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  userName: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  categoryBadgeText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,

  // Tabs
  tabsContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
    alignItems: "center",
  } as ViewStyle,
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
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
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  } as TextStyle,
  tabTextActive: {
    color: COLORS.gold,
  } as TextStyle,
  filterBtn: {
    marginLeft: "auto",
    paddingVertical: 8,
    paddingHorizontal: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  filterBtnText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  } as ViewStyle,
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Offer Card - Compact
  offerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    marginBottom: 10,
    overflow: "hidden",
  } as ViewStyle,
  offerCardRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
  } as ViewStyle,
  offerThumb: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceElevated,
  } as ImageStyle,
  offerThumbPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 8,
    backgroundColor: COLORS.goldMuted,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  offerThumbPlaceholderText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  offerContent: {
    flex: 1,
    marginLeft: 12,
  } as ViewStyle,
  offerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  } as ViewStyle,
  offerTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  offerTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.infoMuted,
    borderRadius: 6,
  } as ViewStyle,
  auctionBadge: {
    backgroundColor: COLORS.warningMuted,
  } as ViewStyle,
  offerTypeText: {
    fontSize: 9,
    fontWeight: "600",
    color: COLORS.info,
    textTransform: "uppercase",
  } as TextStyle,
  offerDescription: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 6,
  } as TextStyle,
  offerBottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  } as ViewStyle,
  priceValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  offerQty: {
    fontSize: 11,
    color: COLORS.textMuted,
  } as TextStyle,
  bidValue: {
    color: COLORS.warning,
  } as TextStyle,
  deleteBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.errorMuted,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  } as ViewStyle,
  deleteBtnText: {
    fontSize: 12,
    color: COLORS.error,
    fontWeight: "600",
  } as TextStyle,

  // Empty state
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 40,
    alignItems: "center",
  } as ViewStyle,
  emptyStateText: {
    fontSize: 15,
    color: COLORS.text,
    textAlign: "center",
    marginBottom: 8,
  } as TextStyle,
  emptyStateSubtext: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: "center",
  } as TextStyle,
  emptyStateBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
  } as ViewStyle,
  emptyStateBtnText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,

  // Sell section
  sellHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  } as ViewStyle,
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    letterSpacing: 1,
    textTransform: "uppercase",
  } as TextStyle,
  addBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
  } as ViewStyle,
  addBtnText: {
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
  modalFooter: {
    flexDirection: "row",
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
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
    height: 100,
    textAlignVertical: "top",
  } as TextStyle,
  typeSelector: {
    flexDirection: "row",
    gap: 8,
  } as ViewStyle,
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    alignItems: "center",
  } as ViewStyle,
  typeOptionActive: {
    backgroundColor: COLORS.goldMuted,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  typeOptionText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontWeight: "500",
  } as TextStyle,
  typeOptionTextActive: {
    color: COLORS.gold,
  } as TextStyle,
  resetBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    alignItems: "center",
  } as ViewStyle,
  resetBtnText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "600",
  } as TextStyle,
  applyBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: COLORS.gold,
    borderRadius: 10,
    alignItems: "center",
  } as ViewStyle,
  applyBtnText: {
    fontSize: 14,
    color: COLORS.background,
    fontWeight: "700",
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
  targetInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 10,
    marginBottom: 8,
  } as ViewStyle,
  targetLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,
  targetValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
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
  } as ViewStyle,
  mediaUploadBtnText: {
    fontSize: 14,
    color: COLORS.text,
  } as TextStyle,
  mediaPreview: {
    position: "relative",
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: COLORS.surface,
  } as ViewStyle,
  imagePreview: {
    width: "100%",
    height: 180,
    resizeMode: "cover",
  } as ImageStyle,
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

  // Offer Detail Modal Styles
  detailContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
  } as ViewStyle,
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 12,
    backgroundColor: COLORS.background,
  } as ViewStyle,
  detailBackBtn: {
    paddingVertical: 8,
    paddingHorizontal: 4,
  } as ViewStyle,
  detailBackText: {
    fontSize: 14,
    color: COLORS.gold,
  } as TextStyle,
  detailScrollView: {
    flex: 1,
  } as ViewStyle,
  detailImage: {
    width: "100%",
    height: 280,
    backgroundColor: COLORS.surfaceElevated,
  } as ImageStyle,
  detailImagePlaceholder: {
    width: "100%",
    height: 200,
    backgroundColor: COLORS.surfaceElevated,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  detailImagePlaceholderText: {
    fontSize: 14,
    color: COLORS.textMuted,
  } as TextStyle,
  detailContent: {
    padding: 20,
  } as ViewStyle,
  detailTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 8,
  } as TextStyle,
  detailSeller: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: 20,
  } as TextStyle,
  detailPriceSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  } as ViewStyle,
  detailPriceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  } as ViewStyle,
  detailPriceLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,
  detailPriceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  detailInfoSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  } as ViewStyle,
  detailInfoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  detailInfoLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,
  detailInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  detailDescSection: {
    marginBottom: 16,
  } as ViewStyle,
  detailDescTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  } as TextStyle,
  detailDescText: {
    fontSize: 15,
    color: COLORS.text,
    lineHeight: 22,
  } as TextStyle,
  detailTagsSection: {
    marginBottom: 20,
  } as ViewStyle,
  detailTagsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 10,
  } as TextStyle,
  detailTagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as ViewStyle,
  detailTag: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
  } as ViewStyle,
  detailTagText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,
  orderFormSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    marginTop: 8,
  } as ViewStyle,
  orderFormTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 20,
  } as TextStyle,
  orderInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 12,
  } as TextStyle,
  orderInput: {
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  } as TextStyle,
  orderInputMultiline: {
    height: 80,
    textAlignVertical: "top",
  } as TextStyle,
  orderTotalSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  } as ViewStyle,
  orderTotalLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,
  orderTotalValue: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  detailBottomAction: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.background,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 30,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  } as ViewStyle,
  detailSubmitBtn: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  detailSubmitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,

  // Tab badge styles
  tabWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: COLORS.error,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
  } as ViewStyle,
  tabBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.text,
  } as TextStyle,
  pendingBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.warningMuted,
    borderRadius: 10,
  } as ViewStyle,
  pendingBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.warning,
  } as TextStyle,

  // Response Card styles
  responseCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  responseOfferInfo: {
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  responseOfferTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
  } as TextStyle,
  responseBuyerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  } as ViewStyle,
  responseBuyerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  } as ViewStyle,
  responseBuyerName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  responseBuyerCategory: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 6,
  } as ViewStyle,
  responseBuyerCategoryText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.gold,
  } as TextStyle,
  responseStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  } as ViewStyle,
  responseStatusText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  } as TextStyle,
  responseTypeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.infoMuted,
    borderRadius: 6,
    marginBottom: 12,
  } as ViewStyle,
  responseTypeText: {
    fontSize: 10,
    fontWeight: "600",
    color: COLORS.info,
    textTransform: "uppercase",
  } as TextStyle,
  responseDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  } as ViewStyle,
  responseDetailItem: {
    alignItems: "center",
  } as ViewStyle,
  responseDetailLabel: {
    fontSize: 10,
    color: COLORS.textMuted,
    marginBottom: 4,
    textTransform: "uppercase",
  } as TextStyle,
  responseDetailValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  responseDetailValueGold: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  responseMessageBox: {
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  } as ViewStyle,
  responseMessageLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 4,
  } as TextStyle,
  responseMessageText: {
    fontSize: 13,
    color: COLORS.text,
    lineHeight: 18,
  } as TextStyle,
  responseDate: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginBottom: 12,
  } as TextStyle,
  responseActions: {
    flexDirection: "row",
    gap: 10,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  } as ViewStyle,
  rejectBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.errorMuted,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.error,
  } as ViewStyle,
  rejectBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.error,
  } as TextStyle,
  acceptBtn: {
    flex: 1,
    paddingVertical: 12,
    backgroundColor: COLORS.success,
    borderRadius: 10,
    alignItems: "center",
  } as ViewStyle,
  acceptBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,
  contactSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.surfaceBorder,
  } as ViewStyle,
  contactLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,
  contactPhone: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.gold,
  } as TextStyle,

  // Notification styles
  markAllReadBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 8,
  } as ViewStyle,
  markAllReadText: {
    fontSize: 12,
    color: COLORS.gold,
    fontWeight: "600",
  } as TextStyle,
  notificationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  } as ViewStyle,
  notificationCardUnread: {
    backgroundColor: COLORS.surfaceElevated,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  notificationIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  notificationIconText: {
    fontSize: 12,
    fontWeight: "700",
  } as TextStyle,
  notificationContent: {
    flex: 1,
  } as ViewStyle,
  notificationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 4,
  } as TextStyle,
  notificationMessage: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 4,
  } as TextStyle,
  notificationTime: {
    fontSize: 11,
    color: COLORS.textMuted,
  } as TextStyle,
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.gold,
  } as ViewStyle,
})
