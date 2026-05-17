<template>
  <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">

    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-lg font-semibold">{{ t('exercises.import.title') }}</h1>
        <p class="text-sm text-gray-400">{{ t('exercises.import.hint') }}</p>
      </div>
      <router-link to="/superadmin" class="btn-secondary text-sm">← {{ t('common.back') }}</router-link>
    </div>

    <!-- Input tabs -->
    <div class="card space-y-4">
      <div class="flex gap-2 border-b border-gray-100 pb-3">
        <button
          v-for="tab in ['paste', 'upload']" :key="tab"
          class="text-sm px-3 py-1 rounded-lg font-medium transition-colors"
          :class="activeTab === tab ? 'bg-brand-600 text-white' : 'text-gray-500 hover:bg-gray-100'"
          @click="activeTab = tab"
        >
          {{ t(`exercises.import.tab_${tab}`) }}
        </button>
      </div>

      <!-- Paste JSON -->
      <div v-if="activeTab === 'paste'" class="space-y-3">
        <textarea
          v-model="rawJson"
          class="input font-mono text-xs"
          rows="12"
          :placeholder="t('exercises.import.pastePlaceholder')"
          @input="parseJson"
        />
      </div>

      <!-- Upload file -->
      <div v-else class="space-y-3">
        <label
          class="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-colors"
        >
          <span class="text-2xl">📂</span>
          <span class="text-sm text-gray-500">{{ t('exercises.import.uploadHint') }}</span>
          <span class="text-xs text-gray-400">JSON</span>
          <input type="file" accept=".json,application/json" class="sr-only" @change="handleFile" />
        </label>
        <p v-if="fileName" class="text-xs text-gray-500 text-center">📄 {{ fileName }}</p>
      </div>

      <!-- Parse error -->
      <p v-if="parseError" class="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
        {{ parseError }}
      </p>
    </div>

    <!-- Preview -->
    <div v-if="parsed.length > 0" class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="font-semibold text-sm">
          {{ t('exercises.import.preview', { count: parsed.length }) }}
        </h2>
        <button
          class="btn-primary text-sm"
          :disabled="importing"
          @click="runImport"
        >
          {{ importing ? t('common.loading') : t('exercises.import.importBtn', { count: parsed.length }) }}
        </button>
      </div>

      <div class="space-y-2">
        <div
          v-for="(ex, i) in parsed" :key="ex.id ?? i"
          class="flex items-start gap-3 p-3 rounded-xl border text-sm"
          :class="resultFor(ex.id)?.ok === false ? 'border-red-200 bg-red-50'
                : resultFor(ex.id)?.ok === true  ? 'border-green-200 bg-green-50'
                : validationError(ex)             ? 'border-amber-200 bg-amber-50'
                : 'border-gray-100 bg-white'"
        >
          <!-- Status icon -->
          <span class="shrink-0 mt-0.5 text-base">
            <template v-if="resultFor(ex.id)?.ok === true">✓</template>
            <template v-else-if="resultFor(ex.id)?.ok === false">✗</template>
            <template v-else-if="validationError(ex)">⚠</template>
            <template v-else>·</template>
          </span>

          <!-- Info -->
          <div class="flex-1 min-w-0 space-y-0.5">
            <p class="font-medium truncate">
              <span class="text-gray-400 font-mono text-xs me-2">{{ ex.id }}</span>
              {{ displayName(ex) }}
            </p>
            <div class="flex flex-wrap gap-1 mt-1">
              <span v-if="ex.difficulty" :class="difficultyClass(ex.difficulty)" class="text-xs px-1.5 py-0.5 rounded-full font-medium">
                {{ t(`exercises.difficultyLevels.${ex.difficulty}`) }}
              </span>
              <span v-for="part in (ex.bodyParts ?? [])" :key="part"
                class="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
                {{ t(`exercises.parts.${part}`) }}
              </span>
              <span v-if="ex.calisthenics" class="text-xs px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">
                {{ t('exercises.calisthenics') }}
              </span>
            </div>
            <p v-if="validationError(ex)" class="text-xs text-amber-700 mt-1">{{ validationError(ex) }}</p>
            <p v-if="resultFor(ex.id)?.error" class="text-xs text-red-700 mt-1">{{ resultFor(ex.id).error }}</p>
          </div>
        </div>
      </div>

      <!-- Summary after import -->
      <div v-if="results.length > 0" class="card text-sm space-y-1">
        <p class="font-semibold">{{ t('exercises.import.done') }}</p>
        <p class="text-green-600">✓ {{ results.filter(r => r.ok).length }} {{ t('exercises.import.success') }}</p>
        <p v-if="results.some(r => !r.ok)" class="text-red-600">
          ✗ {{ results.filter(r => !r.ok).length }} {{ t('exercises.import.failed') }}
        </p>
      </div>
    </div>

  </main>
</template>

<script setup>
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExercisesStore } from '@/stores/exercises'

const { t, locale } = useI18n()
const store = useExercisesStore()

const activeTab  = ref('paste')
const rawJson    = ref('')
const fileName   = ref('')
const parseError = ref('')
const parsed     = ref([])
const importing  = ref(false)
const results    = ref([])

const DIFFICULTY_STYLES = {
  beginner:     'bg-green-50 text-green-700 border border-green-200',
  intermediate: 'bg-amber-50 text-amber-700 border border-amber-200',
  advanced:     'bg-red-50 text-red-700 border border-red-200',
}
function difficultyClass(level) { return DIFFICULTY_STYLES[level] ?? '' }

function displayName(ex) {
  if (!ex.name) return '—'
  if (typeof ex.name === 'string') return ex.name
  return ex.name[locale.value] ?? ex.name.en ?? ex.name.he ?? Object.values(ex.name)[0] ?? '—'
}

function validationError(ex) {
  if (!ex.id) return t('exercises.import.errNoId')
  if (!ex.name || (typeof ex.name === 'object' && !Object.keys(ex.name).length))
    return t('exercises.import.errNoName')
  return null
}

function resultFor(id) {
  return results.value.find(r => r.id === id) ?? null
}

function tryParse(text) {
  parseError.value = ''
  parsed.value     = []
  results.value    = []
  const trimmed = text.trim()
  if (!trimmed) return

  let data
  try { data = JSON.parse(trimmed) } catch (e) {
    parseError.value = `JSON invalide : ${e.message}`
    return
  }

  const items = Array.isArray(data) ? data : [data]
  if (items.length === 0) { parseError.value = t('exercises.import.errEmpty'); return }
  parsed.value = items
}

function parseJson() { tryParse(rawJson.value) }

function handleFile(e) {
  const file = e.target.files?.[0]
  if (!file) return
  fileName.value = file.name
  const reader = new FileReader()
  reader.onload = (ev) => {
    rawJson.value = ev.target.result
    tryParse(rawJson.value)
  }
  reader.readAsText(file)
}

async function runImport() {
  const valid = parsed.value.filter(ex => !validationError(ex))
  if (!valid.length) return
  importing.value = true
  try {
    results.value = await store.importGlobalExercises(valid)
  } finally {
    importing.value = false
  }
}
</script>
