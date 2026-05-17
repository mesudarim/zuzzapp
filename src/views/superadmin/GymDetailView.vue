<template>
  <main class="max-w-4xl mx-auto px-4 py-6 space-y-6">

    <!-- Back -->
    <router-link to="/superadmin" class="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-brand-700 transition">
      ← {{ t('common.back') }}
    </router-link>

    <AppSpinner v-if="!gym" />

    <template v-else>

      <!-- ── Branding card ──────────────────────────────────── -->
      <div class="card space-y-5">
        <h2 class="font-semibold">{{ t('superAdmin.branding') }}</h2>

        <div class="flex flex-col sm:flex-row gap-6 items-start">

          <!-- Logo upload -->
          <div class="flex flex-col items-center gap-2">
            <p class="text-xs text-gray-500 font-medium">{{ t('superAdmin.logo') }}</p>
            <div
              class="relative cursor-pointer group w-24 h-24"
              @click="logoInput.click()"
            >
              <img
                v-if="logoPreview || gym.logoURL"
                :src="logoPreview || gym.logoURL"
                class="w-24 h-24 rounded-2xl object-cover ring-2 ring-brand-100 shadow"
              />
              <div
                v-else
                class="w-24 h-24 rounded-2xl bg-brand-100 flex items-center justify-center text-3xl font-bold text-brand-700 shadow"
              >
                {{ gym.name?.[0] ?? '?' }}
              </div>
              <div class="absolute inset-0 rounded-2xl bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-2xl transition-opacity">
                📷
              </div>
            </div>
            <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoChange" />
            <p class="text-xs text-gray-400 text-center">{{ t('gym.logoHint') }}</p>
          </div>

          <!-- Color + preview -->
          <div class="flex-1 space-y-4">
            <div>
              <p class="text-xs text-gray-500 font-medium mb-2">{{ t('superAdmin.primaryColor') }}</p>
              <div class="flex items-center gap-3">
                <input
                  v-model="primaryColor"
                  type="color"
                  class="w-12 h-12 rounded-xl cursor-pointer border border-gray-200 p-0.5"
                />
                <div class="space-y-1">
                  <p class="text-sm font-mono text-gray-600">{{ primaryColor }}</p>
                  <p class="text-xs text-gray-400">{{ t('superAdmin.colorHint') }}</p>
                </div>
              </div>
            </div>

            <!-- Live palette preview -->
            <div>
              <p class="text-xs text-gray-400 mb-2">{{ t('superAdmin.colorPreview') }}</p>
              <div class="flex gap-1.5 flex-wrap">
                <div
                  v-for="swatch in previewPalette"
                  :key="swatch.label"
                  class="flex flex-col items-center gap-1"
                >
                  <div
                    class="w-8 h-8 rounded-lg shadow-sm"
                    :style="{ backgroundColor: swatch.hex }"
                  />
                  <span class="text-xs text-gray-400">{{ swatch.label }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Error / success -->
        <p v-if="brandingError"   class="text-red-600 text-sm">{{ brandingError }}</p>
        <p v-if="brandingSuccess" class="text-green-600 text-sm">{{ t('gym.saved') }}</p>

        <button
          class="btn-primary"
          :disabled="brandingSaving"
          @click="saveBranding"
        >
          {{ brandingSaving ? t('common.loading') : t('common.save') }}
        </button>
      </div>

      <!-- ── Invite link ────────────────────────────────────── -->
      <div class="card bg-brand-50 border border-brand-100 flex items-center gap-3">
        <div class="flex-1 min-w-0">
          <p class="text-xs text-brand-500 font-semibold uppercase tracking-wide mb-0.5">{{ t('superAdmin.inviteLink') }}</p>
          <p class="text-sm font-mono text-brand-700 truncate">{{ inviteLink }}</p>
        </div>
        <button class="btn-primary text-sm shrink-0" @click="copyLink">
          {{ copied ? '✓' : t('superAdmin.copy') }}
        </button>
      </div>

      <!-- ── Gym mode ─────────────────────────────────────────── -->
      <div class="card space-y-4">
        <div>
          <h2 class="font-semibold">{{ t('superAdmin.gymMode') }}</h2>
          <p class="text-xs text-gray-400 mt-0.5">{{ t('superAdmin.gymModeHint') }}</p>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <button
            v-for="mode in ['coached', 'autonomous']" :key="mode"
            class="flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors text-left"
            :class="gymModeLocal === mode
              ? 'border-brand-500 bg-brand-50'
              : 'border-gray-200 hover:border-gray-300'"
            @click="gymModeLocal = mode"
          >
            <span class="text-2xl">{{ mode === 'coached' ? '🧑‍💼' : '🏃' }}</span>
            <span class="font-semibold text-sm">{{ t(`superAdmin.mode_${mode}`) }}</span>
            <span class="text-xs text-gray-500 text-center">{{ t(`superAdmin.mode_${mode}_hint`) }}</span>
          </button>
        </div>
        <p v-if="gymModeSaved" class="text-green-600 text-sm">{{ t('gym.saved') }}</p>
        <button class="btn-primary text-sm" :disabled="gymModeSaving" @click="saveGymMode">
          {{ gymModeSaving ? t('common.loading') : t('common.save') }}
        </button>
      </div>

      <!-- ── Migrate legacy data ───────────────────────────────── -->
      <div class="card space-y-3 border-amber-200 bg-amber-50">
        <div class="flex items-start gap-3">
          <span class="text-2xl">⚠️</span>
          <div>
            <h2 class="font-semibold text-amber-800">{{ t('superAdmin.migrateTitle') }}</h2>
            <p class="text-xs text-amber-700 mt-1">{{ t('superAdmin.migrateHint') }}</p>
          </div>
        </div>

        <!-- Progress / result -->
        <div v-if="migrateProgress" class="text-sm text-amber-700 font-mono bg-amber-100 rounded-lg px-3 py-2 space-y-1">
          <p v-for="line in migrateLog" :key="line">{{ line }}</p>
        </div>

        <div v-if="!migrateDone" class="flex items-center gap-3">
          <button
            class="btn-primary bg-amber-500 hover:bg-amber-600"
            :disabled="migrating"
            @click="confirmMigrate"
          >
            {{ migrating ? t('superAdmin.migrating') : t('superAdmin.migrateBtn') }}
          </button>
          <p v-if="!migrating" class="text-xs text-amber-600">{{ t('superAdmin.migrateConfirmHint') }}</p>
        </div>
        <div v-else class="flex items-center gap-3">
          <p class="text-sm text-green-700 font-medium">✓ {{ t('superAdmin.migrateDone') }}</p>
          <button class="text-xs text-amber-600 underline" @click="migrateDone = false">
            {{ t('superAdmin.migrateRunAgain') }}
          </button>
        </div>
      </div>

      <!-- ── Add existing user ──────────────────────────────── -->
      <div class="card space-y-3">
        <h2 class="font-semibold text-sm">{{ t('superAdmin.addExistingUser') }}</h2>
        <p class="text-xs text-gray-400">{{ t('superAdmin.addExistingUserHint') }}</p>
        <div class="flex gap-2">
          <input
            v-model="searchEmail"
            type="email"
            :placeholder="t('superAdmin.emailPlaceholder')"
            class="input flex-1"
          />
          <button class="btn-secondary shrink-0" :disabled="searching" @click="doSearch">
            {{ searching ? '…' : t('common.search') }}
          </button>
        </div>
        <div v-if="searchResults.length > 0" class="space-y-2">
          <div
            v-for="u in searchResults"
            :key="u.id"
            class="flex items-center gap-3 p-2 rounded-lg border border-gray-100 bg-gray-50"
          >
            <img v-if="u.photoURL" :src="u.photoURL" class="w-8 h-8 rounded-full object-cover" />
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ u.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
              <p class="text-xs text-gray-400">{{ t('superAdmin.currentGym') }}: {{ u.gymId ?? '—' }}</p>
            </div>
            <button class="btn-primary text-xs px-3" @click="moveUserToGym(u)">
              {{ t('superAdmin.assignHere') }}
            </button>
          </div>
        </div>
        <p v-else-if="searchDone" class="text-sm text-gray-400">{{ t('common.noData') }}</p>
      </div>

      <!-- ── Members ────────────────────────────────────────── -->
      <div class="card space-y-3">
        <h2 class="font-semibold">{{ t('superAdmin.members') }} ({{ store.gymUsers.length }})</h2>

        <AppSpinner v-if="store.gymUsersLoading" />

        <div v-else-if="store.gymUsers.length === 0" class="text-sm text-gray-400">
          {{ t('superAdmin.noMembers') }}
        </div>

        <div v-else class="space-y-2">
          <div
            v-for="u in store.gymUsers"
            :key="u.id"
            class="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition"
          >
            <img v-if="u.photoURL" :src="u.photoURL" class="w-9 h-9 rounded-full object-cover ring-2 ring-gray-100" />
            <div v-else class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-500">
              {{ u.name?.[0] ?? '?' }}
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium truncate">{{ u.name }}</p>
              <p class="text-xs text-gray-400 truncate">{{ u.email }}</p>
            </div>
            <select
              :value="u.role"
              class="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-brand-300"
              :class="{
                'text-purple-600 bg-purple-50': u.role === 'admin',
                'text-blue-600 bg-blue-50':     u.role === 'trainer',
                'text-gray-600 bg-gray-50':      u.role === 'member',
              }"
              @change="changeRole(u, $event.target.value)"
            >
              <option value="member">member</option>
              <option value="trainer">trainer</option>
              <option value="admin">admin</option>
            </select>
          </div>
        </div>
      </div>

    </template>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useSuperAdminStore } from '@/stores/superAdmin'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t }  = useI18n()
