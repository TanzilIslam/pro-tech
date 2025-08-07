<script setup>
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const drawer = ref(true)
const userStore = useUserStore()
const router = useRouter()

const sideNavItems = computed(() => {
  return router.getRoutes().filter((route) => route.meta?.usedInSideNav)
})

const handleLogout = async () => {
  await userStore.logout()
  router.push({ name: 'login' })
}

const isMobile = computed(() => {
  return window.innerWidth < 768
})
</script>

<template>
  <v-app>
    <v-app-bar color="primary" density="compact">
      <v-app-bar-nav-icon @click.stop="drawer = !drawer"></v-app-bar-nav-icon>
      <v-toolbar-title>Pro Tech Engineering</v-toolbar-title>
      <v-spacer></v-spacer>
      <v-btn icon="mdi-logout" @click="handleLogout"></v-btn>
    </v-app-bar>

    <v-navigation-drawer v-model="drawer" :permanent="!isMobile">
      <v-list density="compact" nav>
        <v-list-item
          v-for="item in sideNavItems"
          :key="item.name"
          :to="item.path"
          :prepend-icon="item.meta?.icon"
          :title="item.meta?.title"
          :value="item.name"
        ></v-list-item>
      </v-list>
    </v-navigation-drawer>

    <v-main>
      <v-container>
        <v-card>
          <v-card-text>
            <RouterView />
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>
