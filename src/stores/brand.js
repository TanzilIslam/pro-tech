import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useFileManagerStore } from './fileManager'
import { useAppStore } from './app'
import { BRAND_TABLE, BRAND_STORAGE_BUCKET } from '@/lib/dbTable'

export const useBrandStore = defineStore('brand', () => {
  const appStore = useAppStore()
  const fileManager = useFileManagerStore()

  let debounceTimer = null

  const items = ref([])
  const allItems = ref([])
  const totalItems = ref(0)
  const loading = ref(false)

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

  function handleError(e) {
    const message =
      e.code === '23503'
        ? 'Cannot delete: This item is still assigned to one or more products.'
        : e.message
    appStore.showSnackbar({ text: message, color: 'error' })
  }
  async function fetchItems(newOptions) {
    loading.value = true
    if (newOptions) {
      options.value = { ...options.value, ...newOptions }
    }

    try {
      const from = (options.value.page - 1) * options.value.itemsPerPage
      const to = from + options.value.itemsPerPage - 1

      let query = supabase.from(BRAND_TABLE).select('*', { count: 'exact' })

      if (options.value.search) {
        const searchStr = `%${options.value.search}%`
        query = query.or(`name.ilike.${searchStr},description.ilike.${searchStr}`)
      }

      if (options.value.sortBy && options.value.sortBy.length > 0) {
        const sort = options.value.sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }

      const { data, error } = await query.range(from, to)

      if (error) throw error

      items.value = data
      totalItems.value = error ? 0 : data.length > 0 ? (await query).count : 0
    } catch (e) {
      handleError(e)
      items.value = []
      totalItems.value = 0
    } finally {
      loading.value = false
    }
  }
  async function performAction(action, successMessage) {
    loading.value = true
    try {
      const result = await action()
      await fetchItems()
      appStore.showSnackbar({ text: successMessage, color: 'success' })
      return result
    } catch (e) {
      handleError(e)
      return null
    } finally {
      loading.value = false
    }
  }
  async function createItem(itemData) {
    return performAction(async () => {
      let imageUrl = null
      if (itemData.imageFile) {
        imageUrl = await fileManager.uploadFile(itemData.imageFile, BRAND_STORAGE_BUCKET)
        if (!imageUrl) throw new Error(fileManager.error || 'Image upload failed.')
      }
      return supabase
        .from(BRAND_TABLE)
        .insert([{ name: itemData.name, image: imageUrl }])
        .select()
        .single()
    }, 'Item created successfully!')
  }
  async function updateItem(itemData) {
    return performAction(async () => {
      let imageUrl = itemData.currentImage
      if (itemData.imageFile) {
        if (itemData.currentImage)
          await fileManager.deleteFile(itemData.currentImage, BRAND_STORAGE_BUCKET)
        imageUrl = await fileManager.uploadFile(itemData.imageFile, BRAND_STORAGE_BUCKET)
      }
      return supabase
        .from(BRAND_TABLE)
        .update({ name: itemData.name, image: imageUrl })
        .eq('id', itemData.id)
        .select()
        .single()
    }, 'Item updated successfully!')
  }
  async function deleteItem(itemData) {
    return performAction(async () => {
      const itemToDelete = items.value.find((c) => c.id == itemData.id)
      if (!itemToDelete) throw new Error('Item not found for deletion.')
      if (itemToDelete.image) await fileManager.deleteFile(itemToDelete.image, BRAND_STORAGE_BUCKET)
      return supabase.from(BRAND_TABLE).delete().eq('id', itemData.id)
    }, 'Item deleted.')
  }
  async function removeItemImage(itemId, imageUrl) {
    return performAction(async () => {
      if (!imageUrl) throw new Error('No image URL provided to delete.')
      await fileManager.deleteFile(imageUrl, BRAND_STORAGE_BUCKET)
      return supabase.from(BRAND_TABLE).update({ image: null }).eq('id', itemId).select().single()
    }, 'Image removed successfully.')
  }
  async function fetchAllItems() {
    loading.value = true
    try {
      const { data, error } = await supabase.from(BRAND_TABLE).select()
      if (error) throw error
      allItems.value = data
    } catch (e) {
      handleError(e)
      allItems.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    () => options.value.search,
    () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchItems({ page: 1 })
      }, 500)
    },
  )

  return {
    items,
    allItems,
    loading,
    totalItems,
    options,
    itemsPerPageOptions,
    fetchItems,
    createItem,
    updateItem,
    deleteItem,
    removeItemImage,
    fetchAllItems,
  }
})
