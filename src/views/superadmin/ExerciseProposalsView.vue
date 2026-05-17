<template>
  <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold">{{ t('exercises.proposals') }}</h1>
        <p class="text-sm text-gray-400">{{ t('exercises.proposalsHint') }}</p>
      </div>
      <router-link to="/superadmin" class="btn-secondary text-sm">← {{ t('common.back') }}</router-link>
    </div>

    <AppSpinner v-if="loading" />

    <div v-else-if="proposals.length === 0" class="card text-center py-10 text-gray-400 text-sm">
      {{ t('exercises.noProposals') }}
    </div>

    <div v-else class="space-y-3">
      <div v-for="ex in proposals" :key="ex.id" class="card space-y-3">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="font-semibold">{{ localField(ex.name) }}</p>
            <p class="text-xs text-gray-400 mt-0.5">
              {{ t('exercises.proposedBy') }}: <span class="font-medium text-gray-600">{{ gymName(ex.gymId) }}</span>
            </p>
          </div>
          <span class="shrink-0 text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
            ⏳ {{ t('exercises.pending') }}
          </span>
        </div>

        <p v-if="ex.description" class="text-sm text-gray-600">{{ localField(ex.description) }}</p>
        <a v-if="ex.videoUrl" :href="ex.videoUrl" target="_blank"
           class="text-xs text-brand-600 hover:underline inline-flex items-center gap-1">
          ▶ {{ t('exercises.watchVideo') }}
        </a>
        <p v-else class="text-xs text-gray-400 italic">{{ t('exercises.noVideo') }}</p>

        <div class="flex gap-2 pt-1">
          <button
            class="btn-primary text-sm flex-1"
            :disabled="processing === ex.id"
            @click="approve(ex)"
          >
            ✓ {{ t('exercises.approve') }}
          </button>
          <button
            class="btn-danger text-sm flex-1"
            :disabled="processing === ex.id"
            @click="reject(ex)"
          >
            ✗ {{ t('exercises.reject') }}
          </button>
        </div>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExercisesStore } from '@/stores/exercises'
import { useSuperAdminStore } from '@/stores/superAdmin'
import { useLocalField } from '@/composables/useLocalField'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t }         = useI18n()
const { localField } = useLocalField()
const store         = useExercisesStore()
const superStore    = useSuperAdminStore()

const proposals  = ref([])
const loading    = ref(true)
const processing = ref(null)
const gymsMap    = ref({})   // gymId → gym name

onMounted(async () => {
  proposals.value = await store.fetchPendingProposals()
  loading.value   = false

  // Collect unique gymIds from proposals and resolve names
  const ids = [...new Set(proposals.value.map((p) => p.gymId).filter(Boolean))]
  await Promise.all(ids.map(async (id) => {
    const gym = await superStore.fetchGym(id)
    if (gym) gymsMap.value[id] = gym.name
  }))
})

function gymName(gymId) {
  if (!gymId) return '—'
  return gymsMap.value[gymId] ?? gymId
}

async function approve(ex) {
  processing.value = ex.id
  await store.approveProposal(ex.id)
  proposals.value = proposals.value.filter((p) => p.id !== ex.id)
  processing.value = null
}

async function reject(ex) {
  processing.value = ex.id
  await store.rejectProposal(ex.id)
  proposals.value = proposals.value.filter((p) => p.id !== ex.id)
  processing.value = null
}
</script>
