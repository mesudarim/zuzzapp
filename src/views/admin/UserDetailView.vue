<template>
  <main class="max-w-3xl mx-auto px-4 py-6 space-y-6">

    <!-- ── Back button ────────────────────────────────────── -->
    <button class="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition" @click="router.back()">
      ‹ {{ t('common.back') }}
    </button>

    <!-- ── Loading ───────────────────────────────────────── -->
    <AppSpinner v-if="loadingProfile" />

    <template v-else-if="userProfile">

      <!-- ── Profile header ────────────────────────────────── -->
      <div class="card flex items-center gap-4">
        <img v-if="userProfile.photoURL" :src="userProfile.photoURL" class="w-16 h-16 rounded-full object-cover ring-2 ring-brand-200 shrink-0" />
        <div v-else class="w-16 h-16 rounded-full bg-brand-100 flex items-center justify-center text-2xl font-bold text-brand-600 shrink-0">
          {{ userProfile.name?.[0] ?? '?' }}
        </div>

        <div class="flex-1 min-w-0">
          <p class="font-bold text-gray-900 text-lg truncate">{{ userProfile.name }}</p>
          <p class="text-sm text-gray-500 truncate">{{ userProfile.email }}</p>
          <span class="mt-1 inline-flex badge" :class="roleBadgeClass(userProfile.role)">
            {{ roleLabel(userProfile.role) }}
          </span>
        </div>

        <!-- Quick role change -->
        <div v-if="userProfile.uid !== auth.user?.uid" class="flex flex-col gap-1 shrink-0">
          <template v-if="userProfile.role === 'member'">
            <button class="text-xs font-medium px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
              :disabled="toggling" @click="setRole('trainer')">{{ t('users.makeTrainer') }}</button>
            <button class="text-xs font-medium px-2 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
              :disabled="toggling" @click="setRole('admin')">{{ t('users.makeAdmin') }}</button>
          </template>
          <template v-else>
            <button class="text-xs font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
              :disabled="toggling" @click="setRole('member')">{{ t('users.makeUser') }}</button>
          </template>
        </div>
      </div>

      <!-- ── Stats row ──────────────────────────────────────── -->
      <div class="grid grid-cols-3 gap-3">
        <div class="card text-center py-4">
          <p class="text-2xl font-bold text-brand-600">{{ totalSessions }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ t('userDetail.sessions') }}</p>
        </div>
        <div class="card text-center py-4">
          <p class="text-2xl font-bold text-brand-600">{{ lastVisitLabel }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ t('userDetail.lastVisit') }}</p>
        </div>
        <div class="card text-center py-4">
          <p class="text-2xl font-bold text-brand-600">{{ uniqueExercisesCount }}</p>
          <p class="text-xs text-gray-500 mt-1">{{ t('userDetail.exercises') }}</p>
        </div>
      </div>

      <!-- ── Tabs ───────────────────────────────────────────── -->
      <div class="flex gap-1 border-b border-gray-100">
        <button
          v-for="tab in tabs" :key="tab.key"
          class="px-4 pb-2 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="activeTab === tab.key
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="activeTab = tab.key"
        >{{ tab.label }}</button>
      </div>

      <!-- ═══ TAB: Profil ══════════════════════════════════════ -->
      <div v-if="activeTab === 'profile'" class="card space-y-4">
        <div class="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p class="text-xs text-gray-400 mb-0.5">{{ t('onboarding.weight') }}</p>
            <p class="font-medium">{{ userProfile.weight ? userProfile.weight + ' kg' : '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-0.5">{{ t('onboarding.height') }}</p>
            <p class="font-medium">{{ userProfile.height ? userProfile.height + ' cm' : '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-0.5">{{ t('onboarding.birthDate') }}</p>
            <p class="font-medium">{{ userProfile.birthDate ? formatBirthDate(userProfile.birthDate) : '—' }}</p>
          </div>
          <div>
            <p class="text-xs text-gray-400 mb-0.5">{{ t('userDetail.age') }}</p>
            <p class="font-medium">{{ userProfile.birthDate ? calcAge(userProfile.birthDate) + ' ans' : '—' }}</p>
          </div>
        </div>
      </div>

      <!-- ═══ TAB: Plans d'entraînement ═══════════════════════ -->
      <div v-else-if="activeTab === 'plans'" class="space-y-3">
        <AppSpinner v-if="loadingPlans" />

        <p v-else-if="!plans.length" class="text-gray-400 text-sm text-center py-6">
          {{ t('userDetail.noPlans') }}
        </p>

        <div v-for="plan in plans" :key="plan.id" class="card space-y-2">
          <!-- Plan header -->
          <div class="flex items-center justify-between">
            <p class="font-semibold text-sm">📅 {{ plan.date }}</p>
            <div class="flex gap-2">
              <button class="btn-secondary text-xs" @click="openPlanEdit(plan)">{{ t('common.edit') }}</button>
              <button class="text-xs font-medium text-red-500 hover:text-red-700 px-2" @click="deletePlan(plan.id)">{{ t('common.delete') }}</button>
            </div>
          </div>

          <!-- Exercises list -->
          <div class="space-y-1">
            <div v-for="ex in plan.exercises" :key="ex.exerciseId" class="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-1.5">
              <span class="flex-1 truncate">{{ ex.exerciseName }}</span>
              <span class="text-xs text-gray-400 shrink-0">{{ ex.targetSets }}×{{ ex.targetReps }} @ {{ ex.targetWeight ?? '—' }}kg</span>
            </div>
          </div>
        </div>
      </div>

      <!-- ═══ TAB: Historique ══════════════════════════════════ -->
      <div v-else-if="activeTab === 'history'" class="space-y-3">
        <AppSpinner v-if="loadingHistory" />

        <p v-else-if="!groupedHistory.length" class="text-gray-400 text-sm text-center py-6">
          {{ t('userDetail.noHistory') }}
        </p>

        <div v-for="day in groupedHistory" :key="day.date" class="card space-y-2">
          <!-- Day header -->
          <div class="flex items-center justify-between">
            <p class="font-semibold text-sm">📅 {{ day.date }}</p>
            <span class="badge bg-brand-100 text-brand-700 text-xs">
              {{ day.logs.length }} {{ t('userDetail.exercisesDone') }}
            </span>
          </div>

          <!-- Exercises logged that day -->
          <div v-for="log in day.logs" :key="log.id" class="bg-gray-50 rounded-lg px-3 py-2 space-y-1">
            <p class="text-sm font-medium text-gray-800">{{ log.exerciseName }}</p>
            <div class="flex flex-wrap gap-2">
              <span
                v-for="(set, i) in log.sets" :key="i"
                class="text-xs px-2 py-0.5 bg-white rounded border border-gray-100 text-gray-600"
              >
                S{{ set.setNumber }} · {{ set.actualReps }} reps · {{ set.actualWeight }}kg
              </span>
            </div>
          </div>
        </div>
      </div>

    </template>

    <!-- ── User not found ─────────────────────────────────── -->
    <div v-else class="text-center py-12 text-gray-400">
      <p class="text-lg">👤</p>
      <p class="text-sm mt-2">{{ t('userDetail.notFound') }}</p>
    </div>

    <!-- ── Plan Edit Modal ────────────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="planEditOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="planEditOpen = false" />
          <form class="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10 max-h-[90vh] overflow-y-auto"
            @submit.prevent="savePlanEdit">
            <h3 class="font-semibold text-gray-900">{{ t('plans.title') }} — {{ editingPlan?.date }}</h3>

            <div v-for="(ex, i) in planEditForm.exercises" :key="i"
              class="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-center bg-gray-50 rounded-xl px-3 py-2">
              <p class="text-sm font-medium truncate col-span-5">{{ ex.exerciseName }}</p>
              <div class="flex items-center gap-1 col-span-5">
                <input v-model.number="ex.targetSets"   type="number" min="1" class="input text-xs w-16" :placeholder="t('plans.targetSets')" />
                <span class="text-gray-400 text-xs">×</span>
                <input v-model.number="ex.targetReps"   type="number" min="1" class="input text-xs w-16" :placeholder="t('plans.targetReps')" />
                <span class="text-gray-400 text-xs">@</span>
                <input v-model.number="ex.targetWeight" type="number" min="0" step="0.5" class="input text-xs w-20" :placeholder="t('plans.targetWeight')" />
                <button type="button" class="text-red-400 hover:text-red-600 px-1" @click="planEditForm.exercises.splice(i, 1)">×</button>
              </div>
            </div>

            <p v-if="planEditError" class="text-red-600 text-xs">{{ planEditError }}</p>

            <div class="flex gap-3">
              <button type="button" class="btn-secondary flex-1" @click="planEditOpen = false">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn-primary flex-1" :disabled="savingPlan">
                {{ savingPlan ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n }   from 'vue-i18n'
import { useAuthStore }    from '@/stores/auth'
import { useCoachesStore } from '@/stores/coaches'
import { useWorkoutPlansStore } from '@/stores/workoutPlans'
import {
  doc, getDoc, getDocs, collection,
  query, where, orderBy, updateDoc, deleteDoc,
} from 'firebase/firestore'
import { db } from '@/firebase'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t, locale } = useI18n()
const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()
const coachStore = useCoachesStore()
const plansStore = useWorkoutPlansStore()

const uid = route.params.uid

// ── Profile ───────────────────────────────────────────────
const userProfile    = ref(null)
const loadingProfile = ref(true)

async function loadProfile() {
  loadingProfile.value = true
  const snap = await getDoc(doc(db, 'users', uid))
  userProfile.value = snap.exists() ? snap.data() : null
  loadingProfile.value = false
}

// ── Role helpers ──────────────────────────────────────────
function roleLabel(role) {
  if (role === 'admin')   return `🛡️ ${t('home.roleAdmin')}`
  if (role === 'trainer') return `🧑‍💼 ${t('home.roleTrainer')}`
  return `🏃 ${t('home.roleMember')}`
}
function roleBadgeClass(role) {
  if (role === 'admin')   return 'bg-purple-100 text-purple-700'
  if (role === 'trainer') return 'bg-blue-100 text-blue-700'
  return 'bg-green-100 text-green-700'
}

const toggling = ref(false)
async function setRole(newRole) {
  toggling.value = true
  try {
    await updateDoc(doc(db, 'users', uid), { role: newRole })
    userProfile.value.role = newRole
    if (newRole === 'trainer') await coachStore.promoteToCoach(userProfile.value)
    else                       await coachStore.removeCoach(uid)
  } catch (err) { console.error(err) }
  finally { toggling.value = false }
}

// ── Profile helpers ───────────────────────────────────────
function formatBirthDate(date) {
  return new Date(date + 'T12:00:00').toLocaleDateString(
    locale.value === 'he' ? 'he-IL' : 'fr-FR',
    { day: 'numeric', month: 'long', year: 'numeric' }
  )
}
function calcAge(date) {
  const birth = new Date(date + 'T12:00:00')
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  if (today.getMonth() < birth.getMonth() ||
     (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--
  return age
}

// ── Tabs ──────────────────────────────────────────────────
const activeTab = ref('profile')
const tabs = computed(() => [
  { key: 'profile', label: t('userDetail.tabProfile')  },
  { key: 'plans',   label: t('userDetail.tabPlans')    },
  { key: 'history', label: t('userDetail.tabHistory')  },
])

// ── Workout plans ─────────────────────────────────────────
const plans        = ref([])
const loadingPlans = ref(false)

async function loadPlans() {
  loadingPlans.value = true
  const q    = query(collection(db, 'workoutPlans'), where('userId', '==', uid), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  plans.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  loadingPlans.value = false
}

// plan edit modal
const planEditOpen    = ref(false)
const savingPlan      = ref(false)
const planEditError   = ref('')
const editingPlan     = ref(null)
const planEditForm    = reactive({ exercises: [] })

function openPlanEdit(plan) {
  editingPlan.value = plan
  planEditError.value = ''
  planEditForm.exercises = plan.exercises.map((ex) => ({ ...ex }))
  planEditOpen.value = true
}

async function savePlanEdit() {
  savingPlan.value = true; planEditError.value = ''
  try {
    await updateDoc(doc(db, 'workoutPlans', editingPlan.value.id), { exercises: planEditForm.exercises })
    const idx = plans.value.findIndex((p) => p.id === editingPlan.value.id)
    if (idx !== -1) plans.value[idx].exercises = [...planEditForm.exercises]
    planEditOpen.value = false
  } catch (err) { planEditError.value = err.message }
  finally { savingPlan.value = false }
}

async function deletePlan(planId) {
  if (!confirm(t('common.confirm'))) return
  await deleteDoc(doc(db, 'workoutPlans', planId))
  plans.value = plans.value.filter((p) => p.id !== planId)
}

// ── Training history ──────────────────────────────────────
const historyLogs    = ref([])
const loadingHistory = ref(false)

async function loadHistory() {
  loadingHistory.value = true
  const q    = query(collection(db, 'trainingLogs'), where('userId', '==', uid), orderBy('date', 'desc'))
  const snap = await getDocs(q)
  historyLogs.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  loadingHistory.value = false
}

// Group by date
const groupedHistory = computed(() => {
  const map = {}
  for (const log of historyLogs.value) {
    if (!map[log.date]) map[log.date] = []
    map[log.date].push(log)
  }
  return Object.entries(map)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([date, logs]) => ({ date, logs }))
})

// ── Stats ─────────────────────────────────────────────────
const bookings = ref([])

async function loadBookings() {
  const q    = query(collection(db, 'bookings'), where('userId', '==', uid), orderBy('bookedAt', 'desc'))
  const snap = await getDocs(q)
  bookings.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

const totalSessions = computed(() => bookings.value.length)

const lastVisitLabel = computed(() => {
  if (!bookings.value.length) return '—'
  const ts = bookings.value[0].bookedAt
  const d  = ts?.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleDateString(locale.value === 'he' ? 'he-IL' : 'fr-FR', { day: 'numeric', month: 'short' })
})

const uniqueExercisesCount = computed(() =>
  new Set(historyLogs.value.map((l) => l.exerciseId)).size
)

// ── Lifecycle ─────────────────────────────────────────────
onMounted(async () => {
  await loadProfile()
  await Promise.all([loadPlans(), loadHistory(), loadBookings()])
})
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
