<template>
  <div class="space-y-4 pb-20">
    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold text-gray-900">{{ t('logger.title') }}</h2>
      <span class="text-xs text-gray-400">{{ todayFormatted }}</span>
    </div>

    <div v-if="!plansStore.todayPlan" class="card text-center py-10 text-gray-500">
      {{ t('logger.noWorkout') }}
    </div>

    <template v-else>
      <div v-for="(block, bi) in blocks" :key="bi">

        <!-- ── STRAIGHT block ─────────────────────────────── -->
        <div v-if="block.type === 'straight'" class="card space-y-4"
          :class="{ 'opacity-60': isExDone(block.exercises[0].exerciseId) }">
          <ExerciseCard
            :exercise="block.exercises[0]"
            :logs="logsStore.todayLogs"
            @log-set="handleLogSet"
            @mark-done="handleMarkDone"
          />
        </div>

        <!-- ── SUPERSET block ──────────────────────────────── -->
        <div v-else class="card space-y-3 border-2"
          :class="isBlockDone(block) ? 'border-indigo-100 opacity-60' : 'border-indigo-300'">

          <!-- Superset header -->
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-indigo-600 uppercase tracking-wide">
                {{ t('plans.superset') }}
              </span>
              <span class="text-xs text-indigo-400">
                {{ t('logger.round') }} {{ currentRound(block) }} / {{ block.rounds }}
              </span>
            </div>
            <span v-if="isBlockDone(block)"
              class="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
              {{ t('logger.completed') }}
            </span>
          </div>

          <!-- Each exercise in superset -->
          <div v-for="(ex, ei) in block.exercises" :key="ex.exerciseId"
            class="rounded-xl p-3 space-y-3 transition-colors"
            :class="isExDone(ex.exerciseId)
              ? 'bg-green-50 opacity-60'
              : activeExercise(block) === ex.exerciseId
                ? 'bg-indigo-50 ring-2 ring-indigo-300'
                : 'bg-gray-50'">

            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-indigo-400 w-5 shrink-0">
                {{ String.fromCharCode(65 + ei) }}
              </span>
              <h3 class="font-semibold text-gray-900 text-sm flex-1">
                {{ localField(ex.exerciseName ?? ex.name) }}
              </h3>
              <span class="text-xs text-gray-400">
                {{ block.rounds }}×{{ ex.targetReps }}
                <template v-if="ex.targetWeight"> @ {{ ex.targetWeight }}kg</template>
              </span>
              <span v-if="isExDone(ex.exerciseId)"
                class="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">✓</span>
            </div>

            <!-- Logged sets for this exercise -->
            <div v-if="loggedSets(ex.exerciseId).length" class="space-y-1">
              <div v-for="set in loggedSets(ex.exerciseId)" :key="set.setNumber"
                class="flex items-center gap-2 text-xs text-gray-600">
                <span class="text-gray-400 w-10">{{ t('logger.set', { n: set.setNumber }) }}</span>
                <span class="font-medium">{{ set.actualWeight }} kg × {{ set.actualReps }}</span>
                <span class="ms-auto text-green-500">✓</span>
              </div>
            </div>

            <!-- Log form — only for active exercise -->
            <template v-if="!isExDone(ex.exerciseId) && activeExercise(block) === ex.exerciseId">
              <div class="bg-white rounded-xl p-3 space-y-2">
                <p class="text-xs font-medium text-gray-600">
                  {{ t('logger.set', { n: nextSetNumber(ex.exerciseId) }) }}
                </p>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="text-xs text-gray-500">{{ t('logger.weight') }}</label>
                    <input v-model.number="getSetForm(ex.exerciseId, ex).weight"
                      type="number" min="0" step="0.5"
                      class="set-input" inputmode="decimal" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-gray-500">{{ t('logger.reps') }}</label>
                    <input v-model.number="getSetForm(ex.exerciseId, ex).reps"
                      type="number" min="1"
                      class="set-input" inputmode="numeric" />
                  </div>
                </div>
                <button class="btn-primary w-full text-sm"
                  :disabled="!canLogSet(ex.exerciseId) || pendingExercise === ex.exerciseId"
                  @click="handleLogSet(ex)">
                  <span v-if="pendingExercise === ex.exerciseId">{{ t('common.loading') }}</span>
                  <span v-else>{{ t('logger.logSet') }} →{{ nextInSuperset(block, ei) }}</span>
                </button>
              </div>
            </template>
          </div>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, reactive, defineComponent, h } from 'vue'
