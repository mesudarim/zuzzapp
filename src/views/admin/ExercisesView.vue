<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">{{ t('exercises.title') }}</h2>
      <button class="btn-primary" @click="openForm(null)">+ {{ t('exercises.addNew') }}</button>
    </div>

    <AppSpinner v-if="store.loading" />

    <template v-else>
    <!-- ── Filters ────────────────────────────────────────────── -->
    <div class="space-y-3">
      <!-- Search -->
      <input
        v-model="filterName"
        class="input"
        :placeholder="t('exercises.searchPlaceholder')"
      />

      <!-- Body part chips -->
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="part in BODY_PARTS" :key="part"
          class="text-xs px-2.5 py-1 rounded-full border font-medium transition-colors"
          :class="filterParts.includes(part)
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-white text-gray-500 border-gray-200 hover:border-brand-400'"
          @click="togglePart(part)"
        >
          {{ t(`exercises.parts.${part}`) }}
        </button>
      </div>

      <!-- Calisthenics toggle + clear -->
      <div class="flex items-center gap-3">
        <button
          class="text-xs px-3 py-1 rounded-full border font-medium transition-colors"
          :class="filterCalisthenics
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-400'"
          @click="filterCalisthenics = !filterCalisthenics"
        >
          {{ t('exercises.calisthenics') }}
        </button>
        <button
          v-if="filterName || filterParts.length || filterCalisthenics"
          class="text-xs text-gray-400 hover:text-gray-600 underline"
          @click="clearFilters"
        >
          {{ t('exercises.clearFilters') }}
        </button>
        <span class="text-xs text-gray-400 ms-auto">
          {{ filteredExercises.length }} / {{ store.exercises.length }}
        </span>
      </div>
    </div>

    <!-- ── Exercise grid ───────────────────────────────────────── -->
    <div class="grid gap-3 sm:grid-cols-2">
      <p v-if="filteredExercises.length === 0" class="col-span-2 text-center text-gray-400 text-sm py-8">
        {{ t('exercises.noResults') }}
      </p>
      <div v-for="ex in filteredExercises" :key="ex.id" class="card space-y-2">
        <div class="flex items-start justify-between gap-2">
          <div class="flex items-center gap-2 min-w-0">
            <p class="font-semibold truncate">{{ localField(ex.name) }}</p>
            <!-- Scope badge -->
            <span
              v-if="ex._scope === 'global'"
              class="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-brand-50 text-brand-600 font-medium border border-brand-100"
            >🌍</span>
            <span
              v-else-if="ex.status === 'pending'"
              class="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 font-medium border border-amber-200"
            >⏳ {{ t('exercises.pending') }}</span>
            <span
              v-else-if="ex.status === 'rejected'"
              class="shrink-0 text-xs px-1.5 py-0.5 rounded-full bg-red-50 text-red-500 font-medium border border-red-200"
            >✗ {{ t('exercises.rejected') }}</span>
          </div>
          <!-- Only editable if it belongs to this gym (not global) -->
          <div v-if="ex._scope !== 'global'" class="flex gap-1 shrink-0">
            <button class="btn-secondary text-xs px-2 py-1" @click="openForm(ex)">{{ t('common.edit') }}</button>
            <button class="btn-danger text-xs px-2 py-1" @click="confirmDelete(ex)">{{ t('common.delete') }}</button>
          </div>
        </div>
        <p class="text-xs text-gray-500 line-clamp-2">{{ localField(ex.description) }}</p>
        <!-- Difficulty badge -->
        <span v-if="ex.difficulty" :class="difficultyClass(ex.difficulty)" class="inline-block text-xs px-2 py-0.5 rounded-full font-medium w-fit">
          {{ t(`exercises.difficultyLevels.${ex.difficulty}`) }}
        </span>
        <!-- Body part tags + calisthenics -->
        <div v-if="(ex.bodyParts && ex.bodyParts.length) || ex.calisthenics" class="flex flex-wrap gap-1">
          <span
            v-for="part in (ex.bodyParts ?? [])" :key="part"
            class="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium"
          >{{ t(`exercises.parts.${part}`) }}</span>
          <span
            v-if="ex.calisthenics"
            class="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 font-medium border border-indigo-100"
          >{{ t('exercises.calisthenics') }}</span>
        </div>
        <a v-if="ex.videoUrl" :href="toWatchUrl(ex.videoUrl)" target="_blank" rel="noopener"
           class="text-xs text-brand-600 hover:underline flex items-center gap-1">
          ▶ {{ t('exercises.watchVideo') }}
        </a>
      </div>
    </div>
    </template>

    <!-- ── Form modal ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="formOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40" @click="formOpen = false" />
          <form
            class="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10"
            @submit.prevent="handleSubmit"
          >
            <h3 class="font-semibold">{{ editing ? t('exercises.editExercise') : t('exercises.addNew') }}</h3>

            <div>
              <label class="text-xs text-gray-600 mb-1 block">{{ t('exercises.name') }}</label>
              <input v-model="form.name" class="input" required />
            </div>
            <div>
              <label class="text-xs text-gray-600 mb-1 block">{{ t('exercises.description') }}</label>
              <textarea v-model="form.description" class="input" rows="3" />
            </div>
            <div>
              <label class="text-xs text-gray-600 mb-1 block">{{ t('exercises.videoUrl') }}</label>
              <input v-model="form.videoUrl" class="input" type="url" />
            </div>

            <!-- Difficulty -->
            <div>
              <label class="text-xs text-gray-600 mb-2 block">{{ t('exercises.difficulty') }}</label>
              <div class="flex gap-2">
                <label
                  v-for="level in DIFFICULTY_LEVELS" :key="level"
                  class="flex-1 flex items-center justify-center gap-1.5 p-2 rounded-xl border cursor-pointer select-none transition-colors"
                  :class="form.difficulty === level ? difficultyClass(level) + ' border-transparent' : 'border-gray-200 text-gray-500 hover:bg-gray-50'"
                >
                  <input type="radio" :value="level" v-model="form.difficulty" class="sr-only" />
                  <span class="text-sm font-medium">{{ t(`exercises.difficultyLevels.${level}`) }}</span>
                </label>
              </div>
            </div>

            <!-- Body parts -->
            <div>
              <label class="text-xs text-gray-600 mb-2 block">{{ t('exercises.bodyParts') }}</label>
              <div class="flex flex-wrap gap-2">
                <label
                  v-for="part in BODY_PARTS" :key="part"
                  class="flex items-center gap-1.5 cursor-pointer select-none"
                >
                  <input
                    type="checkbox"
                    :value="part"
                    v-model="form.bodyParts"
                    class="accent-brand-600"
                  />
                  <span class="text-sm">{{ t(`exercises.parts.${part}`) }}</span>
                </label>
              </div>
            </div>

            <!-- Calisthenics -->
            <label class="flex items-start gap-3 p-3 rounded-xl border border-indigo-100 bg-indigo-50 cursor-pointer">
              <input v-model="form.calisthenics" type="checkbox" class="mt-0.5 accent-indigo-600" />
              <div>
                <p class="text-sm font-medium text-indigo-700">{{ t('exercises.calisthenics') }}</p>
                <p class="text-xs text-indigo-500 mt-0.5">{{ t('exercises.calisthenicsHint') }}</p>
              </div>
            </label>

            <!-- Propose global (new exercises only) -->
            <label v-if="!editing" class="flex items-start gap-3 p-3 rounded-xl border border-brand-100 bg-brand-50 cursor-pointer">
              <input v-model="form.proposeGlobal" type="checkbox" class="mt-0.5 accent-brand-600" />
              <div>
                <p class="text-sm font-medium text-brand-700">{{ t('exercises.proposeGlobal') }}</p>
                <p class="text-xs text-brand-500 mt-0.5">{{ t('exercises.proposeGlobalHint') }}</p>
              </div>
            </label>

            <div class="flex gap-3 pt-2">
              <button type="button" class="btn-secondary flex-1" @click="formOpen = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn-primary flex-1" :disabled="submitting">
                {{ submitting ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog v-model="deleteOpen" @confirm="handleDelete" />
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExercisesStore } from '@/stores/exercises'
import { useLocalField } from '@/composables/useLocalField'
import AppSpinner    from '@/components/shared/AppSpinner.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const { t } = useI18n()
const { localField } = useLocalField()
const store = useExercisesStore()

const BODY_PARTS       = ['upperBody', 'chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps', 'forearms', 'core', 'abs', 'legs', 'quads', 'hamstrings', 'glutes', 'calves', 'fullBody']
const DIFFICULTY_LEVELS = ['beginner', 'intermediate', 'advanced']

const DIFFICULTY_STYLES = {
  beginner:     'bg-green-50 text-green-700 border border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border border-amber-200',
  advanced:     'bg-red-50 text-red-700 border border-red-200',
}
function difficultyClass(level) { return DIFFICULTY_STYLES[level] ?? '' }

function toWatchUrl(url) {
  if (!url) return url
  // /embed/ID → /watch?v=ID
  const m = url.match(/youtube\.com\/embed\/([^?&]+)/)
  if (m) return `https://www.youtube.com/watch?v=${m[1]}`
  return url
}

// ── Filters ───────────────────────────────────────────────
const filterName        = ref('')
const filterParts       = ref([])
const filterCalisthenics = ref(false)

function togglePart(part) {
  const idx = filterParts.value.indexOf(part)
  if (idx === -1) filterParts.value.push(part)
  else filterParts.value.splice(idx, 1)
}

function clearFilters() {
  filterName.value        = ''
  filterParts.value       = []
  filterCalisthenics.value = false
}

const filteredExercises = computed(() => {
  const q    = filterName.value.trim().toLowerCase()
  const parts = filterParts.value
  return store.exercises.filter((ex) => {
    if (filterCalisthenics.value && !ex.calisthenics) return false
    if (parts.length && !parts.some(p => ex.bodyParts?.includes(p))) return false
    if (q) {
      const name = typeof ex.name === 'string'
        ? ex.name
        : Object.values(ex.name ?? {}).join(' ')
      if (!name.toLowerCase().includes(q)) return false
    }
    return true
  })
})

const formOpen   = ref(false)
const editing    = ref(null)
const submitting = ref(false)
const form = reactive({
  name: '', description: '', videoUrl: '',
  difficulty: '', bodyParts: [], calisthenics: false, proposeGlobal: false,
})

function openForm(ex) {
  editing.value = ex
  Object.assign(form, ex
    ? {
        name: ex.name, description: ex.description ?? '', videoUrl: ex.videoUrl ?? '',
        difficulty: ex.difficulty ?? '',
        bodyParts: ex.bodyParts ? [...ex.bodyParts] : [],
        calisthenics: ex.calisthenics ?? false,
        proposeGlobal: false,
      }
    : { name: '', description: '', videoUrl: '', difficulty: '', bodyParts: [], calisthenics: false, proposeGlobal: false }
  )
  formOpen.value = true
}

async function handleSubmit() {
  submitting.value = true
  try {
    const payload = {
      name: form.name,
      description: form.description,
      videoUrl: form.videoUrl,
      difficulty: form.difficulty,
      bodyParts: [...form.bodyParts],
      calisthenics: form.calisthenics,
    }
    if (editing.value) {
      await store.updateExercise(editing.value.id, payload)
    } else {
      await store.addExercise(payload, form.proposeGlobal)
    }
    formOpen.value = false
  } finally { submitting.value = false }
}

const deleteOpen = ref(false)
const toDelete   = ref(null)
function confirmDelete(ex) { toDelete.value = ex; deleteOpen.value = true }
async function handleDelete() { deleteOpen.value = false; await store.deleteExercise(toDelete.value.id) }

onMounted(() => store.subscribe())
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
