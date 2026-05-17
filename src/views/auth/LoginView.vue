<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">

    <!-- Sélecteur de langue — en haut à droite de l'écran -->
    <div class="absolute top-4 end-4 flex gap-1 bg-white/10 rounded-xl p-1 backdrop-blur-sm">
      <button
        v-for="lang in langs"
        :key="lang.code"
        class="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all"
        :class="locale === lang.code
          ? 'bg-white text-brand-700 shadow-sm'
          : 'text-white/80 hover:text-white hover:bg-white/10'"
        @click="switchLocale(lang.code)"
      >
        {{ lang.label }}
      </button>
    </div>

    <!-- Carte de login -->
    <div class="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm text-center space-y-6">
      <!-- Logo gym ou logo ZuzzApp -->
      <div>
        <template v-if="gym.currentGym">
          <img
            v-if="gym.currentGym.logoURL"
            :src="gym.currentGym.logoURL"
            :alt="gym.currentGym.name"
            class="h-16 w-16 mx-auto rounded-full object-cover shadow mb-2"
          />
          <p class="text-2xl font-bold text-brand-700 tracking-tight">
            {{ gym.currentGym.name }}
          </p>
          <p class="text-xs text-gray-400 mt-0.5">{{ t('auth.poweredBy') }}</p>
        </template>
        <template v-else>
          <p class="text-3xl font-bold text-brand-700 tracking-tight">
            Zuzz<span class="text-gray-300">App</span>
          </p>
        </template>
        <p class="text-sm text-gray-500 mt-1">{{ t('auth.tagline') }}</p>
      </div>

      <!-- Error -->
      <p v-if="error" class="text-red-600 text-sm bg-red-50 rounded-lg px-3 py-2">{{ error }}</p>

      <!-- Google Sign-In -->
      <button
        class="w-full flex items-center justify-center gap-3 border border-gray-200
               rounded-xl py-3 text-sm font-medium text-gray-700 hover:bg-gray-50
               transition active:scale-95 disabled:opacity-50"
        :disabled="loading"
        @click="handleSignIn"
      >
        <svg class="w-5 h-5 shrink-0" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
        {{ loading ? t('common.loading') : t('auth.signInWithGoogle') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useGymStore } from '@/stores/gym'
import { applyLocale } from '@/utils/rtl'

const { t, locale } = useI18n()
const auth   = useAuthStore()
const gym    = useGymStore()
const router = useRouter()

const loading = ref(false)
const error   = ref('')

const langs = [
  { code: 'he', label: 'עברית' },
  { code: 'en', label: 'English' },
]

function switchLocale(code) {
  applyLocale(code, { locale })
}

async function handleSignIn() {
  loading.value = true
  error.value   = ''
  try {
    const profile = await auth.signInWithGoogle()
    router.push(profile.role === 'admin' ? '/admin' : '/')
  } catch (err) {
    error.value = err.message
  } finally {
    loading.value = false
  }
}
</script>
