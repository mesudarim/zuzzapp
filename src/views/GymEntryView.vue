<template>
  <div class="d-flex align-center justify-center" style="min-height:100vh">
    <v-progress-circular v-if="loading" indeterminate color="primary" />
    <v-alert v-else-if="notFound" type="error" class="ma-4">
      {{ $t('gym.notFound') }}
    </v-alert>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGymStore } from '@/stores/gym'

const route    = useRoute()
const router   = useRouter()
const gymStore = useGymStore()

const loading  = ref(true)
const notFound = ref(false)

onMounted(async () => {
  const ok = await gymStore.loadBySlug(route.params.slug)
  if (ok) {
    router.replace({ name: 'Login' })
  } else {
    loading.value  = false
    notFound.value = true
  }
})
</script>
