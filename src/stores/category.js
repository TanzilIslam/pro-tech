import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/lib/supabaseClient'
import { useFileManagerStore } from './fileManager'
import { useAppStore } from './app'
import { useBrandStore } from './brand'
import {
  CATEGORY_TABLE,
  CATEGORY_BRAND_JUNCTION_TABLE,
  CATEGORY_STORAGE_BUCKET,
  BRAND_TABLE,
} from '@/lib/dbTable'

export const useCategoryStore = defineStore('category', () => {
  const fetchQuery = `id,
        created_at,
        name,
        description,
        image,
        ${CATEGORY_BRAND_JUNCTION_TABLE} (
          ${BRAND_TABLE} (
            id,
            name,
            image
          )
        )
      `
  const AllFetchQueryForAutoComplete = `id,
        name,
        ${CATEGORY_BRAND_JUNCTION_TABLE} (
          ${BRAND_TABLE} (
            id,
            name
          )
        )
      `
  const appStore = useAppStore()
  const fileManager = useFileManagerStore()
  const brandStore = useBrandStore()

  let debounceTimer = null

  const categories = ref([])
  const allCategories = ref([])
  const totalCategories = ref(0)
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
        ? 'Cannot delete: This category is still assigned to one or more products.'
        : e.message
    appStore.showSnackbar({ text: message, color: 'error' })
  }
  function buildFetchQuery(all = false) {
    if (!all) {
      return fetchQuery
    } else {
      return AllFetchQueryForAutoComplete
    }
  }

  async function syncCategoryBrands(categoryId, brandIds) {
    const { error: deleteError } = await supabase
      .from(CATEGORY_BRAND_JUNCTION_TABLE)
      .delete()
      .eq('category_id', categoryId)

    if (deleteError) throw deleteError

    if (brandIds && brandIds.length > 0) {
      const newLinks = brandIds.map((brandId) => ({
        category_id: categoryId,
        brand_id: brandId,
      }))

      const { error: insertError } = await supabase
        .from(CATEGORY_BRAND_JUNCTION_TABLE)
        .insert(newLinks)

      if (insertError) throw insertError
    }
  }
  async function fetchCategories(newOptions) {
    loading.value = true
    if (newOptions) {
      options.value = { ...options.value, ...newOptions }
    }

    try {
      const from = (options.value.page - 1) * options.value.itemsPerPage
      const to = from + options.value.itemsPerPage - 1

      let query = supabase.from(CATEGORY_TABLE).select(buildFetchQuery(false), { count: 'exact' })

      if (options.value.search) {
        const searchStr = `%${options.value.search}%`
        query = query.or(`name.ilike.${searchStr},description.ilike.${searchStr}`)
      }

      if (options.value.sortBy && options.value.sortBy.length > 0) {
        const sort = options.value.sortBy[0]
        query = query.order(sort.key, { ascending: sort.order === 'asc' })
      }

      const { data, error, count } = await query.range(from, to)

      if (error) throw error
      categories.value = data?.map((category) => {
        const brand_ids = category[CATEGORY_BRAND_JUNCTION_TABLE]?.map(
          (brand) => brand[BRAND_TABLE].id,
        )
        const associated_brands = category[CATEGORY_BRAND_JUNCTION_TABLE]?.map(
          (brand) => brand[BRAND_TABLE],
        )

        return {
          ...category,
          brand_ids,
          associated_brands,
        }
      })
      totalCategories.value = count
      brandStore.fetchAllItems()
    } catch (e) {
      handleError(e)
      categories.value = []
      totalCategories.value = 0
    } finally {
      loading.value = false
    }
  }
  async function performAction(action, successMessage) {
    loading.value = true
    try {
      const result = await action()
      await fetchCategories()
      appStore.showSnackbar({ text: successMessage, color: 'success' })
      return result
    } catch (e) {
      handleError(e)
      return null
    } finally {
      loading.value = false
    }
  }
  async function createCategory(categoryData) {
    return performAction(async () => {
      let imageUrl = null
      if (categoryData.imageFile) {
        imageUrl = await fileManager.uploadFile(categoryData.imageFile, CATEGORY_STORAGE_BUCKET)
        if (!imageUrl) throw new Error(fileManager.error || 'Image upload failed.')
      }

      // First, create the category as before to get its ID
      const { data: newCategory, error } = await supabase
        .from(CATEGORY_TABLE)
        .insert([
          { name: categoryData.name, description: categoryData.description, image: imageUrl },
        ])
        .select()
        .single()

      if (error) throw error
      await syncCategoryBrands(newCategory.id, categoryData.brand_ids)
      return newCategory
    }, 'Category created successfully!')
  }
  async function updateCategory(categoryData) {
    return performAction(async () => {
      let imageUrl = categoryData.currentImage
      if (categoryData.imageFile) {
        if (categoryData.currentImage) {
          await fileManager.deleteFile(categoryData.currentImage, CATEGORY_STORAGE_BUCKET)
        }
        imageUrl = await fileManager.uploadFile(categoryData.imageFile, CATEGORY_STORAGE_BUCKET)
      }
      const { data: updatedCategory, error } = await supabase
        .from(CATEGORY_TABLE)
        .update({ name: categoryData.name, description: categoryData.description, image: imageUrl })
        .eq('id', categoryData.id)
        .select()
        .single()

      if (error) throw error

      await syncCategoryBrands(updatedCategory.id, categoryData.brand_ids)

      return updatedCategory
    }, 'Category updated successfully!')
  }

  async function deleteCategory(categoryId) {
    return performAction(async () => {
      const categoryToDelete = categories.value.find((c) => c.id === categoryId)
      if (!categoryToDelete) throw new Error('Category not found for deletion.')
      if (categoryToDelete.image)
        await fileManager.deleteFile(categoryToDelete.image, CATEGORY_STORAGE_BUCKET)
      return supabase.from(CATEGORY_TABLE).delete().eq('id', categoryId)
    }, 'Category deleted.')
  }
  async function removeCategoryImage(categoryId, imageUrl) {
    return performAction(async () => {
      if (!imageUrl) throw new Error('No image URL provided to delete.')
      await fileManager.deleteFile(imageUrl, CATEGORY_STORAGE_BUCKET)
      return supabase
        .from(CATEGORY_TABLE)
        .update({ image: null })
        .eq('id', categoryId)
        .select()
        .single()
    }, 'Image removed successfully.')
  }
  async function fetchAllItems() {
    loading.value = true
    try {
      const { data, error } = await supabase.from(CATEGORY_TABLE).select(buildFetchQuery(true))
      if (error) throw error
      allCategories.value = data.map((category) => {
        const brands = category[CATEGORY_BRAND_JUNCTION_TABLE]?.map((brand) => {
          return {
            id: brand[BRAND_TABLE].id,
            name: brand[BRAND_TABLE].name,
          }
        })

        return {
          id: category.id,
          name: category.name,
          brands: brands,
        }
      })
      console.log(allCategories.value)
    } catch (e) {
      handleError(e)
      categories.value = []
    } finally {
      loading.value = false
    }
  }

  watch(
    () => options.value.search,
    () => {
      clearTimeout(debounceTimer)
      debounceTimer = setTimeout(() => {
        fetchCategories({ page: 1 })
      }, 500)
    },
  )

  return {
    categories,
    loading,
    totalCategories,
    options,
    itemsPerPageOptions,
    allCategories,
    fetchCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    removeCategoryImage,
    fetchAllItems,
  }
})
