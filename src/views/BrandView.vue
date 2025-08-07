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
          <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="openDialog()">
            New {{ moduleName }}
          </v-btn>
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
              <v-icon class="me-2" size="small" @click="openDialog(item)">mdi-pencil</v-icon>
              <v-icon size="small" @click="openDeleteDialog(item)">mdi-delete</v-icon>
            </template>
            <template v-else>
              {{ item[col.key] }}
            </template>
          </td>
        </tr>
      </template>
    </v-data-table-server>

    <AppDialog ref="dialogRef" v-model="dialog">
      <template #title>
        {{ formTitle }}
      </template>
      <v-text-field
        v-model="editedItem.name"
        :rules="[rules.required]"
        label="Brand Name*"
        variant="outlined"
        class="mb-4"
      />
      <v-file-input
        v-if="!editedItem.imagePreview"
        v-model="editedItem.imageFile"
        label="Brand Logo"
        accept="image/*"
        prepend-icon=""
        prepend-inner-icon="mdi-camera"
        variant="outlined"
        show-size
        @update:modelValue="previewImage"
      />

      <div v-else>
        <p class="text-caption mb-1">Image Preview</p>
        <v-img
          :src="editedItem.imagePreview"
          cover
          width="100%"
          height="200px"
          class="mb-2 rounded border mb-4"
        />
        <v-btn size="small" color="error" variant="tonal" @click="handleRemoveImage">
          Remove Image
        </v-btn>
      </div>

      <!-- Actions Slot -->
      <template #actions>
        <v-btn color="error" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" @click="submitForm" :loading="store.loading">Save</v-btn>
      </template>
    </AppDialog>
  </div>
</template>

<script setup>
import { useBrandStore } from '@/stores/brand'
import { useAppStore } from '@/stores/app'
import { ref, computed, nextTick } from 'vue'
import AppDialog from '@/components/common/AppDialog.vue'
import { formatDate } from '@/lib/helper'

const moduleName = 'Brand'

const appStore = useAppStore()
const store = useBrandStore()

const dialog = ref(false)
const dialogRef = ref(null)
const form = ref(null)
const removingImage = ref(false)

const defaultItem = {
  id: null,
  name: '',
  image: null,
  imageFile: null,
  imagePreview: null,
}
const editedItem = ref({ ...defaultItem })

const formTitle = computed(() => (editedItem.value.id ? 'Edit ' + moduleName : 'New ' + moduleName))

const headers = ref([
  { title: 'Logo', key: 'image', sortable: false, width: '100px' },
  { title: 'Name', key: 'name' },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
])

const rules = {
  required: (value) => !!value || 'This field is required.',
}

function openDialog(item = null) {
  if (item) {
    editedItem.value = { ...item, imageFile: null, imagePreview: item.image }
  } else {
    editedItem.value = { ...defaultItem }
  }
  dialog.value = true
}

function closeDialog() {
  dialog.value = false
  nextTick(() => {
    editedItem.value = { ...defaultItem }
    form.value?.resetValidation()
  })
}

async function openDeleteDialog(item) {
  const confirmed = await appStore.showConfirmDialog({
    title: `Delete '${item.name}'?`,
    message: 'Are you sure you want to permanently delete this ' + moduleName + '?',
  })

  if (confirmed) {
    await store.deleteItem(item)
  }
}

async function submitForm() {
  const { valid } = await dialogRef.value.validateForm()
  if (!valid) return

  const payload = {
    id: editedItem.value.id,
    name: editedItem.value.name,
    imageFile: editedItem.value.imageFile,
    currentImage: editedItem.value.id ? editedItem.value.image : null,
  }

  const action = editedItem.value.id ? store.updateItem : store.createItem

  const result = await action(payload)

  if (result) {
    closeDialog()
  }
}

function previewImage(file) {
  if (file) {
    editedItem.value.imagePreview = URL.createObjectURL(file)
  }
}

async function handleRemoveImage() {
  const { id, image } = editedItem.value

  if (id && image) {
    removingImage.value = true
    const updatedBrand = await store.removeItemImage(id, image)
    removingImage.value = false

    if (updatedBrand) {
      editedItem.value.image = null
      editedItem.value.imagePreview = null
    }
  } else {
    editedItem.value.imageFile = null
    editedItem.value.imagePreview = null
  }
}

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
