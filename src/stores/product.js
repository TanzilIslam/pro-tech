import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useFileManagerStore } from './fileManager'
import { useAppStore } from './app'
import { useRouter } from 'vue-router'
import { PRODUCT_TABLE, PRODUCT_STORAGE_BUCKET, CATEGORY_TABLE, BRAND_TABLE } from '@/lib/dbTable'

export const useProductStore = defineStore('product', () => {
  const router = useRouter()
  const appStore = useAppStore()
  const fileManager = useFileManagerStore()

  let debounceTimer = null

  const items = ref([])
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
  const payloadBuilder = (itemData, imageUrl) => {
    return {
      name: itemData.name,
      part_number: itemData.part_number,
      description: itemData.description,
      specifications: itemData.specifications,
      category_id: itemData.category_id,
      brand_id: itemData.brand_id,
      availability: itemData.availability,
      image: imageUrl,
    }
  }
  async function fetchItems(newOptions) {
    loading.value = true
    if (newOptions) {
      options.value = { ...options.value, ...newOptions }
    }

    try {
      const from = (options.value.page - 1) * options.value.itemsPerPage
      const to = from + options.value.itemsPerPage - 1

      let query = supabase.from(PRODUCT_TABLE).select('*', { count: 'exact' })

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
  async function performAction(action, successMessage, redirectRoute) {
    loading.value = true
    try {
      await action()
      await fetchItems()
      appStore.showSnackbar({ text: successMessage, color: 'success' })
      if (redirectRoute) {
        router.push({ name: redirectRoute })
      }
    } catch (e) {
      handleError(e)
      return null
    } finally {
      loading.value = false
    }
  }
  async function createItem(itemData) {
    return performAction(
      async () => {
        if (!itemData.mainImageFile) throw new Error('Product image is required.')
        let imageUrl = null
        imageUrl = await fileManager.uploadFile(itemData.mainImageFile, PRODUCT_STORAGE_BUCKET)
        if (!imageUrl) throw new Error(fileManager.error || 'Image upload failed.')

        return supabase
          .from(PRODUCT_TABLE)
          .insert([payloadBuilder(itemData, imageUrl)])
          .select()
          .single()
      },
      'Item created successfully!',
      'product',
    )
  }
  async function updateItem(itemData) {
    return performAction(
      async () => {
        let imageUrl = null
        if (!itemData.image) {
          if (!itemData.mainImageFile) throw new Error('Product image is required.')

          imageUrl = await fileManager.uploadFile(itemData.mainImageFile, PRODUCT_STORAGE_BUCKET)
          if (!imageUrl) throw new Error(fileManager.error || 'Image upload failed.')
        } else {
          imageUrl = itemData.image
        }

        return supabase
          .from(PRODUCT_TABLE)
          .update(payloadBuilder(itemData, imageUrl))
          .eq('id', itemData.id)
          .select()
          .single()
      },
      'Item updated successfully!',
      'product',
    )
  }
  async function deleteItem(itemData) {
    return performAction(async () => {
      const itemToDelete = items.value.find((c) => c.id == itemData.id)
      if (!itemToDelete) throw new Error('Item not found for deletion.')
      if (itemToDelete.image)
        await fileManager.deleteFile(itemToDelete.image, PRODUCT_STORAGE_BUCKET)
      return supabase.from(BRAND_TABLE).delete().eq('id', itemData.id)
    }, 'Item deleted.')
  }
  async function removeItemImage(itemId, imageUrl) {
    return performAction(async () => {
      if (!imageUrl) throw new Error('No image URL provided to delete.')
      await fileManager.deleteFile(imageUrl, PRODUCT_STORAGE_BUCKET)
      return supabase.from(PRODUCT_TABLE).update({ image: null }).eq('id', itemId).select().single()
    }, 'Image removed successfully.')
  }
  async function fetchAllItems() {
    loading.value = true
    try {
      const { data, error } = await supabase.from(BRAND_TABLE).select()
      if (error) throw error
      items.value = data
    } catch (e) {
      handleError(e)
      items.value = []
    } finally {
      loading.value = false
    }
  }
  async function fetchItemById(id) {
    loading.value = true
    try {
      const { data, error } = await supabase
        .from(PRODUCT_TABLE)
        .select(`* , ${CATEGORY_TABLE} (id, name), ${BRAND_TABLE} (id, name)`)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    } catch (e) {
      handleError(e)
      return null
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
    fetchItemById,
  }
})
