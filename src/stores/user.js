import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'vue-router'

export const useUserStore = defineStore('user', () => {
  const router = useRouter()
  const user = ref(null)
  const token = ref(null)
  const loading = ref(false)

  const isLoggedIn = computed(() => !!user.value)

  async function fetchSession() {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.error('Failed to get session:', error.message)
    } else {
      user.value = data.session?.user || null
      token.value = data.session?.access_token || null
    }
  }

  async function loginWithEmail(email, password) {
    loading.value = true
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    loading.value = false

    if (error) throw error
    user.value = data.user
    token.value = data.session?.access_token || null
  }

  async function logout() {
    await supabase.auth.signOut()
    user.value = null
    token.value = null
    router.push({ name: 'login' })
  }

  async function checkAuth() {
    await fetchSession()
    return !!user.value
  }

  // Optional: Watch auth state changes
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN') {
      user.value = session?.user || null
      token.value = session?.access_token || null
    } else if (event === 'SIGNED_OUT') {
      user.value = null
      token.value = null
    }
  })

  return {
    user,
    token,
    loading,
    isLoggedIn,
    loginWithEmail,
    logout,
    checkAuth,
    fetchSession,
  }
})
