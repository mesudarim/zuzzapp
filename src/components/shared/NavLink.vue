<template>
  <router-link
    :to="to"
    class="px-3 py-1.5 rounded-lg transition-colors"
    :class="isActive
      ? 'bg-brand-50 text-brand-700'
      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'"
  >
    <slot />
  </router-link>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const props = defineProps({ to: { type: String, required: true } })
const route = useRoute()
const isActive = computed(() => route.path === props.to || route.path.startsWith(props.to + '/'))
</script>