import { useI18n } from 'vue-i18n'
import { useWorkoutPlansStore }  from '@/stores/workoutPlans'
import { useTrainingLogsStore }  from '@/stores/trainingLogs'
import { useLocalField }         from '@/composables/useLocalField'
import { planToBlocks }          from '@/utils/planBlocks'
import { todayISO, formatDate }  from '@/utils/date'

const { t, locale } = useI18n()
const { localField } = useLocalField()
const plansStore = useWorkoutPlansStore()
const logsStore  = useTrainingLogsStore()

const todayFormatted = computed(() => formatDate(todayISO(), locale.value))

// Normalise plan to blocks (handles legacy plans with exercises[])
const blocks = computed(() => plansStore.todayPlan ? planToBlocks(plansStore.todayPlan) : [])

// ── Per-exercise set form state ────────────────────────────
const setForms = reactive({})
function getSetForm(exerciseId, exercise) {
  if (!setForms[exerciseId]) {
    setForms[exerciseId] = {
      weight: exercise?.targetWeight ?? 0,
      reps:   exercise?.targetReps   || '',
    }
  }
  return setForms[exerciseId]
}

// ── Log helpers ────────────────────────────────────────────
function loggedSets(exerciseId)  { return logsStore.todayLogs[exerciseId]?.sets ?? [] }
function nextSetNumber(exerciseId) { return loggedSets(exerciseId).length + 1 }
function isExDone(exerciseId)    { return !!logsStore.todayLogs[exerciseId]?.completedAt }
function canLogSet(exerciseId) {
  const f = getSetForm(exerciseId)
  return f.weight !== '' && !isNaN(Number(f.weight)) && Number(f.weight) >= 0 && Number(f.reps) > 0
}

// ── Superset helpers ───────────────────────────────────────
// How many full rounds completed (= min sets logged across all exercises)
function completedRounds(block) {
  return Math.min(...block.exercises.map((ex) => loggedSets(ex.exerciseId).length))
}
function currentRound(block) { return Math.min(completedRounds(block) + 1, block.rounds) }
function isBlockDone(block) {
  return block.exercises.every((ex) => isExDone(ex.exerciseId))
}
// Which exercise is "active" — the first one in the current round that hasn't been logged yet
function activeExercise(block) {
  const round = currentRound(block)
  const active = block.exercises.find((ex) => loggedSets(ex.exerciseId).length < round)
  return active?.exerciseId ?? null
}
// Label for "next →" in the log button
function nextInSuperset(block, currentIndex) {
  const nextIdx = (currentIndex + 1) % block.exercises.length
  return ` ${String.fromCharCode(65 + nextIdx)}`
}

// ── Pending state ──────────────────────────────────────────
const pendingExercise = ref(null)

async function handleLogSet(exercise) {
  if (!canLogSet(exercise.exerciseId)) return
  pendingExercise.value = exercise.exerciseId
  const form = getSetForm(exercise.exerciseId)
  try {
    await logsStore.logSet({
      planId:       plansStore.todayPlan.id,
      exerciseId:   exercise.exerciseId,
      exerciseName: localField(exercise.exerciseName ?? exercise.name),
      setNumber:    nextSetNumber(exercise.exerciseId),
      actualWeight: form.weight,
      actualReps:   form.reps,
    })

    // Auto-mark superset exercise done when all rounds logged
    // We check in the parent block
    blocks.value.forEach((block) => {
      if (block.type !== 'superset') return
      block.exercises.forEach(async (ex) => {
        if (ex.exerciseId !== exercise.exerciseId) return
        if (!isExDone(ex.exerciseId) && loggedSets(ex.exerciseId).length >= block.rounds) {
          await logsStore.markExerciseDone(ex.exerciseId)
        }
      })
    })
  } finally {
    pendingExercise.value = null
  }
}

async function handleMarkDone(exerciseId) {
  await logsStore.markExerciseDone(exerciseId)
}

