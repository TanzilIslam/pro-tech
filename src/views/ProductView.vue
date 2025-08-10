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
              @click="router.push({ name: 'product', query: { mode: 'form' } })"
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

            <div class="pa-4 mt-4">
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
                <v-btn icon="mdi-delete" size="x-small" color="error" @click="removeSpec(index)" />
              </div>
              <v-btn prepend-icon="mdi-plus" @click="addSpec"> Add Specification </v-btn>
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
            </div>

            <!-- Main Image Card -->
            <div class="pa-4 mt-4">
              <p class="pa-0 mb-4 text-h6">Main Image</p>
              <v-file-input
                v-if="!editedItem.imagePreview"
                v-model="editedItem.mainImageFile"
                label="Upload Main Image"
                accept="image/*"
                @update:modelValue="previewMainImage"
                prepend-inner-icon="mdi-image"
                prepend-icon=""
                :rules="[rules.required]"
              />
              <div v-else>
                <v-img
                  :src="editedItem.imagePreview"
                  cover
                  width="100%"
                  height="200px"
                  class="mb-2 rounded border"
                />
                <v-btn size="small" color="error" variant="tonal" @click="handleRemoveImage">
                  Remove Image
                </v-btn>
              </div>
            </div>
          </v-col>
        </v-row>
        <v-row>
          <v-col cols="12">
            <div class="pa-4">
              <p class="pa-0 mb-4 text-h6">Image Gallery</p>
              <v-file-input
                v-model="editedItem.newGalleryFiles"
                label="Upload Additional Images"
                multiple
                chips
                accept="image/*"
                variant="outlined"
                prepend-inner-icon="mdi-image"
                prepend-icon=""
                @update:modelValue="previewGalleryImages"
              />

              <p
                class="text-caption mt-4 mb-2"
                v-if="galleryImages && galleryImages.length > 0"
              ></p>
              <v-row>
                <v-col v-for="(imgUrl, index) in galleryImages" :key="index" cols="6" sm="4" md="3">
                  <v-card class="position-relative">
                    <v-img :src="imgUrl" height="250px" cover class="rounded" />
                    <v-btn
                      icon="mdi-close"
                      size="x-small"
                      color="error"
                      class="position-absolute"
                      style="top: 4px; right: 4px"
                      @click="removeGalleryImage(index)"
                    />
                  </v-card>
                </v-col>
              </v-row>
            </div>
          </v-col>
        </v-row>
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
</template>

<script setup>
import { useCategoryStore } from '@/stores/category'
import { useBrandStore } from '@/stores/brand'
import { useAppStore } from '@/stores/app'
import { useProductStore } from '@/stores/product'
import { ref, computed, onMounted } from 'vue'
import { formatDate } from '@/lib/helper'
import { useRoute, useRouter } from 'vue-router'
import AppRichTextEditor from '@/components/common/AppRichTextEditor.vue'
import { BRAND_TABLE } from '@/lib/dbTable'

const moduleName = 'Product'

const route = useRoute()
const router = useRouter()
const appStore = useAppStore()
const brandStore = useBrandStore()
const categoryStore = useCategoryStore()
const store = useProductStore()

const formRef = ref(null)
const brandList = ref([])

const mode = computed(() => {
  return route.query.mode || 'list'
})
const id = computed(() => {
  return route.query.id || null
})

const galleryImages = ref([])

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
  const { valid } = await formRef.value.validate()
  if (!valid) return
  const payload = {
    id: id.value,
    name: editedItem.value.name,
    part_number: editedItem.value.part_number,
    description: editedItem.value.description,
    specifications: editedItem.value.specifications,
    category_id: editedItem.value.category?.id,
    brand_id: editedItem.value.brand?.id,
    availability: editedItem.value.availability,
    mainImageFile: editedItem.value.mainImageFile,
    image: editedItem.value.image,
    newGalleryFiles: editedItem.value.newGalleryFiles,
    gallery_images: editedItem.value.gallery_images,
  }

  if (id.value) {
    await store.updateItem(payload)
  } else {
    await store.createItem(payload)
  }
}
const previewMainImage = (file) => {
  console.log(file)

  if (file) {
    editedItem.value.imagePreview = URL.createObjectURL(file)
  }
}

async function handleRemoveImage() {
  if (!id.value) {
    editedItem.value.imagePreview = null
    editedItem.value.mainImageFile = null
    return
  } else {
    await store.removeItemImage(id.value, editedItem.value.image)
    editedItem.value.imagePreview = null
    editedItem.value.mainImageFile = null
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
function onCategoryChange(category) {
  editedItem.value.brand_id = null
  if (!category) {
    brandList.value = []
    return
  }
  brandList.value = category.brands
}

function previewGalleryImages(files) {
  if (files?.length > 0) {
    files.forEach((file) => {
      galleryImages.value.push(URL.createObjectURL(file))
    })
  } else {
    galleryImages.value = []
  }
}

function removeGalleryImage(index) {
  if (id.value) {
    store.removeSingleGalleryImage(id.value, editedItem.value.gallery_images, index)
  }
  galleryImages.value.splice(index, 1)
  editedItem.value.newGalleryFiles.splice(index, 1)
}

onMounted(async () => {
  await Promise.all([brandStore.fetchAllItems(), categoryStore.fetchAllItems()])
  if (id.value) {
    const item = await store.fetchItemById(id.value)
    if (item) {
      editedItem.value.name = item?.name || ''
      editedItem.value.part_number = item?.part_number || ''
      editedItem.value.description = item?.description || ''
      editedItem.value.specifications = item?.specifications || []

      editedItem.value.category = categoryStore.allCategories.find(
        (category) => category.id == item.category_id,
      )
      editedItem.value.brand = item[BRAND_TABLE] || null
      brandList.value = editedItem.value.category?.brands || []
      editedItem.value.availability = item?.availability || 'In Stock'

      editedItem.value.image = item?.image || null
      editedItem.value.imagePreview = item?.image || null
      editedItem.value.gallery_images = item?.gallery_images || []
      galleryImages.value = item?.gallery_images || []
    }
  }
})
</script>
