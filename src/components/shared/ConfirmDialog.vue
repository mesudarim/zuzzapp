<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="$emit('update:modelValue', false)" />
        <div class="relative card max-w-sm w-full text-center z-10">
          <p class="text-gray-800 font-medium mb-6">{{ message || t('common.confirm') }}</p>
          <div class="flex gap-3 justify-center">
            <button class="btn-secondary" @click="$emit('update:modelValue', false)">
              {{ t('common.cancel') }}
            </button>
            <button class="btn-danger" @click="$emit('confirm')">
              {{ t('common.delete') }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
const { t } = useI18n()
defineProps({ modelValue: Boolean, message: String })
defineEmits(['update:modelValue', 'confirm'])
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from, .modal-leave-to       { opacity: 0; }
</style>
