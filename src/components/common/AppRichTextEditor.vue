<script setup>
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import '@/lib/ckeditor/build/ckeditor'
import SupabaseUploadAdapterPlugin from '@/lib/ckeditor/SupabaseUploadAdapter'

const props = defineProps({
  modelValue: {
    type: [String, null],
    default: () => '',
  },
  updateContent: {
    type: [String, null],
    default: () => null,
  },
  height: {
    type: String,
    default: () => '380px',
  },
  focusOnCreate: {
    type: Boolean,
    default: () => false,
  },
  placeholder: {
    type: String,
    default: () => '',
  },
})

const emit = defineEmits(['ready', 'update:modelValue', 'error', 'focus', 'blur', 'destroy'])

let editor = null
const editor_ref = ref(null)
onMounted(async () => {
  if (editor_ref.value) {
    const options = {
      extraPlugins: [SupabaseUploadAdapterPlugin],
    }
    // eslint-disable-next-line no-undef
    editor = await ClassicEditor.create(editor_ref.value, options)
    emit('ready', editor)
  }
  if (!editor) {
    emit('error', 'Editor failed to load')
  } else {
    setEditorData(props.modelValue)
    if (props.focusOnCreate) editor.focus()
    editor.model.document.on('change:data', () => {
      emit('update:modelValue', editor.getData())
    })
    editor.editing.view.document.on('change:isFocused', (event, data, isFocused) => {
      isFocused ? emit('focus', event) : emit('blur', event)
    })
  }
})
onBeforeUnmount(async () => {
  if (!editor) {
    return
  }
  await editor.destroy()
  emit('destroy')
})
const setEditorData = (data) => {
  if (!data) return
  editor.setData(data)
}
watch(
  () => props.updateContent,
  (data) => {
    if (typeof props.updateContent === 'string') setEditorData(data)
  },
)
watch(
  () => props.modelValue,
  (newValue) => {
    if (editor && newValue !== editor.getData()) {
      editor.setData(newValue || '')
    }
  },
)
</script>

<template>
  <div class="skn-ck-editor">
    <textarea ref="editor_ref" :placeholder="placeholder" />
  </div>
</template>

<style scoped>
:deep(.ck-content) {
  height: v-bind(height);
}

:deep(.ck-toolbar) {
  background: rgb(249 250 251 / 1) !important;
}
</style>
