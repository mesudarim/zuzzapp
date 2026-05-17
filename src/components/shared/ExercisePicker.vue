<template>
  <div ref="root">
    <!-- Trigger: shows selected name or placeholder -->
    <div
      class="input flex items-center gap-2 cursor-pointer min-h-[2.5rem]"
      :class="error ? 'border-red-400 ring-1 ring-red-300 bg-red-50' : ''"
      @click="toggle"
    >
      <span
        class="flex-1 text-sm truncate"
        :class="selectedExercise ? 'text-gray-900' : 'text-gray-400'"
      >
        {{ selectedExercise ? localField(selectedExercise.name) : t('exercises.searchPlaceholder') }}
      </span>
      <button
        v-if="modelValue"
        type="button"
        class="text-gray-300 hover:text-gray-500 shrink-0 leading-none"
        @click.stop="clear"
      >✕</button>
      <span class="text-gray-400 text-[10px] shrink-0">{{ open ? '▲' : '▼' }}</span>
    </div>

    <!-- Inline expandable panel -->
    <div v-if="open" class="mt-1 border border-gray-200 rounded-xl bg-white shadow-md overflow-hidden">

      <!-- Search input -->
      <div class="p-2">
        <input
          ref="searchInput"
          v-model="query"
          class="input text-sm w-full"
          :placeholder="t('exercises.searchPlaceholder')"
          @keydown.esc="open = false"
        />
      </div>

      <!-- Filter chips -->
      <div class="px-2 pb-2 flex flex-wrap gap-1">
        <button
          v-for="g in filterGroups"
          :key="g.key"
          type="button"
          class="px-2 py-0.5 rounded-full text-xs font-medium transition-colors border"
          :class="activeGroup === g.key
            ? 'bg-brand-600 text-white border-brand-600'
            : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300 hover:text-brand-600'"
          @click="activeGroup = g.key"
        >{{ g.label }}</button>

        <button
          type="button"
          class="px-2 py-0.5 rounded-full text-xs font-medium transition-colors border"
          :class="onlyCalisthenics
            ? 'bg-indigo-600 text-white border-indigo-600'
            : 'bg-white text-gray-500 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'"
          @click="onlyCalisthenics = !onlyCalisthenics"
        >{{ t('exercises.calisthenics') }}</button>
      </div>

      <!-- Results list -->
      <div class="border-t border-gray-100 max-h-44 overflow-y-auto">
        <p v-if="!filteredExercises.length" class="px-3 py-3 text-xs text-gray-400 text-center">
          {{ t('exercises.noResults') }}
        </p>
        <div
          v-for="ex in filteredExercises"
          :key="ex.id"
          class="px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-brand-50 transition-colors"
          :class="ex.id === modelValue ? 'bg-brand-50 font-medium' : ''"
          @mousedown.prevent="pick(ex)"
        >
          <span class="flex-1 text-sm truncate">{{ localField(ex.name) }}</span>
          <span v-if="ex.calisthenics" class="text-indigo-400 text-xs shrink-0">✦</span>
          <span
            v-if="ex.difficulty"
            class="text-xs shrink-0 font-medium"
            :class="ex.difficulty === 'beginner' ? 'text-green-500' : ex.difficulty === 'advanced' ? 'text-red-500' : 'text-orange-400'"
          >{{ t(`exercises.difficultyLevels.${ex.difficulty}`).slice(0, 3) }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useExercisesStore } from '@/stores/exercises'
import { useLocalField } from '@/composables/useLocalField'

const props = defineProps({
  modelValue: { type: String, default: '' },
  error:      { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'select'])

const { t }          = useI18n()
const { localField } = useLocalField()
const store          = useExercisesStore()

const open             = ref(false)
const query            = ref('')
const activeGroup      = ref('all')
const onlyCalisthenics = ref(false)
const root             = ref(null)
const searchInput      = ref(null)

const GROUP_PARTS = {
  upper:    ['chest', 'back', 'shoulders', 'arms', 'biceps', 'triceps', 'forearms'],
  core:     ['core', 'abs'],
  legs:     ['legs', 'quads', 'hamstrings', 'glutes', 'calves'],
  fullBody: ['fullBody'],
}

const filterGroups = computed(() => [
  { key: 'all',      label: t('exercises.filterAll') },
  { key: 'upper',    label: t('exercises.parts.upperBody') },
  { key: 'core',     label: t('exercises.parts.core') },
  { key: 'legs',     label: t('exercises.parts.legs') },
  { key: 'fullBody', label: t('exercises.parts.fullBody') },
])

const selectedExercise = computed(() =>
  props.modelValue ? store.exercises.find((e) => e.id === props.modelValue) : null
)

const filteredExercises = computed(() => {
  let list = store.exercises
  if (query.value.trim()) {
    const q = query.value.toLowerCase()
    list = list.filter((e) => localField(e.name).toLowerCase().includes(q))
  }
  if (activeGroup.value !== 'all') {
    const parts = GROUP_PARTS[activeGroup.value]
    list = list.filter((e) => e.bodyParts?.some((p) => parts.includes(p)))
  }
  if (onlyCalisthenics.value) {
    list = list.filter((e) => e.calisthenics)
  }
  return list
})

async function toggle() {
  open.value = !open.value
  if (open.value) {
    query.value = ''
    await nextTick()
    searchInput.value?.focus()
  }
}

function pick(ex) {
  emit('update:modelValue', ex.id)
  emit('select', ex)
  open.value = false
  query.value = ''
}

function clear() {
  emit('update:modelValue', '')
  emit('select', null)
}

function onClickOutside(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false
}

onMounted(() => document.addEventListener('mousedown', onClickOutside))
onUnmounted(() => document.removeEventListener('mousedown', onClickOutside))
</script>
