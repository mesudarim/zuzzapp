<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">

    <!-- Header -->
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-brand-700">Super Admin</h1>
        <p class="text-sm text-gray-400">{{ t('superAdmin.subtitle') }}</p>
      </div>
      <div class="flex gap-2">
        <!-- Import exercises -->
        <router-link to="/superadmin/exercises/import" class="btn-secondary text-sm">
          ⬆ {{ t('exercises.import.title') }}
        </router-link>
        <!-- Exercise proposals badge -->
        <router-link
          to="/superadmin/proposals"
          class="btn-secondary text-sm relative"
        >
          🏋️ {{ t('exercises.proposals') }}
          <span
            v-if="pendingCount > 0"
            class="absolute -top-1.5 -end-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center font-bold"
          >{{ pendingCount }}</span>
        </router-link>
        <button class="btn-primary" @click="showCreate = true">
          + {{ t('superAdmin.newGym') }}
        </button>
      </div>
    </div>

    <!-- Gym list -->
    <AppSpinner v-if="store.gymsLoading" />

    <div v-else-if="store.gyms.length === 0" class="card text-center py-10 text-gray-400 text-sm">
      {{ t('superAdmin.noGyms') }}
    </div>

    <div v-else class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <div
        v-for="gym in store.gyms"
        :key="gym.id"
        class="card flex gap-3 items-start cursor-pointer hover:shadow-md transition-shadow"
        @click="$router.push({ name: 'SuperAdminGym', params: { id: gym.id } })"
      >
        <!-- Logo / initials -->
        <div class="shrink-0">
          <img
            v-if="gym.logoURL"
            :src="gym.logoURL"
            class="w-12 h-12 rounded-full object-cover ring-2 ring-brand-100"
          />
          <div v-else class="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-xl font-bold text-brand-700">
            {{ gym.name?.[0] ?? '?' }}
          </div>
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="font-semibold truncate">{{ gym.name }}</p>
          <p class="text-xs text-gray-400 font-mono mt-0.5">/gym/{{ gym.slug }}</p>

          <!-- Invite link + copy -->
          <button
            class="mt-2 flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 transition"
            @click.stop="copyLink(gym.slug)"
          >
            🔗 {{ copied === gym.slug ? t('superAdmin.copied') : t('superAdmin.copyLink') }}
          </button>
        </div>

        <span class="text-gray-300 self-center text-lg">›</span>
      </div>
    </div>

    <!-- ── Create gym modal ───────────────────────────────── -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="showCreate" class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <h2 class="text-lg font-semibold">{{ t('superAdmin.newGym') }}</h2>

            <!-- Name -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('gym.name') }}</label>
              <input
                v-model="form.name"
                type="text"
                :placeholder="t('superAdmin.namePlaceholder')"
                class="input"
                @input="autoSlug"
              />
            </div>

            <!-- Slug -->
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('gym.slug') }}</label>
              <div class="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-brand-300">
                <span class="px-3 py-2 bg-gray-50 text-gray-400 text-sm border-e border-gray-200 shrink-0">/gym/</span>
                <input
                  v-model="form.slug"
                  type="text"
                  class="flex-1 px-3 py-2 text-sm focus:outline-none font-mono"
                  @input="form.slug = form.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')"
                />
              </div>
              <p v-if="form.slug" class="text-xs text-gray-400 mt-1">
                {{ t('superAdmin.inviteLink') }}: <span class="font-mono text-brand-600">{{ origin }}/gym/{{ form.slug }}</span>
              </p>
            </div>

            <p v-if="createError" class="text-red-600 text-sm">
              {{ createError === 'slug_taken' ? t('superAdmin.slugTaken') : createError }}
            </p>

            <div class="flex gap-2 justify-end pt-2">
              <button class="btn-secondary" @click="closeCreate">{{ t('common.cancel') }}</button>
              <button class="btn-primary" :disabled="creating || !form.name || !form.slug" @click="doCreate">
                {{ creating ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useSuperAdminStore } from '@/stores/superAdmin'
import { useExercisesStore } from '@/stores/exercises'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t } = useI18n()
const router = useRouter()
const store  = useSuperAdminStore()
const exercisesStore = useExercisesStore()

const pendingCount = ref(0)

onMounted(async () => {
  store.subscribeGyms()
  const pending = await exercisesStore.fetchPendingProposals()
  pendingCount.value = pending.length
})
onUnmounted(() => store.unsubscribeGyms())

// ── Copy invite link ───────────────────────────────────────
const origin = window.location.origin
const copied = ref(null)

async function copyLink(slug) {
  await navigator.clipboard.writeText(`${origin}/gym/${slug}`)
  copied.value = slug
  setTimeout(() => { copied.value = null }, 2000)
}

// ── Create gym ─────────────────────────────────────────────
const showCreate  = ref(false)
const creating    = ref(false)
const createError = ref('')
const form        = ref({ name: '', slug: '' })

function autoSlug() {
  form.value.slug = form.value.name
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function closeCreate() {
  showCreate.value  = false
  createError.value = ''
  form.value        = { name: '', slug: '' }
}

async function doCreate() {
  creating.value    = true
  createError.value = ''
  try {
    const id = await store.createGym({ name: form.value.name, slug: form.value.slug })
    closeCreate()
    router.push({ name: 'SuperAdminGym', params: { id } })
  } catch (err) {
    createError.value = err.message
  } finally {
    creating.value = false
  }
}
</script>
