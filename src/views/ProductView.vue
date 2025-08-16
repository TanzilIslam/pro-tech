<template>
  <div>
    <template v-if="mode === 'list'">
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
            <v-btn
              color="primary"
              prepend-icon="mdi-plus"
              variant="flat"
              @click="
                () => {
                  showCreateDialog = true
                  productName = ''
                }
              "
            >
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
                <v-icon
                  class="me-2"
                  size="small"
                  @click="router.push({ name: 'product', query: { mode: 'form', id: item.id } })"
                  >mdi-pencil</v-icon
                >
                <v-icon size="small" @click="openDeleteDialog(item)">mdi-delete</v-icon>
              </template>
              <template v-else>
                {{ item[col.key] }}
              </template>
            </td>
          </tr>
        </template>
      </v-data-table-server>
    </template>
    <template v-else-if="mode === 'view'"> {{ moduleName }} Details </template>
    <template v-else-if="mode === 'form'">
      <v-form ref="formRef" @submit.prevent="submitForm">
        <v-row>
          <v-col cols="12">
            <v-btn size="small" color="primary" icon="mdi-arrow-left" @click="cancelSaving"></v-btn>
          </v-col>
          <v-col cols="12" md="3">
            <div class="pa-4">
              <p class="pa-0 mb-4 text-h6">Main Image</p>
              <v-file-input
                v-if="!editedItem.image"
                label="Upload Main Image"
                accept="image/*"
                @update:modelValue="onMainImageSelect"
                prepend-inner-icon="mdi-image"
                prepend-icon=""
                :rules="[rules.required]"
              />
              <div v-else>
                <v-img
                  :src="editedItem.image"
                  cover
                  width="100%"
                  height="310px"
                  class="mb-2 rounded border"
                />
                <v-btn size="small" color="error" variant="tonal" @click="handleRemoveImage">
                  Remove Image
                </v-btn>
              </div>
            </div>
          </v-col>
          <v-col cols="12" md="9">
            <div class="pa-4">
              <p class="pa-0 mb-4 text-h6">Image Gallery</p>
              <v-file-input
                label="Upload Additional Images"
                multiple
                chips
                accept="image/*"
                variant="outlined"
                prepend-inner-icon="mdi-image"
                prepend-icon=""
                @update:modelValue="onGalleryImageSelect"
              />
              <v-row>
                <v-col
                  v-for="(imgUrl, index) in editedItem.gallery_images"
                  :key="index"
                  cols="6"
                  sm="4"
                  md="3"
                >
                  <v-card class="position-relative">
                    <v-img :src="imgUrl" height="250px" cover class="rounded" />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      color="error"
                      class="position-absolute"
                      style="top: 4px; right: 4px"
                      @click="removeGalleryImage(imgUrl)"
                    />
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-col>
          <v-col cols="12" md="8">
            <div class="pa-4">
              <p class="pa-0 mb-4 text-h6">Core Information</p>

              <v-text-field
                v-model.trim="editedItem.name"
                label="Product Name"
                :rules="[rules.required]"
                variant="outlined"
                class="mb-4"
              />

              <v-text-field
                v-model.trim="editedItem.part_number"
                label="Part Number (P.N.)"
                variant="outlined"
                class="mb-4"
              />
              <AppRichTextEditor v-model="editedItem.description" />
            </div>
          </v-col>
          <v-col cols="12" md="4" class="border-s border-b">
            <div class="pa-4">
              <p class="pa-0 mb-4 text-h6">Organization</p>
              <v-autocomplete
                v-model="editedItem.category"
                label="Category"
                :items="categoryStore.allCategories"
                item-title="name"
                return-object
                :rules="[rules.required]"
                variant="outlined"
                class="mb-4"
                @update:modelValue="onCategoryChange"
              />

              <v-autocomplete
                v-model="editedItem.brand"
                label="Brand"
                :items="brandList"
                item-title="name"
                return-object
                variant="outlined"
                class="mb-4"
                clearable
                :disabled="!editedItem.category"
              />

              <v-select
                v-model="editedItem.availability"
                label="Availability Status"
                :items="['In Stock', 'On Order', 'Ask for Availability']"
                variant="outlined"
              />
              <div class="">
                <p class="pa-0 mb-2 text-h6">Technical Specifications</p>
                <div
                  v-for="(spec, index) in editedItem.specifications"
                  :key="index"
                  class="d-flex flex-wrap align-center mb-2 ga-2"
                >
                  <v-text-field
                    v-model="spec.key"
                    label="Attribute"
                    variant="outlined"
                    density="compact"
                    hide-details
                    class="mr-2"
                  />
                  <v-text-field
                    v-model="spec.value"
                    label="Value"
                    variant="outlined"
                    density="compact"
                    hide-details
                  />
                  <v-btn
                    icon="mdi-delete"
                    size="x-small"
                    color="error"
                    @click="removeSpecification(index)"
                  />
                </div>
                <v-btn prepend-icon="mdi-plus" @click="addSpec"> Add Specification </v-btn>
              </div>
            </div>

            <!-- Main Image Card -->
          </v-col>
        </v-row>
        <v-row> </v-row>
        <v-row>
          <v-col cols="12">
            <div class="pa-4 d-flex justify-end ga-4">
              <v-btn prepend-icon="mdi-close" color="error" @click="cancelSaving"> Cancel </v-btn>
              <v-btn prepend-icon="mdi-content-save" color="primary" @click="submitForm">
                Save {{ moduleName }}
              </v-btn>
            </div>
          </v-col>
        </v-row>
      </v-form>
    </template>
  </div>
  <AppDialog ref="dialogRef" v-model="showCreateDialog">
    <template #title> Create New {{ moduleName }} </template>
    <v-text-field
      v-model="productName"
      :rules="[rules.required]"
      label="Product Name*"
      variant="outlined"
      class="mb-4"
    />
    <!-- Actions Slot -->
    <template #actions>
      <v-btn color="error" @click="showCreateDialog = false">Cancel</v-btn>
      <v-btn color="primary" @click="createItem" :loading="store.loading">Save</v-btn>
    </template>
  </AppDialog>
