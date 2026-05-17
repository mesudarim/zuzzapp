<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">{{ t('coaches.title') }}</h2>
      <!-- Lien vers Users pour ajouter des entraîneurs -->
      <router-link to="/admin/users" class="btn-secondary text-sm">
        👥 {{ t('coaches.manageViaUsers') }}
      </router-link>
    </div>

    <!-- Aucun entraîneur -->
    <div v-if="!store.loading && store.coaches.length === 0"
         class="card text-center py-10 space-y-2">
      <p class="text-gray-500 text-sm">{{ t('coaches.emptyHint') }}</p>
      <router-link to="/admin/users" class="btn-primary inline-flex">
        👥 {{ t('users.title') }} → {{ t('users.makeAdmin') }}
      </router-link>
    </div>

    <AppSpinner v-else-if="store.loading" />

    <!-- Liste des entraîneurs -->
    <div v-else class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <div v-for="coach in store.coaches" :key="coach.id" class="card flex gap-3 items-start">
        <img
          v-if="coach.photoURL"
          :src="coach.photoURL"
          class="w-12 h-12 rounded-full object-cover shrink-0 ring-2 ring-brand-100"
        />
        <div v-else class="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700 shrink-0">
          {{ coach.name?.[0] ?? '?' }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-semibold truncate">{{ coach.name }}</p>
          <p class="text-xs text-gray-400 truncate">{{ coach.email }}</p>
          <p class="text-xs text-gray-500 mt-1 line-clamp-2">{{ coach.bio || '—' }}</p>
        </div>

        <button
          class="btn-secondary text-xs px-2 py-1 shrink-0"
          @click="openEdit(coach)"
        >
          {{ t('common.edit') }}
        </button>
      </div>
    </div>

    <!-- Modal édition bio -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40" @click="editOpen = false" />
          <form
            class="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10"
            @submit.prevent="handleSave"
          >
            <h3 class="font-semibold">{{ t('coaches.editCoach') }} — {{ editing?.name }}</h3>

            <div>
              <label class="text-xs text-gray-600 mb-1 block">{{ t('coaches.bio') }}</label>
              <textarea v-model="form.bio" class="input" rows="3" />
            </div>

            <p v-if="saveError" class="text-red-600 text-xs">{{ saveError }}</p>

            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="editOpen = false">
                {{ t('common.cancel') }}
              </button>
              <button type="submit" class="btn-primary flex-1" :disabled="saving">
                {{ saving ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useCoachesStore } from '@/stores/coaches'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t } = useI18n()
const store = useCoachesStore()

const editOpen  = ref(false)
const editing   = ref(null)
const saving    = ref(false)
const saveError = ref('')
const form      = reactive({ bio: '' })

function openEdit(coach) {
  editing.value  = coach
  form.bio       = coach.bio ?? ''
  saveError.value = ''
  editOpen.value = true
}

async function handleSave() {
  saving.value    = true
  saveError.value = ''
  try {
    await store.updateCoach(editing.value.id, { bio: form.bio })
    editOpen.value = false
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await store.fetchOnce()
  store.subscribe()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
