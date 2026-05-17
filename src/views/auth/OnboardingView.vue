<template>
  <div class="min-h-screen bg-gradient-to-br from-brand-900 to-brand-600 flex items-center justify-center p-4">
    <div class="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden">

      <!-- Barre de progression -->
      <div class="h-1.5 bg-gray-100">
        <div
          class="h-full bg-brand-500 transition-all duration-500"
          :style="{ width: `${(step / TOTAL_STEPS) * 100}%` }"
        />
      </div>

      <div class="p-6 space-y-6">

        <!-- En-tête -->
        <div class="text-center">
          <p class="text-xs text-gray-400 font-medium mb-1">{{ step }} / {{ TOTAL_STEPS }}</p>
          <h1 class="text-xl font-bold text-gray-900">{{ stepTitle }}</h1>
          <p class="text-sm text-gray-500 mt-1">{{ stepSubtitle }}</p>
        </div>

        <!-- ── ÉTAPE 1 : Photo ───────────────────────────────── -->
        <div v-if="step === 1" class="space-y-4">
          <!-- Aperçu -->
          <div class="flex justify-center">
            <div class="relative">
              <img
                :src="previewUrl || auth.profile?.photoURL || '/icons/icon-192.png'"
                class="w-28 h-28 rounded-full object-cover ring-4 ring-brand-100"
              />
              <!-- Bouton appareil photo -->
              <label
                class="absolute bottom-0 end-0 w-9 h-9 bg-brand-600 rounded-full
                       flex items-center justify-center cursor-pointer
                       hover:bg-brand-700 transition shadow-md"
              >
                <span class="text-white text-lg">📷</span>
                <input
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="onFileChange"
                />
              </label>
            </div>
          </div>

          <p class="text-center text-xs text-gray-400">{{ t('onboarding.photoHint') }}</p>

          <!-- Nom modifiable -->
          <div>
            <label class="text-xs font-medium text-gray-600 block mb-1">{{ t('onboarding.displayName') }}</label>
            <input v-model="form.name" class="input" :placeholder="auth.profile?.name" />
          </div>
        </div>

        <!-- ── ÉTAPE 2 : Infos physiques ─────────────────────── -->
        <div v-if="step === 2" class="space-y-4">

          <!-- Poids -->
          <div>
            <label class="text-xs font-medium text-gray-600 block mb-1">
              {{ t('onboarding.weight') }} <span class="text-gray-400">{{ t('onboarding.optional') }}</span>
            </label>
            <div class="relative">
              <input
                v-model.number="form.weight"
                type="number"
                min="20" max="300" step="0.5"
                inputmode="decimal"
                class="input pe-12"
                placeholder="75"
              />
              <span class="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">kg</span>
            </div>
          </div>

          <!-- Taille -->
          <div>
            <label class="text-xs font-medium text-gray-600 block mb-1">
              {{ t('onboarding.height') }} <span class="text-gray-400">{{ t('onboarding.optional') }}</span>
            </label>
            <div class="relative">
              <input
                v-model.number="form.height"
                type="number"
                min="100" max="250" step="1"
                inputmode="numeric"
                class="input pe-12"
                placeholder="178"
              />
              <span class="absolute end-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">cm</span>
            </div>
          </div>

          <!-- Date de naissance -->
          <div>
            <label class="text-xs font-medium text-gray-600 block mb-1">
              {{ t('onboarding.birthDate') }} <span class="text-gray-400">{{ t('onboarding.optional') }}</span>
            </label>
            <input
              v-model="form.birthDate"
              type="date"
              class="input"
              :max="maxBirthDate"
            />
            <p v-if="calculatedAge" class="text-xs text-brand-600 mt-1 font-medium">
              {{ t('onboarding.age', { n: calculatedAge }) }}
            </p>
          </div>
        </div>

        <!-- ── ÉTAPE 3 : Récapitulatif ───────────────────────── -->
        <div v-if="step === 3" class="space-y-4">
          <div class="flex flex-col items-center gap-3">
            <img
              :src="previewUrl || auth.profile?.photoURL || '/icons/icon-192.png'"
              class="w-20 h-20 rounded-full object-cover ring-4 ring-brand-100"
            />
            <p class="font-semibold text-gray-900">{{ form.name || auth.profile?.name }}</p>
          </div>

          <div class="bg-gray-50 rounded-2xl divide-y divide-gray-100">
            <RecapRow :label="t('onboarding.weight')"    :value="form.weight    ? `${form.weight} kg`  : '—'" />
            <RecapRow :label="t('onboarding.height')"    :value="form.height    ? `${form.height} cm`  : '—'" />
            <RecapRow :label="t('onboarding.birthDate')" :value="form.birthDate ? formatBirth(form.birthDate) : '—'" />
          </div>

          <p class="text-xs text-center text-gray-400">{{ t('onboarding.editLater') }}</p>
        </div>

        <!-- Erreur upload -->
        <p v-if="uploadError" class="text-red-600 text-xs text-center">{{ uploadError }}</p>

        <!-- Boutons de navigation -->
        <div class="flex gap-3">
          <button
            v-if="step > 1"
            class="btn-secondary flex-1"
            :disabled="saving"
            @click="step--"
          >
            {{ isRTL ? '→' : '←' }} {{ t('common.back') }}
          </button>

          <button
            class="btn-primary flex-1"
            :disabled="saving"
            @click="handleNext"
          >
            <span v-if="saving" class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
              {{ t('onboarding.saving') }}
            </span>
            <span v-else-if="step === TOTAL_STEPS">{{ t('onboarding.start') }}</span>
            <span v-else>{{ t('common.next') }} {{ isRTL ? '←' : '→' }}</span>
          </button>
        </div>

        <!-- Passer l'onboarding -->
        <button
          v-if="step < TOTAL_STEPS"
          class="w-full text-center text-xs text-gray-400 hover:text-gray-600 transition"
          @click="skipOnboarding"
        >
          {{ t('onboarding.skip') }}
        </button>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, defineComponent, h } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { storage } from '@/firebase'
import { ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'

const { t, locale } = useI18n()
const isRTL = computed(() => locale.value === 'he')
const auth   = useAuthStore()
const router = useRouter()

const TOTAL_STEPS = 3
const step        = ref(1)
const saving      = ref(false)
const uploadError = ref('')

// ── Form state ────────────────────────────────────────────
const form = ref({
  name:      auth.profile?.name ?? '',
  weight:    null,
  height:    null,
  birthDate: '',
})

// Photo
const previewUrl  = ref('')
const photoFile   = ref(null)   // Blob redimensionné prêt pour l'upload

/**
 * Redimensionne une image à max MAX_PX × MAX_PX en conservant les proportions,
 * puis la convertit en Blob JPEG (qualité 0.85).
 */
const MAX_PX = 350

function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
      const w = Math.round(img.width  * scale)
      const h = Math.round(img.height * scale)

      const canvas = document.createElement('canvas')
      canvas.width  = w
      canvas.height = h
      canvas.getContext('2d').drawImage(img, 0, 0, w, h)

      canvas.toBlob(
        (blob) => blob ? resolve(blob) : reject(new Error('Canvas toBlob failed')),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

async function onFileChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = t('onboarding.errorSize')
    return
  }
  uploadError.value = ''

  // Aperçu immédiat avec le fichier original
  previewUrl.value = URL.createObjectURL(file)

  // Redimensionnement en arrière-plan
  try {
    photoFile.value = await resizeImage(file)
  } catch {
    // Fallback : utilise le fichier original si le canvas échoue
    photoFile.value = file
  }
}

// ── Calcul de l'âge ───────────────────────────────────────
const maxBirthDate = computed(() => {
  const d = new Date()
  d.setFullYear(d.getFullYear() - 5)
  return d.toISOString().slice(0, 10)
})

const calculatedAge = computed(() => {
  if (!form.value.birthDate) return null
  const birth = new Date(form.value.birthDate)
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const m = today.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--
  return age > 0 ? age : null
})

function formatBirth(iso) {
  const localeCode = locale.value === 'he' ? 'he-IL' : 'en-US'
  return new Date(iso).toLocaleDateString(localeCode, {
    day: 'numeric', month: 'long', year: 'numeric',
  })
}

// ── Titres par étape — via i18n ───────────────────────────
const stepTitle = computed(() => {
  if (step.value === 1) return t('onboarding.stepPhoto')
  if (step.value === 2) return t('onboarding.stepInfo')
  return t('onboarding.stepRecap')
})

const stepSubtitle = computed(() => {
  if (step.value === 1) return t('onboarding.stepPhotoSub')
  if (step.value === 2) return t('onboarding.stepInfoSub')
  return t('onboarding.stepRecapSub')
})

// ── Navigation ────────────────────────────────────────────
async function handleNext() {
  if (step.value < TOTAL_STEPS) {
    step.value++
    return
  }
  // Dernière étape → sauvegarder
  await saveProfile()
}

async function skipOnboarding() {
  // Passe à l'étape suivante sans valider
  if (step.value < TOTAL_STEPS) {
    step.value++
  } else {
    await saveProfile()
  }
}

// ── Sauvegarde ────────────────────────────────────────────
async function saveProfile() {
  saving.value      = true
  uploadError.value = ''

  try {
    let photoURL = null

    // Upload photo — non bloquant : si Storage n'est pas configuré,
    // on continue avec la photo Google par défaut.
    if (photoFile.value) {
      try {
        const path    = `avatars/${auth.user.uid}`
        const fileRef = storageRef(storage, path)
        await uploadBytes(fileRef, photoFile.value)
        photoURL = await getDownloadURL(fileRef)
      } catch (uploadErr) {
        // Avertissement non bloquant — l'onboarding continue quand même
        uploadError.value = t('onboarding.photoUploadWarning')
        console.warn('Storage upload failed (Storage may not be enabled):', uploadErr.message)
      }
    }

    await auth.completeOnboarding({
      photoURL,
      weight:    form.value.weight    || null,
      height:    form.value.height    || null,
      birthDate: form.value.birthDate || null,
      name:      form.value.name !== auth.profile?.name ? form.value.name : null,
    })

    router.push(auth.isAdmin ? '/admin' : '/')

  } catch (err) {
    uploadError.value = t('onboarding.saveError')
    console.error('Onboarding save failed:', err)
  } finally {
    saving.value = false
  }
}

// ── Micro-composant ligne de récapitulatif ─────────────────
const RecapRow = defineComponent({
  props: ['label', 'value'],
  setup(props) {
    return () => h('div', { class: 'flex items-center justify-between px-4 py-3' }, [
      h('span', { class: 'text-sm text-gray-500' }, props.label),
      h('span', { class: 'text-sm font-semibold text-gray-800' }, props.value),
    ])
  },
})
</script>
