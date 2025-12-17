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
  Dimensions,
} from "react-native"

import { Text } from "@/components/Text"
import { useSafeAreaInsetsStyle } from "@/utils/useSafeAreaInsetsStyle"
import {
  fetchFreelanceServices,
  fetchFreelanceServicesByCategory,
  getServiceCategories,
  FreelanceService,
  ServiceCategory,
} from "@/services/supabase/freelanceService"

const { width: SCREEN_WIDTH } = Dimensions.get("window")

// Luxe Art Deco Color Palette (matching Dashboard)
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

interface FreelanceOffersScreenProps {
  onBack: () => void
}

// Service Card Component
interface ServiceCardProps {
  service: FreelanceService
  onPress: () => void
}

const ServiceCard: FC<ServiceCardProps> = ({ service, onPress }) => {
  const getPriceTypeLabel = (type: string) => {
    switch (type) {
      case "fixed":
        return "Prix fixe"
      case "hourly":
        return "/heure"
      case "starting-at":
        return "A partir de"
      default:
        return ""
    }
  }

  const getAvailabilityStyle = (status: string) => {
    switch (status) {
      case "available":
        return { bg: COLORS.successMuted, text: COLORS.success, label: "Disponible" }
      case "busy":
        return { bg: COLORS.warningMuted, text: COLORS.warning, label: "Occupe" }
      case "unavailable":
        return { bg: COLORS.errorMuted, text: COLORS.error, label: "Indisponible" }
      default:
        return { bg: COLORS.surfaceBorder, text: COLORS.textSecondary, label: status }
    }
  }

  const availabilityStyle = getAvailabilityStyle(service.availability)

  return (
    <TouchableOpacity style={styles.serviceCard} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.serviceHeader}>
        <Text style={styles.serviceTitle} numberOfLines={2}>
          {service.service_title}
        </Text>
        <View style={styles.badgesRow}>
          {service.verified && (
            <View style={styles.verifiedBadge}>
              <Text style={styles.verifiedText}>Verifie</Text>
            </View>
          )}
          <View style={[styles.availabilityBadge, { backgroundColor: availabilityStyle.bg }]}>
            <Text style={[styles.availabilityText, { color: availabilityStyle.text }]}>
              {availabilityStyle.label}
            </Text>
          </View>
        </View>
      </View>

      <Text style={styles.serviceDescription} numberOfLines={3}>
        {service.short_description || service.description}
      </Text>

      <View style={styles.categoryRow}>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{service.category}</Text>
        </View>
      </View>

      <View style={styles.serviceMeta}>
        <View style={styles.priceContainer}>
          <Text style={styles.priceValue}>{(service.price || 0).toLocaleString()} DA</Text>
          <Text style={styles.priceType}>{getPriceTypeLabel(service.price_type)}</Text>
        </View>

        <View style={styles.experienceBadge}>
          <Text style={styles.experienceText}>{service.experience_level}</Text>
        </View>
      </View>

      {service.delivery_time && (
        <View style={styles.deliveryRow}>
          <Text style={styles.deliveryLabel}>Delai:</Text>
          <Text style={styles.deliveryValue}>{service.delivery_time}</Text>
        </View>
      )}

      {service.rating !== undefined && service.rating > 0 && (
        <View style={styles.ratingRow}>
          <Text style={styles.ratingValue}>{service.rating.toFixed(1)}</Text>
          <Text style={styles.ratingLabel}>({service.reviews_count || 0} avis)</Text>
          {service.completed_projects > 0 && (
            <Text style={styles.projectsLabel}>
              - {service.completed_projects} projet{service.completed_projects > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}

      {service.skills && service.skills.length > 0 && (
        <View style={styles.skillsRow}>
          {service.skills.slice(0, 3).map((skill, index) => (
            <View key={index} style={styles.skillBadge}>
              <Text style={styles.skillText}>{skill}</Text>
            </View>
          ))}
          {service.skills.length > 3 && (
            <Text style={styles.moreSkills}>+{service.skills.length - 3}</Text>
          )}
        </View>
      )}

      {service.provider && (
        <Text style={styles.providerName}>Par {service.provider.full_name}</Text>
      )}
    </TouchableOpacity>
  )
}

// Service Detail Modal Component
interface ServiceDetailModalProps {
  visible: boolean
  service: FreelanceService | null
  onClose: () => void
  onMessage: (message: string) => void
}

const ServiceDetailModal: FC<ServiceDetailModalProps> = ({
  visible,
  service,
  onClose,
  onMessage,
}) => {
  const [message, setMessage] = useState("")

  if (!service) return null

  const getPriceTypeLabel = (type: string) => {
    switch (type) {
      case "fixed":
        return "Prix fixe"
      case "hourly":
        return "/heure"
      case "starting-at":
        return "A partir de"
      default:
        return ""
    }
  }

  const getAvailabilityStyle = (status: string) => {
    switch (status) {
      case "available":
        return { bg: COLORS.successMuted, text: COLORS.success, label: "Disponible" }
      case "busy":
        return { bg: COLORS.warningMuted, text: COLORS.warning, label: "Occupe" }
      case "unavailable":
        return { bg: COLORS.errorMuted, text: COLORS.error, label: "Indisponible" }
      default:
        return { bg: COLORS.surfaceBorder, text: COLORS.textSecondary, label: status }
    }
  }

  const availabilityStyle = getAvailabilityStyle(service.availability)

  const handleSendMessage = () => {
    if (!message.trim()) {
      Alert.alert("Erreur", "Veuillez entrer un message")
      return
    }
    onMessage(message)
    setMessage("")
  }

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Details du Service</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.modalClose}>X</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Service Title */}
            <Text style={styles.detailTitle}>{service.service_title}</Text>

            {/* Badges Row */}
            <View style={styles.detailBadgesRow}>
              {service.verified && (
                <View style={styles.verifiedBadge}>
                  <Text style={styles.verifiedText}>Verifie</Text>
                </View>
              )}
              <View style={[styles.availabilityBadge, { backgroundColor: availabilityStyle.bg }]}>
                <Text style={[styles.availabilityText, { color: availabilityStyle.text }]}>
                  {availabilityStyle.label}
                </Text>
              </View>
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{service.category}</Text>
              </View>
            </View>

            {/* Price Section */}
            <View style={styles.detailPriceSection}>
              <Text style={styles.detailPriceValue}>{(service.price || 0).toLocaleString()} DA</Text>
              <Text style={styles.detailPriceType}>{getPriceTypeLabel(service.price_type)}</Text>
            </View>

            {/* Provider */}
            {service.provider && (
              <View style={styles.detailProviderSection}>
                <Text style={styles.detailSectionLabel}>FREELANCER</Text>
                <Text style={styles.detailProviderName}>{service.provider.full_name}</Text>
              </View>
            )}

            {/* Description */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>DESCRIPTION</Text>
              <Text style={styles.detailDescription}>{service.description || service.short_description}</Text>
            </View>

            {/* Skills Section */}
            {service.skills && service.skills.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>COMPETENCES</Text>
                <View style={styles.detailSkillsGrid}>
                  {service.skills.map((skill, index) => (
                    <View key={index} style={styles.detailSkillBadge}>
                      <Text style={styles.detailSkillText}>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Details Grid */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>INFORMATIONS</Text>
              <View style={styles.detailInfoGrid}>
                {service.experience_level && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Experience</Text>
                    <Text style={styles.detailInfoValue}>{service.experience_level}</Text>
                  </View>
                )}
                {service.delivery_time && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Delai</Text>
                    <Text style={styles.detailInfoValue}>{service.delivery_time}</Text>
                  </View>
                )}
                {service.revisions && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Revisions</Text>
                    <Text style={styles.detailInfoValue}>{service.revisions}</Text>
                  </View>
                )}
                {service.response_time && (
                  <View style={styles.detailInfoItem}>
                    <Text style={styles.detailInfoLabel}>Temps de reponse</Text>
                    <Text style={styles.detailInfoValue}>{service.response_time}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Rating Section */}
            {service.rating !== undefined && service.rating > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>EVALUATIONS</Text>
                <View style={styles.detailRatingRow}>
                  <Text style={styles.detailRatingValue}>{service.rating.toFixed(1)}</Text>
                  <Text style={styles.detailRatingLabel}>/ 5</Text>
                  <Text style={styles.detailReviewsCount}>({service.reviews_count || 0} avis)</Text>
                </View>
                {service.completed_projects > 0 && (
                  <Text style={styles.detailProjectsText}>
                    {service.completed_projects} projet{service.completed_projects > 1 ? "s" : ""} termine{service.completed_projects > 1 ? "s" : ""}
                  </Text>
                )}
              </View>
            )}

            {/* Languages */}
            {service.languages && service.languages.length > 0 && (
              <View style={styles.detailSection}>
                <Text style={styles.detailSectionLabel}>LANGUES</Text>
                <View style={styles.detailLanguagesRow}>
                  {service.languages.map((lang, index) => (
                    <View key={index} style={styles.detailLanguageBadge}>
                      <Text style={styles.detailLanguageText}>{lang}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* Message Section */}
            <View style={styles.detailSection}>
              <Text style={styles.detailSectionLabel}>CONTACTER LE FREELANCER</Text>
              <TextInput
                style={styles.messageInput}
                value={message}
                onChangeText={setMessage}
                placeholder="Ecrivez votre message..."
                placeholderTextColor={COLORS.textMuted}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Send Message Button */}
          <TouchableOpacity style={styles.sendMessageBtn} onPress={handleSendMessage}>
            <Text style={styles.sendMessageBtnText}>Envoyer le message</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

export const FreelanceOffersScreen: FC<FreelanceOffersScreenProps> = ({ onBack }) => {
  const $topInsets = useSafeAreaInsetsStyle(["top"])
  const $bottomInsets = useSafeAreaInsetsStyle(["bottom"])

  const [services, setServices] = useState<FreelanceService[]>([])
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [selectedCategory, setSelectedCategory] = useState<ServiceCategory | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedService, setSelectedService] = useState<FreelanceService | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const categoriesData = await getServiceCategories()
      setCategories(categoriesData)

      const servicesData = selectedCategory
        ? await fetchFreelanceServicesByCategory(selectedCategory)
        : await fetchFreelanceServices()

      // Filter out test data
      const filteredServices = servicesData.filter(
        (service) => !(service.service_title?.toLowerCase().includes("sdfgs") &&
                       service.provider?.full_name?.toLowerCase().includes("tayeb"))
      )
      setServices(filteredServices)
    } catch (error) {
      console.error("Error loading freelance data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCategory])

  useEffect(() => {
    loadData()
  }, [loadData])

  const onRefresh = useCallback(async () => {
    setRefreshing(true)
    await loadData()
    setRefreshing(false)
  }, [loadData])

  const handleCategorySelect = (category: ServiceCategory | null) => {
    setSelectedCategory(category)
    setIsLoading(true)
  }

  const handleServicePress = (service: FreelanceService) => {
    setSelectedService(service)
    setShowDetailModal(true)
  }

  const handleCloseDetail = () => {
    setShowDetailModal(false)
    setSelectedService(null)
  }

  const handleSendMessage = (message: string) => {
    // Mock implementation - show success message
    setShowDetailModal(false)
    setSelectedService(null)
    // Show success modal after a brief delay
    setTimeout(() => {
      setShowSuccessModal(true)
    }, 300)
  }

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false)
  }

  if (isLoading) {
    return (
      <View style={[styles.container, $topInsets, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.gold} />
        <Text style={styles.loadingText}>Chargement...</Text>
      </View>
    )
  }

  return (
    <View style={[styles.container, $topInsets]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>← Retour</Text>
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Freelancers</Text>
          <Text style={styles.headerSubtitle}>Services disponibles</Text>
        </View>
      </View>

      {/* Category Filters */}
      {categories.length > 0 && (
        <View style={styles.filtersContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filtersContent}
          >
            <TouchableOpacity
              style={[
                styles.categoryChip,
                selectedCategory === null && styles.categoryChipActive,
              ]}
              onPress={() => handleCategorySelect(null)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === null && styles.categoryChipTextActive,
                ]}
              >
                Tous
              </Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChip,
                  selectedCategory === cat && styles.categoryChipActive,
                ]}
                onPress={() => handleCategorySelect(cat)}
              >
                <Text
                  style={[
                    styles.categoryChipText,
                    selectedCategory === cat && styles.categoryChipTextActive,
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Services List */}
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
        {services.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>Aucun service</Text>
            <Text style={styles.emptyStateText}>
              {selectedCategory
                ? "Aucun service trouve dans cette categorie"
                : "Aucun service freelance disponible pour le moment"}
            </Text>
          </View>
        ) : (
          <>
            <Text style={styles.resultsCount}>
              {services.length} service{services.length > 1 ? "s" : ""} trouve
              {services.length > 1 ? "s" : ""}
            </Text>
            {services.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onPress={() => handleServicePress(service)}
              />
            ))}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Service Detail Modal */}
      <ServiceDetailModal
        visible={showDetailModal}
        service={selectedService}
        onClose={handleCloseDetail}
        onMessage={handleSendMessage}
      />

      {/* Success Modal */}
      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <View style={styles.successIconContainer}>
              <View style={styles.successIconCircle}>
                <Text style={styles.successIconText}>✓</Text>
              </View>
            </View>
            <Text style={styles.successTitle}>Message Envoye</Text>
            <Text style={styles.successSubtitle}>
              Votre message a ete envoye avec succes. Le freelancer vous repondra bientot.
            </Text>
            <View style={styles.successDivider} />
            <TouchableOpacity
              style={styles.successButton}
              onPress={handleCloseSuccessModal}
              activeOpacity={0.8}
            >
              <Text style={styles.successButtonText}>Continuer</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Header
  header: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  backButton: {
    marginBottom: 12,
  } as ViewStyle,
  backButtonText: {
    fontSize: 14,
    color: COLORS.gold,
    fontWeight: "500",
  } as TextStyle,
  headerTitleContainer: {} as ViewStyle,
  headerTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 4,
  } as TextStyle,
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,

  // Filters
  filtersContainer: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceBorder,
  } as ViewStyle,
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  } as ViewStyle,
  categoryChip: {
    paddingHorizontal: 16,
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
    fontWeight: "500",
  } as TextStyle,
  categoryChipTextActive: {
    color: COLORS.gold,
  } as TextStyle,

  // Scroll View
  scrollView: {
    flex: 1,
  } as ViewStyle,
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  } as ViewStyle,

  // Results count
  resultsCount: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  } as TextStyle,

  // Service Card
  serviceCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 16,
    marginBottom: 12,
  } as ViewStyle,
  serviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 12,
  } as ViewStyle,
  serviceTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
    lineHeight: 22,
  } as TextStyle,
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  } as ViewStyle,
  availabilityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  } as ViewStyle,
  availabilityText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  } as TextStyle,
  serviceDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  } as TextStyle,
  categoryRow: {
    flexDirection: "row",
    marginBottom: 12,
  } as ViewStyle,
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.infoMuted,
    borderRadius: 6,
  } as ViewStyle,
  categoryText: {
    fontSize: 11,
    color: COLORS.info,
    fontWeight: "500",
  } as TextStyle,
  serviceMeta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  } as ViewStyle,
  priceContainer: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
  } as ViewStyle,
  priceValue: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  priceType: {
    fontSize: 12,
    color: COLORS.textSecondary,
  } as TextStyle,
  experienceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  experienceText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "500",
  } as TextStyle,
  deliveryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  } as ViewStyle,
  deliveryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
  deliveryValue: {
    fontSize: 12,
    color: COLORS.text,
    fontWeight: "500",
  } as TextStyle,
  ratingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  } as ViewStyle,
  ratingValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.goldLight,
  } as TextStyle,
  ratingLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
  projectsLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  } as TextStyle,
  skillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  } as ViewStyle,
  skillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 4,
  } as ViewStyle,
  skillText: {
    fontSize: 10,
    color: COLORS.textSecondary,
  } as TextStyle,
  moreSkills: {
    fontSize: 10,
    color: COLORS.textMuted,
  } as TextStyle,
  providerName: {
    fontSize: 12,
    color: COLORS.textMuted,
    fontStyle: "italic",
    marginTop: 4,
  } as TextStyle,
  verifiedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: COLORS.successMuted,
    borderRadius: 6,
  } as ViewStyle,
  verifiedText: {
    fontSize: 10,
    color: COLORS.success,
    fontWeight: "600",
  } as TextStyle,

  // Empty State
  emptyState: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    padding: 40,
    alignItems: "center",
    marginTop: 20,
  } as ViewStyle,
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 8,
  } as TextStyle,
  emptyStateText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  } as TextStyle,

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "flex-end",
  } as ViewStyle,
  modalContent: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "90%",
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

  // Detail View Styles
  detailTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 16,
    lineHeight: 32,
  } as TextStyle,
  detailBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  } as ViewStyle,
  detailPriceSection: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 8,
    marginBottom: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: COLORS.goldMuted,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  detailPriceValue: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  detailPriceType: {
    fontSize: 14,
    color: COLORS.textSecondary,
  } as TextStyle,
  detailProviderSection: {
    marginBottom: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  detailProviderName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  detailSection: {
    marginBottom: 20,
  } as ViewStyle,
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textMuted,
    letterSpacing: 1,
    marginBottom: 10,
  } as TextStyle,
  detailDescription: {
    fontSize: 15,
    color: COLORS.textSecondary,
    lineHeight: 24,
  } as TextStyle,
  detailSkillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as ViewStyle,
  detailSkillBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: COLORS.surfaceElevated,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  detailSkillText: {
    fontSize: 13,
    color: COLORS.text,
    fontWeight: "500",
  } as TextStyle,
  detailInfoGrid: {
    gap: 12,
  } as ViewStyle,
  detailInfoItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
  } as ViewStyle,
  detailInfoLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
  } as TextStyle,
  detailInfoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  } as TextStyle,
  detailRatingRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 4,
    marginBottom: 8,
  } as ViewStyle,
  detailRatingValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.gold,
  } as TextStyle,
  detailRatingLabel: {
    fontSize: 18,
    color: COLORS.textMuted,
  } as TextStyle,
  detailReviewsCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginLeft: 8,
  } as TextStyle,
  detailProjectsText: {
    fontSize: 13,
    color: COLORS.textMuted,
  } as TextStyle,
  detailLanguagesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  } as ViewStyle,
  detailLanguageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: COLORS.infoMuted,
    borderRadius: 6,
  } as ViewStyle,
  detailLanguageText: {
    fontSize: 12,
    color: COLORS.info,
    fontWeight: "500",
  } as TextStyle,
  messageInput: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.surfaceBorder,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    minHeight: 100,
  } as TextStyle,
  sendMessageBtn: {
    margin: 20,
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  } as ViewStyle,
  sendMessageBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
  } as TextStyle,

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  } as ViewStyle,
  successModalContent: {
    backgroundColor: COLORS.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    width: "100%",
    maxWidth: 340,
    borderWidth: 1,
    borderColor: COLORS.goldDark,
  } as ViewStyle,
  successIconContainer: {
    marginBottom: 24,
  } as ViewStyle,
  successIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.successMuted,
    borderWidth: 3,
    borderColor: COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  } as ViewStyle,
  successIconText: {
    fontSize: 40,
    color: COLORS.success,
    fontWeight: "700",
  } as TextStyle,
  successTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.text,
    marginBottom: 12,
    textAlign: "center",
  } as TextStyle,
  successSubtitle: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
  } as TextStyle,
  successDivider: {
    width: 60,
    height: 2,
    backgroundColor: COLORS.goldMuted,
    marginBottom: 24,
  } as ViewStyle,
  successButton: {
    backgroundColor: COLORS.gold,
    paddingVertical: 16,
    paddingHorizontal: 48,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  } as ViewStyle,
  successButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.background,
    letterSpacing: 0.5,
  } as TextStyle,
})
