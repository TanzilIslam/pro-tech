// src/stores/enquiryStore.js
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useAppStore } from './app'
import { ENQUIRY_TABLE } from '@/lib/dbTable'

export const useEnquiryStore = defineStore('enquiry', () => {
  const appStore = useAppStore()

  const items = ref([])
  const totalItems = ref(0)
  const unreadEnquiries = ref([])
  const loading = ref(false)
  let realtimeChannel = null

  const options = ref({
    page: 1,
    itemsPerPage: 10,
    sortBy: [{ key: 'created_at', order: 'desc' }],
    search: '',
  })

  const itemsPerPageOptions = [
    { value: 10, title: '10' },
    { value: 25, title: '25' },
    { value: 50, title: '50' },
  ]

  const unreadCount = computed(() => unreadEnquiries.value.length)

  async function fetchItems(newOptions) {
    loading.value = true
    if (newOptions) {
      options.value = { ...options.value, ...newOptions }
    }

    try {
      const from = (options.value.page - 1) * options.value.itemsPerPage
      const to = from + options.value.itemsPerPage - 1

      let query = supabase.from(ENQUIRY_TABLE).select('*', { count: 'exact' })

      if (options.value.search) {
        const searchStr = `%${options.value.search}%`
        query = query.or(`customer_name.ilike.${searchStr},product_name.ilike.${searchStr}`)
      }

      if (options.value.sortBy && options.value.sortBy.length > 0) {
        const sort = options.value.sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }

      const { data, error, count } = await query.range(from, to)

      if (error) throw error

      items.value = data
      totalItems.value = error ? 0 : data.length > 0 ? count : 0
    } catch (e) {
      appStore.handleError(e)
      items.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }
  function subscribeToEnquiries() {
    if (realtimeChannel) return

    realtimeChannel = supabase
      .channel('public:pro_tech_enquiries')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: ENQUIRY_TABLE },
        (payload) => {
          console.log('New enquiry received!', payload)

          items.value.unshift(payload.new)

          appStore.showSnackbar({
            text: `New enquiry from ${payload.new.customer_name} for ${payload.new.product_name}`,
            color: 'success',
            timeout: 10000,
            closable: true,
          })

          const audio = new Audio('/notification.mp3')
          audio.play()
        },
      )
      .subscribe()

    console.log('Subscribed to new enquiries channel.')
  }
  function unsubscribeFromEnquiries() {
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
      console.log('Unsubscribed from enquiries channel.')
    }
  }
  async function fetchUnreadEnquiries() {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from(ENQUIRY_TABLE)
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })

      if (error) throw error
      unreadEnquiries.value = data
    } catch (e) {
      appStore.handleError(e, 'fetchUnreadEnquiries')
    } finally {
      loading.value = false
    }
  }
  async function markAsRead(enquiry) {
    try {
      // Optimistic update: remove from the UI immediately
      unreadEnquiries.value = unreadEnquiries.value.filter((e) => e.id !== enquiry.id)

      // API call to update the database
      const { error } = await supabase
        .from(ENQUIRY_TABLE)
        .update({ is_read: true })
        .eq('id', enquiry.id)

      if (error) {
        // If the API call fails, revert the optimistic update
        unreadEnquiries.value.push(enquiry)
        throw error
      }
    } catch (e) {
      appStore.handleError(e, 'markAsRead')
    }
  }
  async function markAsUnread(enquiry) {
    try {
      // Optimistic update: remove from the UI immediately
      unreadEnquiries.value = unreadEnquiries.value.filter((e) => e.id !== enquiry.id)

      // API call to update the database
      const { error } = await supabase
        .from(ENQUIRY_TABLE)
        .update({ is_read: false })
        .eq('id', enquiry.id)

      if (error) {
        // If the API call fails, revert the optimistic update
        unreadEnquiries.value.push(enquiry)
        throw error
      }
    } catch (e) {
      appStore.handleError(e, 'markAsUnread')
    }
  }

  return {
    items,
    totalItems,
    loading,
    unreadEnquiries,
    unreadCount,
    itemsPerPageOptions,
    fetchItems,
    subscribeToEnquiries,
    unsubscribeFromEnquiries,
    fetchUnreadEnquiries,
    markAsRead,
    markAsUnread,
  }
})
