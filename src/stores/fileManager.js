// src/stores/fileManagerStore.js
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/lib/supabaseClient'

export const useFileManagerStore = defineStore('fileManager', () => {
  const loading = ref(false)
  const error = ref(null)

  async function uploadFile(file, bucket) {
    if (!file || !bucket) {
      error.value = 'File and bucket name are required.'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const cleanFileName = file.name.replace(/\s+/g, '-').trim()
      const fileName = `${Date.now()}-${cleanFileName}`
      const { error: uploadError } = await supabase.storage.from(bucket).upload(fileName, file)

      if (uploadError) throw uploadError

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName)

      return publicUrl
    } catch (e) {
      error.value = e.message
      console.error(`Error uploading to bucket ${bucket}:`, e.message)
      return null
    } finally {
      loading.value = false
    }
  }

  async function uploadMultipleFiles(files, bucket) {
    if (!files || files.length === 0 || !bucket) {
      error.value = 'Files array and bucket name are required.'
      return null
    }

    loading.value = true
    error.value = null

    try {
      const uploadPromises = files.map((file) => {
        const cleanFileName = file.name.replace(/\s+/g, '-').trim()
        const fileName = `${Date.now()}-${cleanFileName}`
        return supabase.storage.from(bucket).upload(fileName, file)
      })

      // Execute all upload promises in parallel
      const results = await Promise.all(uploadPromises)

      // Check for any errors during upload
      const uploadErrors = results.filter((result) => result.error)
      if (uploadErrors.length > 0) {
        // For simplicity, we'll throw the first error encountered.
        // In a more complex app, you might want to log all errors.
        throw uploadErrors[0].error
      }

      // If all uploads are successful, get their public URLs
      const publicUrls = results.map((result) => {
        const {
          data: { publicUrl },
        } = supabase.storage.from(bucket).getPublicUrl(result.data.path)
        return publicUrl
      })

      return publicUrls
    } catch (e) {
      error.value = e.message
      console.error(`Error uploading multiple files to bucket ${bucket}:`, e.message)
      // In case of partial success, you might want to add cleanup logic here
      // to delete the files that did upload successfully before the error.
      return null
    } finally {
      loading.value = false
    }
  }

  async function deleteFile(fileUrl, bucket) {
    if (!fileUrl || !bucket) return

    try {
      const fileName = fileUrl.split('/').pop()
      if (!fileName) return

      await supabase.storage.from(bucket).remove([fileName])
    } catch (e) {
      console.error(`Failed to delete file from bucket ${bucket}:`, e.message)
    }
  }

  async function deleteMultipleFiles(fileUrls, bucket) {
    if (!fileUrls || fileUrls.length === 0 || !bucket) return

    try {
      const fileNames = fileUrls.map((url) => url.split('/').pop()).filter(Boolean)
      if (fileNames.length === 0) return

      await supabase.storage.from(bucket).remove(fileNames)
    } catch (e) {
      console.error(`Failed to delete multiple files from bucket ${bucket}:`, e.message)
    }
  }

  return {
    loading,
    error,
    uploadFile,
    deleteFile,
    uploadMultipleFiles,
    deleteMultipleFiles,
  }
})
