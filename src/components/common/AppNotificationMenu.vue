<template>
  <v-menu location="bottom end" :close-on-content-click="false">
    <template v-slot:activator="{ props }">
      <v-btn icon v-bind="props" class="me-2">
        <v-badge
          :content="enquiryStore.unreadCount"
          :model-value="enquiryStore.unreadCount > 0"
          color="error"
        >
          <v-icon>mdi-bell-outline</v-icon>
        </v-badge>
      </v-btn>
    </template>

    <v-list class="py-0" width="350">
      <v-list-subheader class="bg-primary">
        <v-icon class="me-2">mdi-bell-ring</v-icon>
        Notifications
      </v-list-subheader>
      <v-divider />

      <template v-if="enquiryStore.unreadCount > 0">
        <v-virtual-scroll :items="enquiryStore.unreadEnquiries" height="300">
          <template v-slot:default="{ item }">
            <v-list-item
              :key="item.id"
              class="notification-item"
              @click="handleNotificationClick(item)"
            >
              <v-list-item-title class="font-weight-bold">{{
                item.customer_name
              }}</v-list-item-title>
              <v-list-item-subtitle>
                Enquired about: <strong>{{ item.product_name }}</strong>
              </v-list-item-subtitle>
              <template v-slot:append>
                <v-btn
                  icon="mdi-check"
                  size="x-small"
                  variant="text"
                  color="success"
                  @click.stop="markAsRead(item)"
                  title="Mark as read"
                ></v-btn>
              </template>
            </v-list-item>
            <v-divider />
          </template>
        </v-virtual-scroll>
      </template>

      <v-list-item v-else>
        <v-list-item-title class="text-center text-grey py-4">
          No new notifications
        </v-list-item-title>
      </v-list-item>

      <v-divider />
      <v-list-item class="text-center" @click="viewAllEnquiries">
        <v-list-item-title class="text-primary font-weight-bold">
          View All Enquiries
        </v-list-item-title>
      </v-list-item>
    </v-list>
  </v-menu>
</template>
<script setup>
import { useEnquiryStore } from '@/stores/enquiry'
import { useRouter } from 'vue-router'

const enquiryStore = useEnquiryStore()
const router = useRouter()

function markAsRead(enquiry) {
  enquiryStore.markAsRead(enquiry)
}

function handleNotificationClick(enquiry) {
  // First, mark it as read
  markAsRead(enquiry)
  // Then, navigate to the enquiry details page (we'll build this later)
  viewAllEnquiries()
}

function viewAllEnquiries() {
  // Navigate to the main enquiries list page
  router.push({ name: 'enquiry' })
}
</script>

<style scoped>
.notification-item {
  cursor: pointer;
}
.notification-item:hover {
  background-color: rgba(var(--v-theme-on-surface), 0.04);
}
</style>
