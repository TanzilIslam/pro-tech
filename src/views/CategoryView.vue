<template>
  <div>
    <v-data-table-server
      v-model:sort-by="categoryStore.sortBy"
      v-model:items-per-page="categoryStore.itemsPerPage"
      :headers="headers"
      :items="categoryStore.categories"
      :items-length="categoryStore.totalCategories"
      :loading="categoryStore.loading"
      @update:options="categoryStore.fetchCategories"
      :items-per-page-options="categoryStore.itemsPerPageOptions"
      v-model:page="categoryStore.page"
    >
      <template v-slot:top>
        <v-toolbar color="transparent">
          <v-toolbar-title>Categories</v-toolbar-title>
          <v-spacer />
          <v-text-field
            v-model="categoryStore.search"
            label="Search"
            prepend-inner-icon="mdi-magnify"
            hide-details
            single-line
            class="ma-2"
            style="max-width: 300px"
          ></v-text-field>
          <v-btn color="primary" prepend-icon="mdi-plus" variant="flat" @click="openDialog()">
            New Category
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
                cover
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
            <template v-else-if="col.key === 'associated_brands'">
              <v-chip-group column>
                <v-chip label v-for="brand in item?.associated_brands" :key="brand.id">
                  {{ brand.name }}
                </v-chip>
              </v-chip-group>
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
        label="Category Name*"
        variant="outlined"
        class="mb-4"
      />
      <v-textarea
        v-model="editedItem.description"
        label="Description"
        variant="outlined"
        rows="3"
        class="mb-4"
      />
      <v-autocomplete
        v-model="editedItem.brand_ids"
        :items="brandOptions"
        item-title="name"
        item-value="id"
        label="Associated Brands"
        multiple
        chips
        closable-chips
        class="mb-4"
      ></v-autocomplete>
      <v-file-input
        v-if="!editedItem.imagePreview"
        v-model="editedItem.imageFile"
        label="Category Image"
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
          contain
          width="100%"
          height="200px"
          class="mb-2 rounded border"
        />
        <v-btn size="small" color="error" variant="tonal" @click="handleRemoveImage">
          Remove Image
        </v-btn>
      </div>

      <!-- Actions Slot -->
      <template #actions>
        <v-btn color="error" @click="closeDialog">Cancel</v-btn>
        <v-btn color="primary" @click="submitForm" :loading="categoryStore.loading">Save</v-btn>
      </template>
    </AppDialog>
  </div>
</template>

<script setup>
import { useCategoryStore } from '@/stores/category'
import { useAppStore } from '@/stores/app'
import { useBrandStore } from '@/stores/brand'
import { ref, computed, nextTick } from 'vue'
import AppDialog from '@/components/common/AppDialog.vue'
import { formatDate } from '@/lib/helper'

const appStore = useAppStore()
const categoryStore = useCategoryStore()
const brandStore = useBrandStore()

const dialog = ref(false)
const dialogRef = ref(null)
const form = ref(null)
const removingImage = ref(false)

const defaultItem = {
  id: null,
  name: '',
  description: '',
  brand_ids: [],
  image: null,
  imageFile: null,
  imagePreview: null,
}
const editedItem = ref({ ...defaultItem })

const formTitle = computed(() => (editedItem.value.id ? 'Edit Category' : 'New Category'))

const headers = ref([
  { title: 'Image', key: 'image', sortable: false, width: '100px' },
  { title: 'Name', key: 'name' },
  { title: 'Brands', key: 'associated_brands', sortable: false },
  { title: 'Description', key: 'description', sortable: false },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
])

const rules = {
  required: (value) => !!value || 'This field is required.',
}

const brandOptions = computed(() => brandStore.items)

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
    message: 'Are you sure you want to permanently delete this category?',
  })

  if (confirmed) {
    await categoryStore.deleteCategory(item.id)
  }
}
async function submitForm() {
  const { valid } = await dialogRef.value.validateForm()
  if (!valid) return

  const categoryData = {
    id: editedItem.value.id,
    name: editedItem.value.name,
    description: editedItem.value.description,
    brand_ids: editedItem.value.brand_ids,
    imageFile: editedItem.value.imageFile,
    currentImage: editedItem.value.id ? editedItem.value.image : null,
  }

  const action = editedItem.value.id ? categoryStore.updateCategory : categoryStore.createCategory

  const result = await action(categoryData)

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
    const updatedCategory = await categoryStore.removeCategoryImage(id, image)
    removingImage.value = false

    if (updatedCategory) {
      editedItem.value.image = null
      editedItem.value.imagePreview = null
    }
  } else {
    editedItem.value.imageFile = null
    editedItem.value.imagePreview = null
  }
}
</script>
