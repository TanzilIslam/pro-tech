import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useAppStore = defineStore('app', () => {
  const snackbar = ref({
    show: false,
    text: '',
    color: 'success',
    timeout: 3000,
  })
  const confirmDialog = ref({
    show: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
  })

  let _resolveConfirm

  function showSnackbar({ text, color = 'success', timeout = 3000 }) {
    snackbar.value = {
      show: true,
      text,
      color,
      timeout,
    }
  }

  function hideSnackbar() {
    snackbar.value.show = false
  }

  function showConfirmDialog({ title, message, confirmText = 'Confirm', cancelText = 'Cancel' }) {
    confirmDialog.value = {
      show: true,
      title,
      message,
      confirmText,
      cancelText,
    }

    return new Promise((resolve) => {
      _resolveConfirm = resolve
    })
  }

  function confirm() {
    confirmDialog.value.show = false
    if (_resolveConfirm) _resolveConfirm(true)
  }

  function cancel() {
    confirmDialog.value.show = false
    if (_resolveConfirm) _resolveConfirm(false)
  }

  function handleError(error, action = 'handleError') {
    console.error(`Error in ${action}:`, error)
    showSnackbar({
      text: 'An error occurred. Please try again later.',
      color: 'error',
    })
  }

  return {
    snackbar,
    showSnackbar,
    hideSnackbar,
    confirmDialog,
    showConfirmDialog,
    confirm,
    cancel,
    handleError,
  }
})
