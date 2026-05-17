<template>
  <main class="max-w-2xl mx-auto px-4 py-6 space-y-6">

    <div class="flex items-center justify-between">
      <h2 class="text-lg font-semibold">{{ t('builder.title') }}</h2>
      <button class="btn-primary text-sm" @click="openForm(null)">+ {{ t('builder.newWorkout') }}</button>
    </div>

    <AppSpinner v-if="plansStore.loading" />

    <!-- My plans list -->
    <div v-else class="space-y-3">
      <p v-if="!myPlans.length" class="text-center text-gray-400 text-sm py-8">
        {{ t('builder.noPlans') }}
      </p>
      <div v-for="plan in myPlans" :key="plan.id"
        class="card space-y-3 cursor-pointer hover:shadow-md transition"
        @click="openForm(plan)">
        <div class="flex items-center justify-between gap-2">
          <div>
            <p class="font-semibold text-sm">{{ dateRangeLabel(plan) }}</p>
            <p class="text-xs text-gray-400">{{ planToBlocks(plan).length }} {{ t('builder.blocks') }}</p>
          </div>
          <button class="btn-danger text-xs px-2 py-1 shrink-0" @click.stop="confirmDelete(plan)">
            {{ t('common.delete') }}
          </button>
        </div>

        <!-- Block summary -->
        <div class="space-y-1">
          <template v-for="(block, bi) in planToBlocks(plan).slice(0, 4)" :key="bi">
            <div v-if="block.type === 'superset'"
              class="text-xs text-indigo-500 font-medium ps-1">
              {{ t('plans.superset') }} · {{ block.rounds }} {{ t('plans.rounds') }}
            </div>
            <div v-for="ex in block.exercises" :key="ex.exerciseId"
              class="text-xs text-gray-600 rounded px-2 py-1 truncate"
              :class="block.type === 'superset' ? 'bg-indigo-50 ms-2' : 'bg-gray-50'">
              {{ localField(ex.exerciseName ?? ex.name) }}
            </div>
          </template>
          <p v-if="planToBlocks(plan).length > 4" class="text-xs text-gray-400 ps-2">
            +{{ planToBlocks(plan).length - 4 }} {{ t('plans.moreExercises') }}
          </p>
        </div>
      </div>
    </div>

    <!-- ── Form modal ─────────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="formOpen"
          class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="formOpen = false" />
          <form
            class="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto"
            @submit.prevent="handleSave">
            <h3 class="font-semibold">{{ editing ? t('builder.editWorkout') : t('builder.newWorkout') }}</h3>

            <!-- Date range -->
            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('plans.startDate') }}</label>
                <input v-model="form.startDate" type="date" class="input" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('plans.endDate') }}</label>
                <input v-model="form.endDate" type="date" class="input" required :min="form.startDate" />
              </div>
            </div>

            <!-- Blocks -->
            <div class="space-y-3">
              <label class="block text-xs font-medium text-gray-600">{{ t('plans.exercises') }}</label>

              <div v-for="(block, bi) in form.blocks" :key="bi"
                class="rounded-xl border p-3 space-y-2"
                :class="block.type === 'superset'
                  ? 'border-indigo-200 bg-indigo-50/40'
                  : 'border-gray-100 bg-gray-50'">

                <div class="flex items-center gap-2">
                  <span class="text-xs flex-1"
                    :class="block.type === 'superset' ? 'font-semibold text-indigo-600 uppercase tracking-wide' : 'text-gray-400'">
                    {{ block.type === 'superset' ? t('plans.superset') : t('plans.exercise') }}
                  </span>
                  <div v-if="block.type === 'superset'" class="flex items-center gap-1">
                    <label class="text-xs text-indigo-500">{{ t('plans.rounds') }}</label>
                    <input v-model.number="block.rounds" type="number" min="1" max="10"
                      class="input w-14 text-sm py-1 text-center" />
                  </div>
                  <button type="button" class="text-red-400 hover:text-red-600 text-lg leading-none"
                    @click="form.blocks.splice(bi, 1)">✕</button>
                </div>

                <div v-for="(ex, ei) in block.exercises" :key="ei" class="space-y-2">
                  <div class="flex items-center gap-2">
                    <span v-if="block.type === 'superset'"
                      class="text-xs font-bold text-indigo-400 w-5 shrink-0">
                      {{ String.fromCharCode(65 + ei) }}
                    </span>
                    <ExercisePicker
                      v-model="ex.exerciseId"
                      :error="showErrors && !ex.exerciseId"
                      class="flex-1"
                      @select="(e) => { if (e) { ex.exerciseName = e.name; ex.videoUrl = e.videoUrl ?? '' } }"
                    />
                    <button v-if="block.type === 'superset' && block.exercises.length > 2"
                      type="button" class="text-red-300 hover:text-red-500 text-sm"
                      @click="block.exercises.splice(ei, 1)">✕</button>
                  </div>
                  <div class="grid gap-2" :class="block.type === 'straight' ? 'grid-cols-3' : 'grid-cols-2'">
                    <div v-if="block.type === 'straight'">
                      <label class="text-xs text-gray-400">{{ t('plans.targetSets') }}</label>
                      <input v-model.number="ex.targetSets" type="number" min="1" class="input" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-400">{{ t('plans.targetReps') }}</label>
                      <input v-model.number="ex.targetReps" type="number" min="1" class="input" />
                    </div>
                    <div>
                      <label class="text-xs text-gray-400">{{ t('plans.targetWeight') }} (kg)</label>
                      <input v-model.number="ex.targetWeight" type="number" min="0" step="0.5" class="input" />
                    </div>
                  </div>
                </div>

                <button v-if="block.type === 'superset' && block.exercises.length < 3"
                  type="button" class="text-xs text-indigo-500 hover:text-indigo-700 underline"
                  @click="block.exercises.push(emptyExercise())">
                  + {{ t('plans.addToSuperset') }}
                </button>
              </div>

              <div class="flex gap-2">
                <button type="button" class="btn-secondary flex-1 text-sm" @click="form.blocks.push(emptyStraightBlock())">
                  + {{ t('plans.addExercise') }}
                </button>
                <button type="button"
                  class="flex-1 text-sm px-4 py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
                  @click="form.blocks.push(emptySupersetBlock())">
                  + {{ t('plans.addSuperset') }}
                </button>
              </div>
            </div>

            <p v-if="formError" class="text-red-600 text-xs">{{ formError }}</p>

            <div class="flex gap-3 pt-1">
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
import { useWorkoutPlansStore } from '@/stores/workoutPlans'
import { useExercisesStore }    from '@/stores/exercises'
import { useAuthStore }         from '@/stores/auth'
import { useLocalField }        from '@/composables/useLocalField'
import { planToBlocks, emptyStraightBlock, emptySupersetBlock, emptyExercise } from '@/utils/planBlocks'
import { todayISO } from '@/utils/date'
import AppSpinner    from '@/components/shared/AppSpinner.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import ExercisePicker from '@/components/shared/ExercisePicker.vue'

