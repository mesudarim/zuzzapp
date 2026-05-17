<template>
  <main class="max-w-xl mx-auto px-4 py-6 space-y-6">
    <h2 class="text-lg font-semibold">{{ t('gym.settings') }}</h2>

    <AppSpinner v-if="!gymStore.currentGym" />

    <template v-else>
      <!-- Logo -->
      <div class="card flex flex-col items-center gap-4 py-6">
        <div class="relative cursor-pointer group" @click="logoInput.click()">
          <img
            v-if="previewURL || gymStore.currentGym.logoURL"
            :src="previewURL || gymStore.currentGym.logoURL"
            class="w-24 h-24 rounded-full object-cover ring-4 ring-brand-100 shadow"
          />
          <div v-else class="w-24 h-24 rounded-full bg-brand-100 flex items-center justify-center text-3xl font-bold text-brand-700 shadow">
            {{ gymStore.currentGym.name?.[0] ?? '?' }}
          </div>
          <div class="absolute inset-0 rounded-full bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-2xl transition-opacity">
            📷
          </div>
        </div>
        <input ref="logoInput" type="file" accept="image/*" class="hidden" @change="onLogoChange" />
        <p class="text-xs text-gray-400">{{ t('gym.logoHint') }}</p>
      </div>

      <!-- Name + Slug -->
      <div class="card space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('gym.name') }}</label>
          <input
            v-model="name"
            type="text"
            class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">{{ t('gym.slug') }}</label>
          <p class="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 font-mono">
            /gym/{{ gymStore.currentGym.slug }}
          </p>
          <p class="text-xs text-gray-400 mt-1">{{ t('gym.slugHint') }}</p>
        </div>
      </div>

      <!-- Booking toggle -->
      <div class="card">
        <div class="flex items-center justify-between gap-4">
          <div>
            <p class="text-sm font-medium text-gray-800">{{ t('gym.showBooking') }}</p>
            <p class="text-xs text-gray-400 mt-0.5">{{ t('gym.showBookingHint') }}</p>
          </div>
          <button
            type="button"
            class="relative flex-shrink-0 w-11 h-6 rounded-full transition-colors duration-200"
            :class="showBooking ? 'bg-brand-600' : 'bg-gray-200'"
            @click="showBooking = !showBooking"
          >
            <span
              class="absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200"
              :class="showBooking ? 'translate-x-5' : 'translate-x-0'"
            />
          </button>
        </div>
      </div>

      <!-- Error / success -->
      <p v-if="error"   class="text-red-600 text-sm">{{ error }}</p>
      <p v-if="success" class="text-green-600 text-sm">{{ t('gym.saved') }}</p>

      <!-- Save -->
      <button class="btn-primary w-full" :disabled="saving" @click="save">
        {{ saving ? t('common.loading') : t('common.save') }}
      </button>
    </template>
  </main>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage'
import { useGymStore } from '@/stores/gym'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t } = useI18n()
const gymStore = useGymStore()

const name        = ref(gymStore.currentGym?.name ?? '')
const showBooking = ref(gymStore.showBooking)
const logoInput   = ref(null)
const previewURL  = ref(null)
const logoFile    = ref(null)
const saving      = ref(false)
const error       = ref('')
const success     = ref(false)

watch(() => gymStore.currentGym, (g) => {
  if (g) {
    name.value        = g.name
    showBooking.value = gymStore.showBooking
  }
}, { immediate: true })

function onLogoChange(e) {
  const file = e.target.files[0]
  if (!file) return
  if (file.size > 5 * 1024 * 1024) { error.value = t('onboarding.errorSize'); return }
  logoFile.value   = file
  previewURL.value = URL.createObjectURL(file)
}

async function save() {
  saving.value  = true
  error.value   = ''
  success.value = false
  try {
    const data = { name: name.value.trim(), showBooking: showBooking.value }

    if (logoFile.value) {
      const storage  = getStorage()
      const path     = `gyms/${gymStore.gymId}/logo.jpg`
      const ref_     = storageRef(storage, path)
      // Resize to max 350px client-side
      const resized  = await resizeImage(logoFile.value, 350)
      await uploadBytes(ref_, resized)
      data.logoURL = await getDownloadURL(ref_)
      previewURL.value = null
      logoFile.value   = null
    }

    await gymStore.updateGym(gymStore.gymId, data)
    success.value = true
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
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
</script>
