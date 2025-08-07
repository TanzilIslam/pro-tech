<template>
  <v-dialog v-model="dialog.show" persistent max-width="400">
    <v-card>
      <v-card-text class="pa-5">
        <div class="d-flex align-center ga-2 mb-4 text-h5">
          <v-icon size="small" color="warning">mdi-alert</v-icon>
          <p>{{ dialog.title }}</p>
        </div>
        <p>{{ dialog.message }}</p>
      </v-card-text>
      <v-card-actions class="justify-end pa-5">
        <v-btn variant="text" @click="app.cancel">{{ dialog.cancelText }}</v-btn>
        <v-btn color="primary" variant="flat" @click="app.confirm">{{ dialog.confirmText }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { useAppStore } from '@/stores/app'

const app = useAppStore()
const { confirmDialog: dialog } = storeToRefs(app)
</script>
