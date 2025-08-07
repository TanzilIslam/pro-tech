<template>
  <v-app>
    <v-main>
      <RouterView :key="route.fullPath" />
    </v-main>
    <v-snackbar
      v-model="appStore.snackbar.show"
      :timeout="appStore.snackbar.timeout"
      :color="appStore.snackbar.color"
      location="top right"
      variant="flat"
    >
      {{ appStore.snackbar.text }}
    </v-snackbar>
    <AppConfirmDialog />
  </v-app>
</template>

<script setup>
import { useAppStore } from '@/stores/app'
import AppConfirmDialog from '@/components/common/AppConfirmDialog.vue'
import { useRoute } from 'vue-router'

const appStore = useAppStore()
const route = useRoute()
</script>