</template>

<script setup>
import { useFileManagerStore } from '@/stores/fileManager'
import { useCategoryStore } from '@/stores/category'
import { useBrandStore } from '@/stores/brand'
import { useAppStore } from '@/stores/app'
import { useProductStore } from '@/stores/product'
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '@/lib/helper'
import { useRoute, useRouter } from 'vue-router'
import AppRichTextEditor from '@/components/common/AppRichTextEditor.vue'
import AppDialog from '@/components/common/AppDialog.vue'
import { PRODUCT_STORAGE_BUCKET } from '@/lib/dbTable'

const moduleName = 'Product'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const brandStore = useBrandStore()
const categoryStore = useCategoryStore()
const store = useProductStore()
const fileManager = useFileManagerStore()

const dialogRef = ref(null)
const showCreateDialog = ref(false)
const formRef = ref(null)
const brandList = ref([])
const productName = ref('')

const getDefaultItem = () => {
  return {
    name: '',
    part_number: '',
    description: '',
    availability: 'In Stock',

    category: null,
    brand: null,

    image: null,
    mainImageFile: null,
    imagePreview: null,

    gallery_images: [],
    newGalleryFiles: [],

    specifications: [],
  }
}
const editedItem = ref(getDefaultItem())
const headers = ref([
  { title: 'Logo', key: 'image', sortable: false, width: '100px' },
  { title: 'Name', key: 'name' },
  { title: 'Created At', key: 'created_at', sortable: true },
  { title: 'Actions', key: 'actions', sortable: false, align: 'end' },
])

const mode = computed(() => {
  return route.query.mode || 'list'
})
const id = computed(() => {
  return route.query.id || null
})

