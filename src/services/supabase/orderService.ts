import { supabase } from './client'

// Algeria Wilayas list
export const WILAYAS = [
  "Adrar", "Chlef", "Laghouat", "Oum El Bouaghi", "Batna", "Béjaïa", "Biskra",
  "Béchar", "Blida", "Bouira", "Tamanrasset", "Tébessa", "Tlemcen", "Tiaret",
  "Tizi Ouzou", "Alger", "Djelfa", "Jijel", "Sétif", "Saïda", "Skikda",
  "Sidi Bel Abbès", "Annaba", "Guelma", "Constantine", "Médéa", "Mostaganem",
  "M'Sila", "Mascara", "Ouargla", "Oran", "El Bayadh", "Illizi", "Bordj Bou Arréridj",
  "Boumerdès", "El Tarf", "Tindouf", "Tissemsilt", "El Oued", "Khenchela",
  "Souk Ahras", "Tipaza", "Mila", "Aïn Defla", "Naâma", "Aïn Témouchent",
  "Ghardaïa", "Relizane", "Timimoun", "Bordj Badji Mokhtar", "Ouled Djellal",
  "Béni Abbès", "In Salah", "In Guezzam", "Touggourt", "Djanet", "El M'Ghair", "El Meniaa"
]

// Delivery types
export type DeliveryType = 'home' | 'office'

// Order input type - matches website database schema
export interface CreateOrderInput {
  product_id: string
  product_name: string
  product_image?: string
  quantity: number
  unit_price: number
  total_amount: number
  customer_name: string
  customer_phone: string
  customer_email?: string
  wilaya: string
  commune: string
  delivery_type: DeliveryType
  delivery_address?: string
  seller_id?: string  // Product seller for order tracking
}

// Generate unique order number like website
const generateOrderNumber = (): string => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substring(2, 6).toUpperCase()
  return `ZST-${timestamp}-${random}`
}

// Create a new order - synced with website database schema
export const createOrder = async (
  orderData: CreateOrderInput
): Promise<{ success: boolean; orderId?: string; orderNumber?: string; error?: string }> => {
  try {
    // Build full address string
    const fullAddress = `${orderData.commune}, ${orderData.wilaya}${orderData.delivery_address ? ` - ${orderData.delivery_address}` : ''} (${orderData.delivery_type === 'home' ? 'Domicile' : 'Bureau'})`

    // Generate order number like website
    const orderNumber = generateOrderNumber()

    // Calculate subtotal for order item
    const subtotal = orderData.quantity * orderData.unit_price

    // Create the order with all required fields matching website database
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: orderNumber,
        customer_name: orderData.customer_name,
        customer_phone: orderData.customer_phone,
        customer_email: orderData.customer_email || null,
        customer_address: fullAddress,
        customer_wilaya: orderData.wilaya,
        total: orderData.total_amount,
        status: 'pending',
        payment_status: 'pending',
        seller_id: orderData.seller_id || null,
        notes: `Livraison: ${orderData.delivery_type === 'home' ? 'A domicile' : 'Au bureau'}`,
      })
      .select()
      .single()

    if (orderError || !order) {
      console.error('Error creating order:', orderError)
      return { success: false, error: orderError?.message || 'Failed to create order' }
    }

    // Create order item with all required fields matching website database
    const { error: itemError } = await supabase
      .from('order_items')
      .insert({
        order_id: order.id,
        product_id: orderData.product_id,
        product_name: orderData.product_name,
        product_image: orderData.product_image || '',
        quantity: orderData.quantity,
        price: orderData.unit_price,
        subtotal: subtotal,
      })

    if (itemError) {
      console.error('Error creating order item:', itemError)
      // Try to delete the order if item creation fails
      await supabase.from('orders').delete().eq('id', order.id)
      return { success: false, error: itemError.message }
    }

    return { success: true, orderId: order.id, orderNumber: orderNumber }
  } catch (error) {
    console.error('Error in createOrder:', error)
    return { success: false, error: 'Failed to create order' }
  }
}

// Customer order type for order history
export interface CustomerOrder {
  id: string
  order_number: string
  total: number
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded'
  customer_name: string
  customer_phone: string
  customer_address: string
  customer_wilaya: string
  tracking_number?: string
  delivery_date?: string
  created_at: string
  items: CustomerOrderItem[]
}

export interface CustomerOrderItem {
  id: string
  product_name: string
  product_image: string
  quantity: number
  price: number
  subtotal: number
}

// Fetch orders for a customer by phone number (for guest orders)
export const fetchCustomerOrdersByPhone = async (phone: string): Promise<CustomerOrder[]> => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('customer_phone', phone)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customer orders:', error)
      return []
    }

    // Fetch items for each order
    const ordersWithItems: CustomerOrder[] = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        return {
          ...order,
          items: (items || []).map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_image: item.product_image,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }))
        }
      })
    )

    return ordersWithItems
  } catch (error) {
    console.error('Error in fetchCustomerOrdersByPhone:', error)
    return []
  }
}

// Fetch orders for authenticated user by user_id
export const fetchCustomerOrdersByUserId = async (userId: string): Promise<CustomerOrder[]> => {
  try {
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching customer orders:', error)
      return []
    }

    // Fetch items for each order
    const ordersWithItems: CustomerOrder[] = await Promise.all(
      (orders || []).map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*')
          .eq('order_id', order.id)

        return {
          ...order,
          items: (items || []).map(item => ({
            id: item.id,
            product_name: item.product_name,
            product_image: item.product_image,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
          }))
        }
      })
    )

    return ordersWithItems
  } catch (error) {
    console.error('Error in fetchCustomerOrdersByUserId:', error)
    return []
  }
}

// Subscribe to customer order updates
export const subscribeToCustomerOrders = (phone: string, onUpdate: (payload: any) => void) => {
  const subscription = supabase
    .channel(`customer-orders-${phone}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `customer_phone=eq.${phone}`,
      },
      onUpdate
    )
    .subscribe()

  return subscription
}

// Get product by ID
export const getProductById = async (productId: string) => {
  try {
    const { data: product, error } = await supabase
      .from('products')
      .select(`
        *,
        product_images(image_url, is_primary)
      `)
      .eq('id', productId)
      .single()

    if (error) {
      console.error('Error fetching product:', error)
      return null
    }

    // Process image URL
    const SUPABASE_STORAGE_URL = 'https://enbrhhuubjvapadqyvds.supabase.co/storage/v1/object/public/products'
    const images = product.product_images as any[]
    const primaryImage = Array.isArray(images)
      ? images.find((img: any) => img.is_primary)?.image_url || images[0]?.image_url
      : undefined

    let imageUrl = primaryImage
    if (primaryImage && !primaryImage.startsWith('http')) {
      imageUrl = `${SUPABASE_STORAGE_URL}${primaryImage}`
    }

    return {
      ...product,
      image_url: imageUrl,
      product_images: undefined,
    }
  } catch (error) {
    console.error('Error in getProductById:', error)
    return null
  }
}
