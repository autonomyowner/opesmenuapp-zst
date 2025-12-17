import { supabase } from "./client"

// Types matching the actual database schema
export type ExperienceLevel = "Débutant" | "Intermédiaire" | "Expert"
export type PriceType = "fixed" | "hourly" | "starting-at"
export type AvailabilityStatus = "available" | "busy" | "unavailable"
export type ServiceCategory =
  | "Développement Web"
  | "Design Graphique"
  | "Montage Vidéo"
  | "Marketing Digital"
  | "Rédaction"
  | "Photographie"
  | "Traduction"
  | "Consultation"

// All available categories as an array for filtering UI
export const SERVICE_CATEGORIES: ServiceCategory[] = [
  "Développement Web",
  "Design Graphique",
  "Montage Vidéo",
  "Marketing Digital",
  "Rédaction",
  "Photographie",
  "Traduction",
  "Consultation",
]

export interface FreelanceService {
  id: string
  slug: string
  provider_id: string
  service_title: string
  category: ServiceCategory
  experience_level: ExperienceLevel
  rating: number
  reviews_count: number
  completed_projects: number
  response_time: string
  price: number
  price_type: PriceType
  description: string
  short_description: string
  skills: string[]
  delivery_time: string
  revisions: string
  languages: string[]
  availability: AvailabilityStatus
  featured: boolean
  verified: boolean
  top_rated: boolean
  video_url?: string
  created_at: string
  updated_at: string
  // Joined data
  provider?: {
    id: string
    full_name: string
    provider_avatar?: string
  }
}

// Fetch all freelance services
export const fetchFreelanceServices = async (): Promise<FreelanceService[]> => {
  try {
    const { data: services, error } = await supabase
      .from("freelance_services")
      .select(
        `
        *,
        provider:user_profiles!freelance_services_provider_id_fkey(id, full_name, provider_avatar)
      `
      )
      .eq("availability", "available")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching freelance services:", error)
      if (error.code === "42P01") {
        return []
      }
      throw error
    }

    return services || []
  } catch (error) {
    console.error("Error in fetchFreelanceServices:", error)
    return []
  }
}

// Fetch freelance services by category
export const fetchFreelanceServicesByCategory = async (
  category: ServiceCategory
): Promise<FreelanceService[]> => {
  try {
    const { data: services, error } = await supabase
      .from("freelance_services")
      .select(
        `
        *,
        provider:user_profiles!freelance_services_provider_id_fkey(id, full_name, provider_avatar)
      `
      )
      .eq("category", category)
      .eq("availability", "available")
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching services by category:", error)
      if (error.code === "42P01") {
        return []
      }
      throw error
    }

    return services || []
  } catch (error) {
    console.error("Error in fetchFreelanceServicesByCategory:", error)
    return []
  }
}

// Fetch single freelance service by ID
export const fetchFreelanceServiceById = async (
  serviceId: string
): Promise<FreelanceService | null> => {
  try {
    const { data: service, error } = await supabase
      .from("freelance_services")
      .select(
        `
        *,
        provider:user_profiles!freelance_services_provider_id_fkey(id, full_name, provider_avatar)
      `
      )
      .eq("id", serviceId)
      .single()

    if (error) {
      console.error("Error fetching service by id:", error)
      if (error.code === "42P01") {
        return null
      }
      throw error
    }

    return service
  } catch (error) {
    console.error("Error in fetchFreelanceServiceById:", error)
    return null
  }
}

// Get all service categories (returns the static enum array)
export const getServiceCategories = async (): Promise<ServiceCategory[]> => {
  return SERVICE_CATEGORIES
}

// Subscribe to freelance services updates
export const subscribeToFreelanceServices = (onUpdate: (payload: unknown) => void) => {
  const subscription = supabase
    .channel("freelance-services-channel")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "freelance_services",
      },
      onUpdate
    )
    .subscribe()

  return subscription
}

// Delete a freelance service by ID
export const deleteFreelanceService = async (
  serviceId: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    const { error } = await supabase
      .from("freelance_services")
      .delete()
      .eq("id", serviceId)

    if (error) {
      console.error("Error deleting freelance service:", error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error("Error in deleteFreelanceService:", error)
    return { success: false, error: "Failed to delete service" }
  }
}

// Delete a freelance service by title (for cleanup)
export const deleteFreelanceServiceByTitle = async (
  titlePattern: string
): Promise<{ success: boolean; error?: string; deletedCount?: number }> => {
  try {
    // First find matching services
    const { data: services, error: fetchError } = await supabase
      .from("freelance_services")
      .select("id, service_title")
      .ilike("service_title", `%${titlePattern}%`)

    if (fetchError) {
      console.error("Error finding services:", fetchError)
      return { success: false, error: fetchError.message }
    }

    if (!services || services.length === 0) {
      return { success: false, error: "No matching services found" }
    }

    // Delete all matching services
    const { error: deleteError } = await supabase
      .from("freelance_services")
      .delete()
      .ilike("service_title", `%${titlePattern}%`)

    if (deleteError) {
      console.error("Error deleting services:", deleteError)
      return { success: false, error: deleteError.message }
    }

    return { success: true, deletedCount: services.length }
  } catch (error) {
    console.error("Error in deleteFreelanceServiceByTitle:", error)
    return { success: false, error: "Failed to delete services" }
  }
}
