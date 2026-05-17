<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-4">
    <h2 class="text-lg font-semibold text-gray-900">{{ t('users.title') }}</h2>

    <!-- ── Search + view toggle ──────────────────────────── -->
    <div class="flex items-center gap-3">
      <!-- Search -->
      <div class="relative flex-1 max-w-sm">
        <span class="absolute inset-y-0 start-3 flex items-center text-gray-400 pointer-events-none">🔍</span>
        <input
          v-model="search"
          type="text"
          :placeholder="t('common.search')"
          class="input ps-8"
        />
      </div>

      <!-- View toggle -->
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
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

    <AppSpinner v-if="loading" />

    <!-- ── List view ─────────────────────────────────────── -->
    <div v-else-if="viewMode === 'list'" class="space-y-2">
      <div
        v-for="u in filtered" :key="u.uid"
        class="card flex items-center gap-3 cursor-pointer hover:shadow-md transition"
        @click="router.push('/admin/users/' + u.uid)"
      >
        <!-- Avatar -->
        <img v-if="u.photoURL" :src="u.photoURL" class="w-10 h-10 rounded-full object-cover shrink-0" />
        <div v-else class="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center font-semibold text-gray-500 shrink-0">
          {{ u.name?.[0] ?? '?' }}
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="font-medium text-sm truncate">{{ u.name }}</p>
          <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
        </div>

        <!-- Role badge -->
        <span class="badge shrink-0" :class="roleBadgeClass(u.role)">{{ roleLabel(u.role) }}</span>

        <!-- Quick role buttons -->
        <div class="flex gap-1 shrink-0" @click.stop>
          <template v-if="u.uid !== currentUid">
            <template v-if="u.role === 'member'">
              <button class="text-xs font-medium px-2 py-1 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition"
                :disabled="toggling === u.uid" @click="setRole(u, 'trainer')">
                {{ toggling === u.uid ? '…' : t('users.makeTrainer') }}
              </button>
              <button class="text-xs font-medium px-2 py-1 rounded-lg bg-purple-50 text-purple-600 hover:bg-purple-100 transition"
                :disabled="toggling === u.uid" @click="setRole(u, 'admin')">
                {{ toggling === u.uid ? '…' : t('users.makeAdmin') }}
              </button>
            </template>
            <template v-else>
              <button class="text-xs font-medium px-2 py-1 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition"
                :disabled="toggling === u.uid" @click="setRole(u, 'member')">
                {{ toggling === u.uid ? '…' : t('users.makeUser') }}
              </button>
            </template>
          </template>
        </div>

        <span class="text-gray-300 shrink-0">›</span>
      </div>

      <p v-if="!filtered.length && !loading" class="text-gray-400 text-sm text-center py-8">
        {{ search ? t('users.noResults') : t('common.noData') }}
      </p>
    </div>

    <!-- ── Card view ─────────────────────────────────────── -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      <div
        v-for="u in filtered" :key="u.uid"
        class="card flex flex-col items-center gap-2 py-5 cursor-pointer hover:shadow-md transition text-center"
        @click="router.push('/admin/users/' + u.uid)"
      >
        <img v-if="u.photoURL" :src="u.photoURL" class="w-14 h-14 rounded-full object-cover ring-2 ring-brand-100" />
        <div v-else class="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xl text-gray-400">
          {{ u.name?.[0] ?? '?' }}
        </div>
        <p class="font-semibold text-sm truncate w-full px-1">{{ u.name }}</p>
        <p class="text-xs text-gray-400 truncate w-full px-1">{{ u.email }}</p>
        <span class="badge text-xs" :class="roleBadgeClass(u.role)">{{ roleLabel(u.role) }}</span>
      </div>

      <p v-if="!filtered.length && !loading" class="col-span-full text-gray-400 text-sm text-center py-8">
        {{ search ? t('users.noResults') : t('common.noData') }}
      </p>
    </div>
  </main>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/firebase'
import { useI18n } from 'vue-i18n'
import { useAuthStore }   from '@/stores/auth'
import { useCoachesStore } from '@/stores/coaches'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t }      = useI18n()
const auth       = useAuthStore()
const coachStore = useCoachesStore()
const router     = useRouter()

const currentUid = computed(() => auth.user?.uid)
const users      = ref([])
const loading    = ref(false)
const toggling   = ref(null)
const search     = ref('')
const viewMode   = ref('list')

const viewOptions = [
  { key: 'list', icon: '☰' },
  { key: 'card', icon: '⊞' },
]

// ── Filtering + sorting ───────────────────────────────────
const filtered = computed(() => {
  const q = search.value.trim().toLowerCase()
  return users.value.filter((u) =>
    !q ||
    (u.name  ?? '').toLowerCase().includes(q) ||
    (u.email ?? '').toLowerCase().includes(q)
  )
})

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
function roleOrder(role) {
  return role === 'admin' ? 0 : role === 'trainer' ? 1 : 2
}

// ── Load users ────────────────────────────────────────────
async function loadUsers() {
  loading.value = true
  const snap = await getDocs(collection(db, 'users'))
  users.value = snap.docs
    .map((d) => d.data())
    .sort((a, b) => {
      const ro = roleOrder(a.role) - roleOrder(b.role)
      return ro !== 0 ? ro : (a.name ?? '').localeCompare(b.name ?? '')
    })
  loading.value = false
}

// ── Role change ───────────────────────────────────────────
async function setRole(u, newRole) {
  toggling.value = u.uid
  try {
    await updateDoc(doc(db, 'users', u.uid), { role: newRole })
    u.role = newRole
    if (newRole === 'trainer') await coachStore.promoteToCoach(u)
    else                       await coachStore.removeCoach(u.uid)
  } catch (err) { console.error(err) }
  finally { toggling.value = null }
}

onMounted(loadUsers)
</script>
