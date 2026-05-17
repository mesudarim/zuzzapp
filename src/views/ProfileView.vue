<template>
  <main class="max-w-lg mx-auto px-4 py-6 space-y-6">

    <h2 class="text-lg font-semibold text-gray-900">{{ t('profile.title') }}</h2>

    <!-- ── Photo ──────────────────────────────────────────── -->
    <div class="card flex flex-col items-center gap-4 py-6">
      <div class="relative group cursor-pointer" @click="triggerFileInput">
        <img
          :src="preview || auth.profile?.photoURL || '/icons/icon-192.png'"
          class="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100"
        />
        <div class="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100
                    flex items-center justify-center transition-opacity">
          <span class="text-white text-2xl">📷</span>
        </div>
      </div>

      <input
        ref="fileInput"
        type="file"
        accept="image/*"
        class="hidden"
        @change="onFileChange"
      />

      <p class="text-xs text-gray-400 text-center">{{ t('profile.photoHint') }}</p>

      <p v-if="photoError" class="text-xs text-red-600">{{ photoError }}</p>
    </div>

    <!-- ── Info form ──────────────────────────────────────── -->
    <form class="card space-y-4" @submit.prevent="handleSave">

      <!-- Name -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('onboarding.displayName') }}</label>
        <input
          v-model="form.name"
          type="text"
          class="input"
          :placeholder="auth.profile?.name"
        />
      </div>

      <!-- Weight -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('onboarding.weight') }}</label>
        <input
          v-model.number="form.weight"
          type="number"
          min="20"
          max="300"
          step="0.1"
          class="input"
          placeholder="—"
        />
      </div>

      <!-- Height -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('onboarding.height') }}</label>
        <input
          v-model.number="form.height"
          type="number"
          min="50"
          max="250"
          class="input"
          placeholder="—"
        />
      </div>

      <!-- Birth date -->
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('onboarding.birthDate') }}</label>
        <input
          v-model="form.birthDate"
          type="date"
          class="input"
          :max="maxBirthDate"
        />
      </div>

      <!-- Error / success -->
      <p v-if="saveError"   class="text-red-600 text-sm">{{ saveError }}</p>
      <p v-if="saveSuccess" class="text-green-600 text-sm font-medium">{{ saveSuccess }}</p>

      <button type="submit" class="btn-primary w-full" :disabled="saving">
        {{ saving ? t('onboarding.saving') : t('common.save') }}
      </button>
    </form>

  </main>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useI18n }     from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import {
  getStorage,
  ref as storageRef,
  uploadBytes,
  getDownloadURL,
} from 'firebase/storage'

const { t }  = useI18n()
const auth   = useAuthStore()

// ── Form init ─────────────────────────────────────────────
const form = reactive({
  name:      '',
  weight:    null,
  height:    null,
  birthDate: '',
})

const maxBirthDate = new Date().toISOString().slice(0, 10)

onMounted(() => {
  const p = auth.profile
  form.name      = p?.name      ?? ''
  form.weight    = p?.weight    ?? null
  form.height    = p?.height    ?? null
  form.birthDate = p?.birthDate ?? ''
})

// ── Photo ─────────────────────────────────────────────────
const fileInput  = ref(null)
const preview    = ref('')
const pendingFile = ref(null)
const photoError  = ref('')

function triggerFileInput() {
  fileInput.value?.click()
}

async function onFileChange(e) {
  photoError.value = ''
  const file = e.target.files?.[0]
  if (!file) return

  if (file.size > 5 * 1024 * 1024) {
    photoError.value = t('onboarding.errorSize')
    return
  }

  preview.value    = URL.createObjectURL(file)
  pendingFile.value = file
}

const MAX_PX = 350
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale  = Math.min(MAX_PX / img.width, MAX_PX / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width  = Math.round(img.width  * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error('resize failed'))),
        'image/jpeg',
        0.85
      )
    }
    img.onerror = reject
    img.src = URL.createObjectURL(file)
  })
}

// ── Save ──────────────────────────────────────────────────
const saving     = ref(false)
const saveError  = ref('')
const saveSuccess = ref('')

async function handleSave() {
  saving.value      = true
  saveError.value   = ''
  saveSuccess.value = ''

  let photoURL

  // Upload photo if a new one was selected
  if (pendingFile.value) {
    try {
      const blob    = await resizeImage(pendingFile.value)
      const storage = getStorage()
      const path    = `avatars/${auth.user.uid}.jpg`
      const fileRef = storageRef(storage, path)
      await uploadBytes(fileRef, blob, { contentType: 'image/jpeg' })
      photoURL = await getDownloadURL(fileRef)
      pendingFile.value = null
    } catch {
      // Non-blocking: keep existing photo
      photoURL = auth.profile?.photoURL
    }
  }

  try {
    await auth.updateProfile({
      name:      form.name      || auth.profile?.name,
      weight:    form.weight    || null,
      height:    form.height    || null,
      birthDate: form.birthDate || null,
      ...(photoURL !== undefined ? { photoURL } : {}),
    })
    saveSuccess.value = t('profile.saved')
    if (preview.value) {
      // Update preview to stored URL
      preview.value = auth.profile?.photoURL ?? preview.value
    }
  } catch (err) {
    saveError.value = err.message
  } finally {
    saving.value = false
  }
}
</script>