// ── Inline ExerciseCard for straight blocks ────────────────
const ExerciseCard = defineComponent({
  props: ['exercise', 'logs'],
  emits: ['log-set', 'mark-done'],
  setup(props, { emit }) {
    const { t }          = useI18n()
    const { localField } = useLocalField()
    const setForms_      = reactive({})
    const pending        = ref(false)

    function getForm(id, ex) {
      if (!setForms_[id]) {
        setForms_[id] = {
          weight: ex?.targetWeight ?? 0,
          reps:   ex?.targetReps   || '',
        }
      }
      return setForms_[id]
    }
    function sets(id)  { return props.logs[id]?.sets ?? [] }
    function done(id)  { return !!props.logs[id]?.completedAt }
    function nextN(id) { return sets(id).length + 1 }
    function canLog(id) {
      const f = getForm(id)
      return f.weight !== '' && !isNaN(Number(f.weight)) && Number(f.weight) >= 0 && Number(f.reps) > 0
    }

    function toEmbedUrl(url) {
      if (!url) return ''
      if (url.includes('youtube.com/embed')) return url
      const m = url.match(/[?&]v=([^&]+)/) ?? url.match(/youtu\.be\/([^?]+)/)
      return m ? `https://www.youtube.com/embed/${m[1]}` : url
    }

    return () => {
      const ex   = props.exercise
      const exId = ex.exerciseId
      const form = getForm(exId, ex)
      const logged = sets(exId)
      const isDone = done(exId)

      return h('div', { class: 'space-y-4' }, [
        // Header
        h('div', { class: 'flex items-start justify-between gap-2' }, [
          h('div', {}, [
            h('h3', { class: 'font-semibold text-gray-900' }, localField(ex.exerciseName ?? ex.name)),
            h('p', { class: 'text-xs text-gray-500 mt-0.5' },
              `${t('logger.target')}: ${ex.targetSets} × ${ex.targetReps} @ ${ex.targetWeight} kg`),
          ]),
          isDone
            ? h('span', { class: 'badge bg-green-100 text-green-700 shrink-0 text-xs px-2 py-0.5 rounded-full' }, t('logger.completed'))
            : null,
        ]),

        // Video
        ex.videoUrl
          ? h('div', { class: 'rounded-xl overflow-hidden aspect-video bg-gray-100' },
              h('iframe', { src: toEmbedUrl(ex.videoUrl), class: 'w-full h-full', frameborder: '0', allowfullscreen: true, loading: 'lazy' }))
          : null,

        // Logged sets
        logged.length
          ? h('div', { class: 'space-y-1' },
              logged.map((s) =>
                h('div', { key: s.setNumber, class: 'flex items-center gap-2 text-sm text-gray-700' }, [
                  h('span', { class: 'w-12 text-gray-400 text-xs' }, t('logger.set', { n: s.setNumber })),
                  h('span', { class: 'font-medium' }, `${s.actualWeight} kg`),
                  h('span', { class: 'text-gray-400' }, '×'),
                  h('span', { class: 'font-medium' }, `${s.actualReps} reps`),
                  h('span', { class: 'ms-auto text-xs text-gray-400' }, '✓'),
                ])
              ))
          : null,

        // Form
        !isDone
          ? h('div', { class: 'bg-gray-50 rounded-xl p-3 space-y-3' }, [
              h('p', { class: 'text-xs font-medium text-gray-600' },
                `${t('logger.set', { n: nextN(exId) })} — ${t('logger.actual')}`),
              h('div', { class: 'grid grid-cols-2 gap-3' }, [
                h('div', { class: 'space-y-1' }, [
                  h('label', { class: 'text-xs text-gray-500' }, t('logger.weight')),
                  h('input', {
                    type: 'number', min: 0, step: 0.5,
                    inputmode: 'decimal',
                    class: 'set-input',
                    value: form.weight,
                    onInput: (e) => {
                      const v = e.target.value.trim()
                      form.weight = v === '' ? '' : parseFloat(v)
                    },
                  }),
                ]),
                h('div', { class: 'space-y-1' }, [
                  h('label', { class: 'text-xs text-gray-500' }, t('logger.reps')),
                  h('input', {
                    type: 'number', min: 1,
                    inputmode: 'numeric',
                    class: 'set-input',
                    value: form.reps,
                    onInput: (e) => {
                      const v = e.target.value.trim()
                      form.reps = v === '' ? '' : parseInt(v)
                    },
                  }),
                ]),
              ]),
              h('button', {
                class: 'btn-primary w-full',
                disabled: !canLog(exId) || pending.value,
                onClick: async () => {
                  if (!canLog(exId)) return
                  pending.value = true
                  try { emit('log-set', ex) }
                  finally { pending.value = false }
                },
              }, pending.value ? t('common.loading') : t('logger.logSet')),

              logged.length > 0
                ? h('button', {
                    class: 'btn-secondary w-full text-sm',
                    onClick: () => emit('mark-done', exId),
                  }, `${t('logger.markDone')} ✓`)
                : null,
            ])
          : null,
      ])
    }
  },
})

onMounted(() => {
  plansStore.subscribeToday()
  logsStore.subscribeToday()
})
onUnmounted(() => {
  plansStore.unsubscribeAll()
  logsStore.unsubscribeToday()
})
</script>