const rules = {
  required: (value) => !!value || 'This field is required.',
}

const addSpec = () => {
  editedItem.value.specifications.push({
    attribute: '',
    value: '',
  })
}
const cancelSaving = () => {
  formRef.value.reset()
  formRef.value.resetValidation()
  editedItem.value = getDefaultItem()
  router.push({ name: 'product' })
}

const openDeleteDialog = async (item) => {
  const confirmed = await appStore.showConfirmDialog({
    title: `Delete '${item.name}'?`,
    message: 'Are you sure you want to permanently delete this ' + moduleName + '?',
  })

  if (confirmed) {
    await store.deleteItem(item)
  }
}

const submitForm = async () => {
  const { valid } = await formRef.value.validate()
  if (!valid || !id.value) return
  const payload = {
    id: id.value,
    name: editedItem.value.name,
    part_number: editedItem.value.part_number,
    description: editedItem.value.description,
    specifications: editedItem.value.specifications,
    category_id: editedItem.value.category?.id,
    brand_id: editedItem.value.brand?.id,
    availability: editedItem.value.availability,
    image: editedItem.value.image,
    gallery_images: editedItem.value.gallery_images,
  }
  await store.updateItem(payload)
  await fetchItemById()
  router.push({ name: 'product' })
}
const onMainImageSelect = async (file) => {
  if (file) {
    const url = await fileManager.uploadFile(file, PRODUCT_STORAGE_BUCKET)
    if (url) {
      await store.updateItem({
        id: id.value,
        image: url,
      })
      await fetchItemById()
    }
  }
}

const handleRemoveImage = async () => {
  await store.removeItemImage(id.value, editedItem.value.image)
  await fetchItemById()
}

const getPlural = (word) => {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies'
  } else if (word.endsWith('s')) {
    return word + 'es'
  } else {
    return word + 's'
  }
}
const onCategoryChange = (category) => {
  editedItem.value.brand_id = null
  if (!category) {
    brandList.value = []
    return
  }
  brandList.value = category.brands
}

const onGalleryImageSelect = async (files) => {
  if (files?.length > 0) {
    await fileManager.uploadMultipleFiles(files, PRODUCT_STORAGE_BUCKET).then(async (urls) => {
      await store.updateItem({
        id: id.value,
        gallery_images: [...editedItem.value.gallery_images, ...urls],
      })
      await fetchItemById()
    })
  }
}

const removeGalleryImage = async (url) => {
  await fileManager.deleteFile(url, PRODUCT_STORAGE_BUCKET)
  const newGalleryImages = editedItem.value.gallery_images.filter((img) => img !== url)
  await store.updateItem({
    id: id.value,
    gallery_images: newGalleryImages,
  })
  await fetchItemById()
}

const createItem = async () => {
  const { valid } = await dialogRef.value.validateForm()
  if (!valid) return
  await store.createItem(productName.value)
  showCreateDialog.value = false
  productName.value = ''
}
const fetchItemById = async () => {
  const item = await store.fetchItemById(id.value)
  if (item) {
    console.log(item)

    editedItem.value.name = item?.name || ''
    editedItem.value.part_number = item?.part_number || ''
    editedItem.value.description = item?.description || ''
    editedItem.value.specifications = item?.specifications || []

    editedItem.value.category = categoryStore.allCategories.find(
      (category) => category.id == item.category_id,
    )
    editedItem.value.brand = item.brand || null
    brandList.value = editedItem.value.category?.brands || []
    editedItem.value.availability = item?.availability || 'In Stock'

    editedItem.value.image = item?.image || null
    editedItem.value.gallery_images = item?.gallery_images || []
  }
}
const removeSpecification = (index) => {
  editedItem.value.specifications.splice(index, 1)
}

onMounted(async () => {
  await Promise.all([brandStore.fetchAllItems(), categoryStore.fetchAllItems()])
  if (id.value) {
    await fetchItemById()
  }
})
</script>