const route  = useRoute()
const store  = useSuperAdminStore()

const gymId      = route.params.id
const gym        = ref(null)
const inviteLink = computed(() => gym.value ? `${window.location.origin}/gym/${gym.value.slug}` : '')

onMounted(async () => {
  gym.value = await store.fetchGym(gymId)
  if (gym.value?.primaryColor) primaryColor.value = gym.value.primaryColor
  store.subscribeGymUsers(gymId)
})
onUnmounted(() => store.unsubscribeGymUsers())

// ── Copy link ──────────────────────────────────────────────
const copied = ref(false)
async function copyLink() {
  await navigator.clipboard.writeText(inviteLink.value)
  copied.value = true
  setTimeout(() => { copied.value = false }, 2000)
}

// ── Branding ───────────────────────────────────────────────
const logoInput     = ref(null)
const logoPreview   = ref(null)
const logoFile      = ref(null)
const primaryColor  = ref('#0284c7')
const brandingSaving = ref(false)
const brandingError  = ref('')
const brandingSuccess = ref(false)

// Live palette preview (6 swatches derived from the chosen color)
const previewPalette = computed(() => {
  const hex = primaryColor.value
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return []
  const r = parseInt(hex.slice(1,3), 16)
  const g = parseInt(hex.slice(3,5), 16)
  const b = parseInt(hex.slice(5,7), 16)
  const tint  = (c, f) => Math.round(c + (255 - c) * f)
  const shade = (c, f) => Math.round(c * (1 - f))
  const toHex = (cr, cg, cb) => '#' + [cr, cg, cb].map(v => v.toString(16).padStart(2,'0')).join('')
  return [
    { label: '50',  hex: toHex(tint(r,.95), tint(g,.95), tint(b,.95)) },
    { label: '100', hex: toHex(tint(r,.85), tint(g,.85), tint(b,.85)) },
    { label: '500', hex: toHex(tint(r,.20), tint(g,.20), tint(b,.20)) },
    { label: '600', hex: hex },
    { label: '700', hex: toHex(shade(r,.20), shade(g,.20), shade(b,.20)) },
    { label: '900', hex: toHex(shade(r,.55), shade(g,.55), shade(b,.55)) },
  ]
})

function onLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { brandingError.value = t('onboarding.errorSize'); return }
  logoFile.value    = file
  logoPreview.value = URL.createObjectURL(file)
}

async function saveBranding() {
  brandingSaving.value = true
  brandingError.value  = ''
  brandingSuccess.value = false
  try {
    const data = { primaryColor: primaryColor.value }

    if (logoFile.value) {
      const storage = getStorage()
      const path    = `gyms/${gymId}/logo.jpg`
      const ref_    = storageRef(storage, path)
      const resized = await resizeImage(logoFile.value, 350)
      await uploadBytes(ref_, resized)
      data.logoURL    = await getDownloadURL(ref_)
      logoPreview.value = null
      logoFile.value    = null
      gym.value = { ...gym.value, logoURL: data.logoURL }
    }

    await store.updateGym(gymId, data)
    gym.value = { ...gym.value, ...data }
    brandingSuccess.value = true
  } catch (err) {
    brandingError.value = err.message
  } finally {
    brandingSaving.value = false
  }
}

function resizeImage(file, maxPx) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(resolve, 'image/jpeg', 0.85)
    }
    img.src = URL.createObjectURL(file)
  })
}

// ── Migration ──────────────────────────────────────────────
const migrating       = ref(false)
const migrateDone     = ref(false)
const migrateProgress = ref(false)
const migrateLog      = ref([])

