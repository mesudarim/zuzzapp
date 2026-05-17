<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-5">

    <!-- ── Header ─────────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-3">
      <h2 class="text-lg font-semibold text-gray-900 flex-1">{{ t('plans.title') }}</h2>
      <button class="btn-primary shrink-0" @click="openNew">+ {{ t('plans.newPlan') }}</button>
    </div>

    <!-- ── Filters + view toggle ──────────────────────────── -->
    <div class="flex flex-wrap gap-2 items-center">
      <!-- Filter: member -->
      <select v-model="filterMember" class="input max-w-[180px] text-sm">
        <option value="">{{ t('plans.allMembers') }}</option>
        <option v-for="u in allUsers" :key="u.uid" :value="u.uid">{{ u.name }}</option>
      </select>

      <!-- Filter: exercise -->
      <select v-model="filterExercise" class="input max-w-[180px] text-sm">
        <option value="">{{ t('plans.allExercises') }}</option>
        <option v-for="ex in allExerciseNames" :key="ex" :value="ex">{{ ex }}</option>
      </select>

      <!-- Clear filters -->
      <button
        v-if="filterMember || filterExercise"
        class="text-xs text-brand-600 hover:underline"
        @click="filterMember = ''; filterExercise = ''"
      >✕ {{ t('common.cancel') }}</button>

      <!-- View toggle -->
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 ms-auto shrink-0">
        <button
          v-for="v in viewOptions" :key="v.key" type="button"
          class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          :class="viewMode === v.key
            ? 'bg-white text-gray-900 shadow-sm'
            : 'text-gray-500 hover:text-gray-700'"
          @click="viewMode = v.key"
        >{{ v.icon }}</button>
      </div>
    </div>

    <!-- ── Count ──────────────────────────────────────────── -->
    <p class="text-xs text-gray-400">
      {{ filtered.length }} {{ t('plans.planCount') }}
    </p>

    <AppSpinner v-if="plansStore.loading" />

    <!-- ════ LIST VIEW ════════════════════════════════════════ -->
    <div v-else-if="viewMode === 'list'" class="space-y-3">
      <div
        v-for="plan in filtered" :key="plan.id"
        class="card space-y-3 cursor-pointer hover:shadow-md transition"
        @click="openEdit(plan)"
      >
        <!-- Plan header -->
        <div class="flex items-center gap-3">
          <!-- Member avatar -->
          <img
            v-if="userMap[plan.userId]?.photoURL"
            :src="userMap[plan.userId].photoURL"
            class="w-9 h-9 rounded-full object-cover shrink-0"
          />
          <div v-else class="w-9 h-9 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 shrink-0 text-sm">
            {{ (userMap[plan.userId]?.name ?? plan.userName ?? '?')[0] }}
          </div>

          <div class="flex-1 min-w-0">
            <p class="font-semibold text-sm truncate">
              {{ userMap[plan.userId]?.name ?? plan.userName ?? plan.userId }}
            </p>
            <p class="text-xs text-gray-400">
              {{ dateRangeLabel(plan) }}
              <span v-if="plan.updatedAt" class="ms-2 text-gray-300">
                · {{ t('plans.updated') }} {{ formatUpdatedAt(plan.updatedAt) }}
              </span>
            </p>
          </div>

          <!-- Actions -->
          <div class="flex gap-1 shrink-0" @click.stop>
            <button
              class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition font-medium"
              @click="openClone(plan)"
              :title="t('plans.clone')"
            >⧉</button>
            <button
              class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition font-medium"
              @click="confirmDelete(plan)"
            >✕</button>
          </div>
        </div>

        <!-- Block list -->
        <div class="space-y-1">
          <template v-for="(block, bi) in planToBlocks(plan)" :key="bi">
            <!-- Superset label -->
            <div v-if="block.type === 'superset'" class="flex items-center gap-1 pt-1">
              <span class="text-xs font-semibold text-indigo-600 uppercase tracking-wide">{{ t('plans.superset') }}</span>
              <span class="text-xs text-gray-400">· {{ block.rounds }} {{ t('plans.rounds') }}</span>
            </div>
            <div
              v-for="ex in block.exercises" :key="ex.exerciseId"
              class="flex items-center gap-2 text-sm rounded-lg px-3 py-1.5"
              :class="block.type === 'superset' ? 'bg-indigo-50 ms-2' : 'bg-gray-50'"
            >
              <span class="flex-1 truncate text-gray-700">{{ localField(ex.exerciseName ?? ex.name) }}</span>
              <span class="text-xs text-gray-400 shrink-0">
                <template v-if="block.type === 'straight'">{{ ex.targetSets }}×</template>{{ ex.targetReps }}
                <template v-if="ex.targetWeight"> @ {{ ex.targetWeight }}kg</template>
              </span>
            </div>
          </template>
        </div>
      </div>

      <p v-if="!filtered.length" class="text-center text-gray-400 text-sm py-8">{{ t('plans.noPlans') }}</p>
    </div>

    <!-- ════ CARD VIEW ════════════════════════════════════════ -->
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="plan in filtered" :key="plan.id"
        class="card flex flex-col gap-3 cursor-pointer hover:shadow-md transition"
        @click="openEdit(plan)"
      >
        <!-- Member info -->
        <div class="flex items-center gap-3">
          <img
            v-if="userMap[plan.userId]?.photoURL"
            :src="userMap[plan.userId].photoURL"
            class="w-10 h-10 rounded-full object-cover shrink-0"
          />
          <div v-else class="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center font-bold text-brand-600 shrink-0">
            {{ (userMap[plan.userId]?.name ?? plan.userName ?? '?')[0] }}
          </div>
          <div class="min-w-0">
            <p class="font-semibold text-sm truncate">
              {{ userMap[plan.userId]?.name ?? plan.userName ?? plan.userId }}
            </p>
            <p class="text-xs text-gray-400">{{ dateRangeLabel(plan) }}</p>
          </div>
        </div>

        <!-- Exercise count + names -->
        <div class="flex-1 space-y-1">
          <template v-for="(block, bi) in planToBlocks(plan).slice(0, 3)" :key="bi">
            <div v-if="block.type === 'superset'" class="text-xs text-indigo-500 font-medium ps-1">
              {{ t('plans.superset') }}
            </div>
            <div
              v-for="ex in block.exercises" :key="ex.exerciseId"
              class="text-xs text-gray-600 bg-gray-50 rounded px-2 py-1 truncate"
              :class="block.type === 'superset' ? 'ms-2 bg-indigo-50' : ''"
            >{{ localField(ex.exerciseName ?? ex.name) }}</div>
          </template>
          <p v-if="planToBlocks(plan).length > 3" class="text-xs text-gray-400 ps-2">
            +{{ planToBlocks(plan).length - 3 }} {{ t('plans.moreExercises') }}
          </p>
        </div>

        <!-- Footer -->
        <div class="flex items-center justify-between pt-1 border-t border-gray-50" @click.stop>
          <span v-if="plan.updatedAt" class="text-[10px] text-gray-300">
            {{ t('plans.updated') }} {{ formatUpdatedAt(plan.updatedAt) }}
          </span>
          <div class="flex gap-1 ms-auto">
            <button class="text-xs px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition" @click="openClone(plan)">⧉</button>
            <button class="text-xs px-2 py-1 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition" @click="confirmDelete(plan)">✕</button>
          </div>
        </div>
      </div>

      <p v-if="!filtered.length" class="col-span-full text-center text-gray-400 text-sm py-8">{{ t('plans.noPlans') }}</p>
    </div>

    <!-- ════ PLAN FORM MODAL (new / edit / clone) ═════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeModal" />
          <form
            class="relative bg-white w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto"
            @submit.prevent="handleSave"
          >
            <h3 class="font-semibold text-gray-900">{{ modalTitle }}</h3>

            <!-- Member select -->
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('plans.assignTo') }}</label>
              <select v-model="form.userId" class="input" required @change="syncUserName">
                <option value="" disabled>{{ t('plans.selectMember') }}</option>
                <option v-for="u in allUsers" :key="u.uid" :value="u.uid">{{ u.name }}</option>
              </select>
            </div>

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

            <!-- Blocks (exercises + supersets) -->
            <div class="space-y-3">
              <label class="block text-xs font-medium text-gray-600">{{ t('plans.exercises') }}</label>

              <div v-for="(block, bi) in form.blocks" :key="bi"
                class="rounded-xl border p-3 space-y-2"
                :class="block.type === 'superset' ? 'border-indigo-200 bg-indigo-50/40' : 'border-gray-100 bg-gray-50'"
              >
                <!-- Block header -->
                <div class="flex items-center gap-2">
                  <span v-if="block.type === 'superset'"
                    class="text-xs font-semibold text-indigo-600 uppercase tracking-wide flex-1">
                    {{ t('plans.superset') }}
                  </span>
                  <span v-else class="text-xs text-gray-400 flex-1">{{ t('plans.exercise') }}</span>
                  <!-- Rounds (superset only) -->
                  <div v-if="block.type === 'superset'" class="flex items-center gap-1">
                    <label class="text-xs text-indigo-500">{{ t('plans.rounds') }}</label>
                    <input v-model.number="block.rounds" type="number" min="1" max="10"
                      class="input w-14 text-sm py-1 text-center" />
                  </div>
                  <button type="button" class="text-red-400 hover:text-red-600 text-lg leading-none"
                    @click="removeBlock(bi)">✕</button>
                </div>

                <!-- Exercises within block -->
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

                <!-- Add exercise to superset (max 3) -->
                <button v-if="block.type === 'superset' && block.exercises.length < 3"
                  type="button"
                  class="text-xs text-indigo-500 hover:text-indigo-700 underline"
                  @click="block.exercises.push(emptyExercise())">
                  + {{ t('plans.addToSuperset') }}
                </button>
              </div>

              <!-- Add buttons -->
              <div class="flex gap-2">
                <button type="button" class="btn-secondary flex-1 text-sm" @click="addStraightBlock">
                  + {{ t('plans.addExercise') }}
                </button>
                <button type="button"
                  class="flex-1 text-sm px-4 py-2 rounded-xl border-2 border-dashed border-indigo-300 text-indigo-600 hover:bg-indigo-50 font-medium transition-colors"
                  @click="addSupersetBlock">
                  + {{ t('plans.addSuperset') }}
                </button>
              </div>
            </div>

            <p v-if="formError" class="text-red-600 text-xs">{{ formError }}</p>

            <div class="flex gap-3 pt-1">
              <button type="button" class="btn-secondary flex-1" @click="closeModal">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn-primary flex-1" :disabled="submitting">
                {{ submitting ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

    <!-- ════ CONFIRM DELETE ═══════════════════════════════════ -->
    <ConfirmDialog
      v-model="deleteOpen"
      :message="t('plans.confirmDelete')"
      @confirm="handleDelete"
    />

  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/firebase'
import { useWorkoutPlansStore } from '@/stores/workoutPlans'
import { useExercisesStore }    from '@/stores/exercises'
import { useLocalField }        from '@/composables/useLocalField'
import { planToBlocks, emptyStraightBlock, emptySupersetBlock, emptyExercise } from '@/utils/planBlocks'
import { todayISO }             from '@/utils/date'
import AppSpinner    from '@/components/shared/AppSpinner.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'
import ExercisePicker from '@/components/shared/ExercisePicker.vue'

const { t, locale } = useI18n()
const { localField } = useLocalField()
const plansStore     = useWorkoutPlansStore()
const exercisesStore = useExercisesStore()

// ── Users ─────────────────────────────────────────────────
const allUsers = ref([])
const userMap  = computed(() => {
  const m = {}
  allUsers.value.forEach((u) => { m[u.uid] = u })
  return m
})

// ── Filters ───────────────────────────────────────────────
const filterMember   = ref('')
const filterExercise = ref('')

const allExerciseNames = computed(() => {
  const names = new Set()
  plansStore.allPlans.forEach((p) =>
    planToBlocks(p).forEach((b) =>
      b.exercises.forEach((ex) => {
        const n = localField(ex.exerciseName ?? ex.name)
        if (n) names.add(n)
      })
    )
  )
  return [...names].sort()
})

const filtered = computed(() => {
  return plansStore.allPlans.filter((p) => {
    if (filterMember.value && p.userId !== filterMember.value) return false
    if (filterExercise.value) {
      const has = planToBlocks(p).some((b) =>
        b.exercises.some((ex) => localField(ex.exerciseName ?? ex.name) === filterExercise.value)
      )
      if (!has) return false
    }
    return true
  })
})

// ── View toggle ───────────────────────────────────────────
const viewMode   = ref('list')
const viewOptions = [
  { key: 'list', icon: '☰' },
  { key: 'card', icon: '⊞' },
]

// ── Helpers ───────────────────────────────────────────────
function dateRangeLabel(plan) {
  if (plan.startDate && plan.endDate && plan.startDate !== plan.endDate) {
    return `${plan.startDate} → ${plan.endDate}`
  }
  return plan.startDate ?? plan.date ?? '—'
}

function formatUpdatedAt(ts) {
  if (!ts) return ''
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(locale.value === 'he' ? 'he-IL' : 'fr-FR', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
}

// ── Modal state ───────────────────────────────────────────
const modalOpen  = ref(false)
const modalMode  = ref('new')          // 'new' | 'edit' | 'clone'
const editingId  = ref(null)
const submitting = ref(false)
const formError  = ref('')
const showErrors = ref(false)

const form = reactive({
  userId:    '',
  userName:  '',
  startDate: todayISO(),
  endDate:   todayISO(),
  blocks:    [],
})

const modalTitle = computed(() => {
  if (modalMode.value === 'edit')  return t('plans.editPlan')
  if (modalMode.value === 'clone') return t('plans.clonePlan')
  return t('plans.newPlan')
})

function resetForm() {
  form.userId    = ''
  form.userName  = ''
  form.startDate = todayISO()
  form.endDate   = todayISO()
  form.blocks    = []
  formError.value  = ''
  showErrors.value = false
  editingId.value  = null
}

function openNew() {
  resetForm()
  modalMode.value = 'new'
  modalOpen.value = true
}

function openEdit(plan) {
  resetForm()
  modalMode.value = 'edit'
  editingId.value = plan.id
  form.userId     = plan.userId
  form.userName   = userMap.value[plan.userId]?.name ?? plan.userName ?? ''
  form.startDate  = plan.startDate ?? plan.date ?? todayISO()
  form.endDate    = plan.endDate   ?? plan.date ?? todayISO()
  form.blocks     = planToBlocks(plan).map((b) => ({
    ...b,
    exercises: b.exercises.map((ex) => ({ ...ex })),
  }))
  modalOpen.value = true
}

function openClone(plan) {
  resetForm()
  modalMode.value = 'clone'
  form.blocks = planToBlocks(plan).map((b) => ({
    ...b,
    exercises: b.exercises.map((ex) => ({ ...ex })),
  }))
  modalOpen.value = true
}

function closeModal() { modalOpen.value = false }

function syncUserName() {
  form.userName = userMap.value[form.userId]?.name ?? ''
}

function addStraightBlock() { form.blocks.push(emptyStraightBlock()) }
function addSupersetBlock()  { form.blocks.push(emptySupersetBlock()) }
function removeBlock(idx)    { form.blocks.splice(idx, 1) }

function syncExerciseName(ex) {
  const found = exercisesStore.exercises.find((e) => e.id === ex.exerciseId)
  if (found) { ex.exerciseName = found.name; ex.videoUrl = found.videoUrl ?? '' }
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
  if (!form.userId)       { formError.value = t('plans.errorNoMember');    return }
  if (!form.startDate)    { formError.value = t('plans.errorNoDate');      return }
  if (!form.blocks.length){ formError.value = t('plans.errorNoExercises'); return }

  const hasEmpty = form.blocks.some((b) => b.exercises.some((ex) => !ex.exerciseId))
  if (hasEmpty) {
    showErrors.value = true
    formError.value  = t('plans.errorFillExercises')
    return
  }
  showErrors.value = false
  if (!form.endDate) form.endDate = form.startDate

  submitting.value = true
  try {
    const payload = {
      userId:    form.userId,
      userName:  form.userName,
      startDate: form.startDate,
      endDate:   form.endDate,
      blocks:    form.blocks.map(cleanBlock),
    }

    if (modalMode.value === 'edit' && editingId.value) {
      await plansStore.updatePlan(editingId.value, payload)
    } else {
      await plansStore.savePlan(payload)
    }
    closeModal()
  } catch (err) {
    formError.value = err.message
  } finally {
    submitting.value = false
  }
}

// ── Delete ────────────────────────────────────────────────
const deleteOpen    = ref(false)
const deletingPlan  = ref(null)

function confirmDelete(plan) {
  deletingPlan.value = plan
  deleteOpen.value   = true
}

async function handleDelete() {
  deleteOpen.value = false
  await plansStore.deletePlan(deletingPlan.value.id)
  deletingPlan.value = null
}

// ── Lifecycle ─────────────────────────────────────────────
onMounted(async () => {
  exercisesStore.subscribe()
  plansStore.subscribeAll()

  // Load all users for name resolution + filter dropdown
  const snap = await getDocs(collection(db, 'users'))
  allUsers.value = snap.docs
    .map((d) => d.data())
    .filter((u) => u.name)
    .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