const { t }          = useI18n()
const { localField } = useLocalField()
const plansStore     = useWorkoutPlansStore()
const exercisesStore = useExercisesStore()
const auth           = useAuthStore()

const myPlans = computed(() =>
  plansStore.allPlans.filter((p) => p.userId === auth.user?.uid)
)

function dateRangeLabel(plan) {
  if (plan.startDate && plan.endDate && plan.startDate !== plan.endDate)
    return `${plan.startDate} → ${plan.endDate}`
  return plan.startDate ?? plan.date ?? '—'
}

// ── Form ──────────────────────────────────────────────────
const formOpen   = ref(false)
const editing    = ref(null)
const submitting = ref(false)
const formError  = ref('')
const showErrors = ref(false)
const form = reactive({ startDate: todayISO(), endDate: todayISO(), blocks: [] })

function openForm(plan) {
  editing.value    = plan
  formError.value  = ''
  showErrors.value = false
  if (plan) {
    form.startDate = plan.startDate ?? plan.date ?? todayISO()
    form.endDate   = plan.endDate   ?? plan.date ?? todayISO()
    form.blocks    = planToBlocks(plan).map((b) => ({ ...b, exercises: b.exercises.map((ex) => ({ ...ex })) }))
  } else {
    form.startDate = todayISO()
    form.endDate   = todayISO()
    form.blocks    = []
  }
  formOpen.value = true
}

function cleanBlock(block) {
  const exercises = block.exercises.map((ex) => ({
    exerciseId:   ex.exerciseId,
    exerciseName: ex.exerciseName ?? ex.name ?? '',
    videoUrl:     ex.videoUrl ?? '',
    targetSets:   Number(ex.targetSets)   || 3,
    targetReps:   Number(ex.targetReps)   || 10,
    targetWeight: Number(ex.targetWeight) || 0,
  }))
  return block.type === 'superset'
    ? { type: 'superset', rounds: Number(block.rounds) || 3, exercises }
    : { type: 'straight', exercises }
}

async function handleSave() {
  formError.value = ''
  if (!form.blocks.length) { formError.value = t('plans.errorNoExercises'); return }
  const hasEmpty = form.blocks.some((b) => b.exercises.some((ex) => !ex.exerciseId))
  if (hasEmpty) { showErrors.value = true; formError.value = t('plans.errorFillExercises'); return }
  showErrors.value = false

  submitting.value = true
  try {
    const payload = {
      startDate: form.startDate,
      endDate:   form.endDate,
      blocks:    form.blocks.map(cleanBlock),
    }
    if (editing.value) {
      await plansStore.updatePlan(editing.value.id, { ...payload, userId: editing.value.userId, userName: editing.value.userName })
    } else {
      await plansStore.saveSelfPlan(payload)
    }
    formOpen.value = false
  } catch (err) {
    formError.value = err.message
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────
const deleteOpen   = ref(false)
const toDelete     = ref(null)
function confirmDelete(plan) { toDelete.value = plan; deleteOpen.value = true }
async function handleDelete() {
  deleteOpen.value = false
  await plansStore.deletePlan(toDelete.value.id)
}

onMounted(() => {
  exercisesStore.subscribe()
  plansStore.subscribeAll()
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