async function confirmMigrate() {
  if (!window.confirm(t('superAdmin.migrateConfirm', { gym: gym.value?.name }))) return
  migrating.value       = true
  migrateProgress.value = true
  migrateLog.value      = []

  try {
    const counts = await store.migrateLegacyData(gymId, (col) => {
      migrateLog.value.push(`⏳ ${col}…`)
    })
    migrateLog.value = []
    for (const [col, n] of Object.entries(counts)) {
      migrateLog.value.push(`✓ ${col}: ${n} ${t('superAdmin.docs')}`)
    }
    migrateDone.value = true
  } catch (err) {
    migrateLog.value.push(`❌ ${err.message}`)
  } finally {
    migrating.value = false
  }
}

// ── Gym mode ───────────────────────────────────────────────
const gymModeLocal  = ref('coached')
const gymModeSaving = ref(false)
const gymModeSaved  = ref(false)

watch(() => gym.value?.mode, (val) => { gymModeLocal.value = val ?? 'coached' }, { immediate: true })

async function saveGymMode() {
  gymModeSaving.value = true
  gymModeSaved.value  = false
  try {
    await store.updateGym(gymId, { mode: gymModeLocal.value })
    gym.value = { ...gym.value, mode: gymModeLocal.value }
    gymModeSaved.value = true
    setTimeout(() => { gymModeSaved.value = false }, 2000)
  } finally {
    gymModeSaving.value = false
  }
}

// ── Change user role ───────────────────────────────────────
async function changeRole(user, newRole) {
  await store.setUserRole(user.id, newRole)
}

// ── Search user by email ───────────────────────────────────
const searchEmail   = ref('')
const searchResults = ref([])
const searching     = ref(false)
const searchDone    = ref(false)

async function doSearch() {
  if (!searchEmail.value) return
  searching.value     = true
  searchDone.value    = false
  searchResults.value = []
  try {
    searchResults.value = await store.searchUserByEmail(searchEmail.value.trim())
  } finally {
    searching.value  = false
    searchDone.value = true
  }
}

async function moveUserToGym(user) {
  await store.setUserGym(user.id, gymId)
  searchResults.value = searchResults.value.filter((u) => u.id !== user.id)
}
</script>
