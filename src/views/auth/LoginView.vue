<template>
  <v-container class="fill-height d-flex justify-center align-center">
    <v-card width="400" elevation="4" class="pa-4">
      <v-card-text>
        <v-form @submit.prevent="handleLogin" ref="formRef" validate-on="submit">
          <v-text-field
            v-model="email"
            label="Email"
            type="email"
            :rules="[(v) => !!v || 'Email is required']"
            required
            prepend-inner-icon="mdi-email"
          />
          <v-text-field
            v-model="password"
            label="Password"
            type="password"
            :rules="[(v) => !!v || 'Password is required']"
            required
            prepend-inner-icon="mdi-lock"
          />
          <v-btn :loading="userStore.loading" type="submit" color="primary" block class="">
            Login
          </v-btn>
        </v-form>
      </v-card-text>
    </v-card>
  </v-container>
</template>

<script setup>
import { ref } from 'vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useRouter } from 'vue-router'

const userStore = useUserStore()
const appStore = useAppStore()
const router = useRouter()

const email = ref('')
const password = ref('')
const formRef = ref(null)

const handleLogin = async () => {
  try {
    await userStore.loginWithEmail(email.value, password.value)
    appStore.showSnackbar({
      text: 'Login successful',
      color: 'success',
    })
    router.push({ name: 'dashboard' })
  } catch (err) {
    appStore.showSnackbar({
      text: err.message || 'Login failed',
      color: 'error',
    })
  }
}
</script>
