<template>
  <main class="max-w-5xl mx-auto px-4 py-6">
    <h1 class="text-xl font-bold text-gray-900 mb-6">{{ t('nav.admin') }}</h1>
    <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
      <router-link
        v-for="card in cards" :key="card.to"
        :to="card.to"
        class="card flex flex-col items-center gap-3 py-8 hover:shadow-md transition text-center"
      >
        <span class="text-4xl">{{ card.icon }}</span>
        <span class="text-sm font-semibold text-gray-700">{{ card.label }}</span>
      </router-link>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const cards = computed(() => [
  { to: '/admin/coaches',   icon: '🧑‍💼', label: t('nav.coaches')   },
  { to: '/admin/exercises', icon: '🏋️',  label: t('nav.exercises') },
  { to: '/admin/scheduler', icon: '📅',  label: t('nav.scheduler') },
  { to: '/admin/plans',     icon: '📋',  label: t('nav.plans')     },
  { to: '/admin/monitor',   icon: '📡',  label: t('nav.monitor')   },
  { to: '/admin/users',     icon: '👥',  label: t('users.title')   },
])
</script>
