<template>
  <div>
    <v-data-table-server
      v-model:sort-by="store.sortBy"
      v-model:items-per-page="store.itemsPerPage"
      :headers="headers"
      :items="store.items"
      :items-length="store.totalItems"
      :loading="store.loading"
      @update:options="store.fetchItems"
      :items-per-page-options="store.itemsPerPageOptions"
      v-model:page="store.page"
    >
      <template v-slot:top>
        <v-toolbar color="transparent">
          <v-toolbar-title>{{ getPlural(moduleName) }}</v-toolbar-title>
          <v-spacer />
          <v-text-field
            v-model="store.search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            hide-details
            single-line
            class="ma-2"
            style="max-width: 300px"
          ></v-text-field>
        </v-toolbar>
      </template>

      <template #item="{ item, columns }">
        <tr>
          <td v-for="col in columns" :key="col.key">
            <template v-if="col.key === 'image'">
              <v-img
                :src="item.image || '/fallback.jpg'"
                rounded
                contain
                width="120px"
                height="60px"
              />
            </template>
            <template v-else-if="col.key === 'created_at'">
              {{ formatDate(item.created_at) }}
            </template>
            <template v-else-if="col.key === 'actions'">
              <v-icon v-if="!item.is_read" class="me-2" size="small" @click="onRead(item)"
                >mdi-eye</v-icon
              >
              <v-icon v-else class="me-2" size="small" @click="onUnread(item)">mdi-eye-off</v-icon>
            </template>
            <template v-else>
              {{ item[col.key] }}
            </template>
          </td>
        </tr>
      </template>
    </v-data-table-server>
  </div>
</template>

<script setup>
import { useEnquiryStore } from '@/stores/enquiry'
import { ref } from 'vue'
import { formatDate } from '@/lib/helper'

const moduleName = 'Enquiry'

const store = useEnquiryStore()

const onRead = async (item) => {
  await store.markAsRead(item)
  await store.fetchItems()
  await store.fetchUnreadEnquiries()
}

const onUnread = async (item) => {
  await store.markAsUnread(item)
  await store.fetchItems()
  await store.fetchUnreadEnquiries()
}

const headers = ref([
  { title: 'Company', key: 'company_name' },
  { title: 'Customer', key: 'customer_name', sortable: true },
  { title: 'Email', key: 'email_address', sortable: true },
  { title: 'Phone', key: 'phone_number', sortable: true },

  { title: 'Product Name', key: 'product_name' },

  { title: 'Product Price', key: 'product_price' },
  { title: 'Message', key: 'message' },

  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
])

function getPlural(word) {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies'
  } else if (word.endsWith('s')) {
    return word + 'es'
  } else {
    return word + 's'
  }
}
</script>
