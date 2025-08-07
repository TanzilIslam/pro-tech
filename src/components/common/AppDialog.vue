<template>
  <v-dialog
    :model-value="modelValue"
    @update:model-value="$emit('update:modelValue', $event)"
    :max-width="maxWidth"
    :persistent="persistent"
  >
    <v-card>
      <v-card-text class="pa-10">
        <v-form ref="formRef">
          <div v-if="$slots.title" class="text-h6 mb-4">
            <slot name="title" />
          </div>
          <slot />
        </v-form>
      </v-card-text>

      <v-card-actions class="pa-10">
        <v-spacer />
        <slot name="actions" />
      </v-card-actions>
    </v-card>
  </v-dialog>
</template>

<script setup>
import { ref } from 'vue'

defineProps({
  modelValue: {
    type: Boolean,
    required: true,
  },
  maxWidth: {
    type: String,
    default: '600px',
  },
  persistent: {
    type: Boolean,
    default: true,
  },
})
defineEmits(['update:modelValue'])
const formRef = ref(null)

const validateForm = () => {
  return formRef.value?.validate()
}

const resetForm = () => {
  formRef.value?.reset()
}

defineExpose({
  validateForm,
  resetForm,
})
</script>
