<template>
  <main class="max-w-lg mx-auto px-4 py-6 space-y-4">

    <!-- Profil + badge de rôle -->
    <div class="card flex items-center gap-4">
      <img
        v-if="auth.profile?.photoURL"
        :src="auth.profile.photoURL"
        class="w-14 h-14 rounded-full object-cover ring-2 ring-brand-500 shrink-0"
      />
      <div class="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-2xl shrink-0" v-else>
        {{ auth.profile?.name?.[0] ?? '?' }}
      </div>

      <div class="flex-1 min-w-0">
        <p class="font-semibold text-gray-900 truncate">{{ auth.profile?.name }}</p>
        <p class="text-sm text-gray-500 truncate">{{ auth.profile?.email }}</p>

        <!-- Badge rôle -->
        <span
          class="mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
          :class="auth.isAdmin
            ? 'bg-purple-100 text-purple-700'
            : 'bg-green-100 text-green-700'"
        >
          {{ auth.isAdmin ? `🧑‍💼 ${t('home.roleAdmin')}` : `🏃 ${t('home.roleMember')}` }}
        </span>
      </div>
    </div>

    <!-- Accès rapides membre -->
    <div class="grid grid-cols-2 gap-3">
      <router-link v-if="gymStore.showBooking" to="/book"
        class="card flex flex-col items-center gap-2 py-6 hover:shadow-md transition text-center">
        <span class="text-3xl">📅</span>
        <span class="text-sm font-medium">{{ t('nav.book') }}</span>
      </router-link>
      <router-link to="/workout"
        class="card flex flex-col items-center gap-2 py-6 hover:shadow-md transition text-center"
        :class="!gymStore.showBooking ? 'col-span-2' : ''">
        <span class="text-3xl">🏋️</span>
        <span class="text-sm font-medium">{{ t('nav.workout') }}</span>
      </router-link>
      <!-- Builder tile — only in autonomous gyms -->
      <router-link v-if="gymStore.isAutonomous" to="/workout/builder"
        class="card flex flex-col items-center gap-2 py-6 hover:shadow-md transition text-center col-span-2 border-2 border-brand-200">
        <span class="text-3xl">✏️</span>
        <span class="text-sm font-medium">{{ t('builder.title') }}</span>
        <span class="text-xs text-gray-400">{{ t('builder.homeHint') }}</span>
      </router-link>
      <router-link to="/stats"
        class="card flex flex-col items-center gap-2 py-6 hover:shadow-md transition text-center col-span-2">
        <span class="text-3xl">📈</span>
        <span class="text-sm font-medium">{{ t('nav.stats') }}</span>
      </router-link>
    </div>

    <!-- Encadré "Je suis entraîneur" — hidden in autonomous gyms -->
    <div v-if="!gymStore.isAutonomous"
      class="card border-dashed border-2 border-brand-200 bg-brand-50 text-center space-y-1.5 py-5">
      <p class="text-sm font-medium text-brand-800">🧑‍💼 {{ t('home.trainerQuestion') }}</p>
      <p class="text-xs text-brand-600 leading-relaxed">{{ t('home.trainerHint') }}</p>
    </div>

  </main>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '@/stores/auth'
import { useGymStore }  from '@/stores/gym'

const { t }    = useI18n()
const auth     = useAuthStore()
const gymStore = useGymStore()
</script>
