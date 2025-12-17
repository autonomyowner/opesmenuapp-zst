import { supabase } from './client'
import { UserProfile, UserRole, SellerCategory } from './types'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'

export interface SignUpData {
  email: string
  password: string
  fullName?: string
  phone?: string
  role?: UserRole
  sellerCategory?: SellerCategory
}

export interface SignInData {
  email: string
  password: string
}

export interface AuthResponse {
  success: boolean
  error?: string
  user?: UserProfile
}

// Helper to extract OAuth params from URL
const extractParamsFromUrl = (url: string) => {
  try {
    const parsedUrl = new URL(url)
    const hash = parsedUrl.hash.substring(1) // Remove the leading '#'
    const params = new URLSearchParams(hash)

    return {
      access_token: params.get('access_token'),
      refresh_token: params.get('refresh_token'),
      expires_in: parseInt(params.get('expires_in') || '0'),
      token_type: params.get('token_type'),
      provider_token: params.get('provider_token'),
    }
  } catch {
    return null
  }
}

// Sign in with Google OAuth
export const signInWithGoogle = async (): Promise<AuthResponse> => {
  try {
    // Complete any pending auth session
    WebBrowser.maybeCompleteAuthSession()

    // Create redirect URL for the app
    const expRedirectUrl = AuthSession.makeRedirectUri({
      scheme: 'zst',
      path: 'google-auth',
    })

    console.log('OAuth redirect URL:', expRedirectUrl)

    // Start OAuth flow with Supabase
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: expRedirectUrl,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })

    if (error) {
      console.error('OAuth init error:', error)
      return { success: false, error: error.message }
    }

    if (!data.url) {
      return { success: false, error: 'No OAuth URL returned' }
    }

    // Open the browser for authentication
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      expRedirectUrl,
      {
        showInRecents: true,
        // For Android, this helps with the redirect
        createTask: false,
      }
    )

    console.log('OAuth browser result:', result)

    if (result.type === 'success' && result.url) {
      // Extract tokens from the callback URL
      const params = extractParamsFromUrl(result.url)

      if (params?.access_token && params?.refresh_token) {
        // Set the session with the tokens
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: params.access_token,
          refresh_token: params.refresh_token,
        })

        if (sessionError) {
          console.error('Session set error:', sessionError)
          return { success: false, error: sessionError.message }
        }

        if (sessionData.user) {
          // Check if profile exists, create if not
          const { data: existingProfile } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', sessionData.user.id)
            .single()

          if (!existingProfile) {
            // Create new profile for Google user
            const newProfile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
              id: sessionData.user.id,
              email: sessionData.user.email || '',
              full_name: sessionData.user.user_metadata?.full_name || sessionData.user.user_metadata?.name,
              avatar_url: sessionData.user.user_metadata?.avatar_url || sessionData.user.user_metadata?.picture,
              provider_name: 'google',
              provider_avatar: sessionData.user.user_metadata?.avatar_url || sessionData.user.user_metadata?.picture,
              role: 'customer' as UserRole,
            }

            await supabase.from('user_profiles').insert(newProfile)

            return {
              success: true,
              user: {
                ...newProfile,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            }
          }

          return { success: true, user: existingProfile }
        }
      }

      return { success: false, error: 'Failed to extract authentication tokens' }
    }

    if (result.type === 'cancel' || result.type === 'dismiss') {
      return { success: false, error: 'Authentication cancelled' }
    }

    return { success: false, error: 'Authentication failed' }
  } catch (error) {
    console.error('Google sign in exception:', error)
    return { success: false, error: 'An unexpected error occurred during Google sign in' }
  }
}

// Sign up a new user
export const signUp = async (data: SignUpData): Promise<AuthResponse> => {
  try {
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          full_name: data.fullName,
          phone: data.phone,
          role: data.role || 'customer',
          seller_category: data.sellerCategory,
        },
      },
    })

    if (signUpError) {
      console.error('Sign up error:', signUpError)
      return { success: false, error: signUpError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to create user' }
    }

    // Create profile in profiles table
    const profile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
      id: authData.user.id,
      email: data.email,
      full_name: data.fullName,
      phone: data.phone,
      role: (data.role || 'customer') as UserRole,
      seller_category: data.sellerCategory,
    }

    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert(profile)

    if (profileError) {
      console.error('Profile creation error:', profileError)
      // User was created but profile failed - still consider it a success
      // Profile can be created later on first sign in
    }

    return {
      success: true,
      user: {
        ...profile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    }
  } catch (error) {
    console.error('Sign up exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign in an existing user
export const signIn = async (data: SignInData): Promise<AuthResponse> => {
  try {
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (signInError) {
      console.error('Sign in error:', signInError)
      return { success: false, error: signInError.message }
    }

    if (!authData.user) {
      return { success: false, error: 'Failed to sign in' }
    }

    // Fetch user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (profileError) {
      console.error('Profile fetch error:', profileError)
      // Create profile if it doesn't exist
      const newProfile: Omit<UserProfile, 'created_at' | 'updated_at'> = {
        id: authData.user.id,
        email: authData.user.email || data.email,
        full_name: authData.user.user_metadata?.full_name,
        phone: authData.user.user_metadata?.phone,
        role: 'customer' as UserRole,
      }

      await supabase.from('user_profiles').insert(newProfile)

      return {
        success: true,
        user: {
          ...newProfile,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
      }
    }

    return { success: true, user: profile }
  } catch (error) {
    console.error('Sign in exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Sign out the current user
export const signOut = async (): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.signOut()

    if (error) {
      console.error('Sign out error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Sign out exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Helper to add timeout to promises
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> => {
  const timeout = new Promise<T>((resolve) => {
    setTimeout(() => {
      console.warn(`[Auth] Request timed out after ${ms}ms`)
      resolve(fallback)
    }, ms)
  })
  return Promise.race([promise, timeout])
}

// Get current user profile with timeout protection
export const getCurrentProfile = async (): Promise<UserProfile | null> => {
  return withTimeout(getCurrentProfileInternal(), 8000, null)
}

const getCurrentProfileInternal = async (): Promise<UserProfile | null> => {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return null
    }

    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    if (profileError) {
      console.error('Get profile error:', profileError)
      return null
    }

    return profile
  } catch (error) {
    console.error('Get profile exception:', error)
    return null
  }
}

// Update user profile
export const updateProfile = async (
  userId: string,
  updates: Partial<Pick<UserProfile, 'full_name' | 'phone' | 'avatar_url'>>
): Promise<AuthResponse> => {
  try {
    const { data: profile, error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Update profile error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, user: profile }
  } catch (error) {
    console.error('Update profile exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Reset password
export const resetPassword = async (email: string): Promise<AuthResponse> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email)

    if (error) {
      console.error('Reset password error:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Reset password exception:', error)
    return { success: false, error: 'An unexpected error occurred' }
  }
}

// Listen to auth state changes
export const onAuthStateChange = (callback: (user: UserProfile | null) => void) => {
  return supabase.auth.onAuthStateChange(async (event, session) => {
    if (session?.user) {
      const profile = await getCurrentProfile()
      callback(profile)
    } else {
      callback(null)
    }
  })
}
