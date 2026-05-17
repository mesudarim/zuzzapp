<template>
  <header class="sticky top-0 z-40 bg-white border-b border-gray-100 shadow-sm">
    <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-3">

      <!-- Hamburger (mobile, staff only) -->
      <button
        v-if="auth.isStaff"
        class="md:hidden p-2 rounded-lg hover:bg-gray-50 transition"
        @click="drawerOpen = true"
        aria-label="Menu"
      >
        <svg class="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16"/>
        </svg>
      </button>

      <!-- Logo -->
      <router-link
        :to="auth.isSuperAdmin ? '/superadmin' : auth.isStaff ? '/admin' : '/'"
        class="flex items-center gap-2 font-bold text-lg text-brand-700 tracking-tight"
      >
        <template v-if="auth.isSuperAdmin">
          <span>🏢 <span class="text-gray-400 text-sm font-medium">Super Admin</span></span>
        </template>
        <template v-else>
          <img
            v-if="gym.currentGym?.logoURL"
            :src="gym.currentGym.logoURL"
            class="w-7 h-7 rounded-full object-cover"
            :alt="gym.currentGym.name"
          />
          <span>{{ gym.currentGym?.name ?? 'Zuzz' }}<span class="text-gray-400">{{ gym.currentGym ? '' : 'App' }}</span></span>
        </template>
      </router-link>

      <!-- Nav links (desktop) -->
      <nav class="hidden md:flex items-center gap-1 text-sm font-medium flex-1 justify-center">
        <template v-if="auth.isSuperAdmin">
          <NavLink to="/superadmin">🏢 {{ t('superAdmin.title') }}</NavLink>
        </template>
        <template v-else-if="auth.isAdmin">
          <NavLink to="/admin">{{ t('nav.admin') }}</NavLink>
          <NavLink to="/admin/coaches">{{ t('nav.coaches') }}</NavLink>
          <NavLink to="/admin/exercises">{{ t('nav.exercises') }}</NavLink>
          <NavLink to="/admin/scheduler">{{ t('nav.scheduler') }}</NavLink>
          <NavLink to="/admin/plans">{{ t('nav.plans') }}</NavLink>
          <NavLink to="/admin/monitor">{{ t('nav.monitor') }}</NavLink>
          <NavLink to="/admin/users">{{ t('users.title') }}</NavLink>
          <NavLink to="/admin/gym">{{ t('gym.settings') }}</NavLink>
        </template>
        <template v-else-if="auth.isTrainer">
          <NavLink to="/admin">{{ t('nav.admin') }}</NavLink>
          <NavLink to="/admin/exercises">{{ t('nav.exercises') }}</NavLink>
          <NavLink to="/admin/scheduler">{{ t('nav.scheduler') }}</NavLink>
          <NavLink to="/admin/plans">{{ t('nav.plans') }}</NavLink>
          <NavLink to="/admin/monitor">{{ t('nav.monitor') }}</NavLink>
        </template>
        <template v-else-if="auth.isMember">
          <NavLink to="/">{{ t('nav.home') }}</NavLink>
          <NavLink to="/book">{{ t('nav.book') }}</NavLink>
          <NavLink to="/workout">{{ t('nav.workout') }}</NavLink>
          <NavLink to="/stats">{{ t('nav.stats') }}</NavLink>
        </template>
      </nav>

      <!-- Right side: lang switch + avatar -->
      <div class="flex items-center gap-2">
        <button
          class="text-xs font-semibold px-2 py-1 rounded-md border border-gray-200 hover:bg-gray-50 transition"
          @click="toggleLocale"
        >
          {{ locale === 'he' ? 'EN' : 'עב' }}
        </button>

        <div v-if="auth.user" class="relative" ref="menuRef">
          <button @click="menuOpen = !menuOpen">
            <img
              :src="auth.profile?.photoURL || '/icons/icon-192.png'"
              class="w-8 h-8 rounded-full object-cover ring-2 ring-brand-500"
              :alt="auth.profile?.name"
            />
          </button>
          <Transition name="fade">
            <div
              v-if="menuOpen"
              class="absolute end-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 text-sm z-50"
            >
              <p class="px-3 py-2 font-medium text-gray-800 truncate">{{ auth.profile?.name }}</p>
              <hr class="border-gray-100" />
              <router-link
                to="/profile"
                class="flex items-center gap-2 w-full text-start px-3 py-2 hover:bg-gray-50 text-gray-700"
                @click="menuOpen = false"
              >
                ✏️ {{ t('profile.title') }}
              </router-link>
              <hr class="border-gray-100" />
              <button class="w-full text-start px-3 py-2 hover:bg-gray-50 text-red-600" @click="handleSignOut">
                {{ t('auth.signOut') }}
              </button>
            </div>
          </Transition>
        </div>
      </div>
    </div>
  </header>

  <!-- ── Drawer mobile admin ──────────────────────────────── -->
  <Teleport to="body">
    <Transition name="drawer">
      <div v-if="drawerOpen" class="fixed inset-0 z-50 flex">
        <!-- Overlay -->
        <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="drawerOpen = false" />

        <!-- Panel -->
        <nav
          class="relative bg-white w-72 max-w-[85vw] h-full flex flex-col shadow-2xl"
          :class="locale === 'he' ? 'ms-auto' : ''"
        >
          <!-- En-tête du drawer -->
          <div class="flex items-center justify-between px-4 py-4 border-b border-gray-100">
            <div class="flex items-center gap-2">
              <template v-if="!auth.isSuperAdmin">
                <img v-if="gym.currentGym?.logoURL" :src="gym.currentGym.logoURL" class="w-7 h-7 rounded-full object-cover" />
              </template>
              <span class="font-bold text-brand-700 text-lg">{{ auth.isSuperAdmin ? 'Super Admin' : (gym.currentGym?.name ?? 'ZuzzApp') }}</span>
            </div>
            <button class="p-1.5 rounded-lg hover:bg-gray-100 transition" @click="drawerOpen = false">
              <svg class="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>

          <!-- Liens de navigation -->
          <div class="flex-1 overflow-y-auto py-3 px-2 space-y-1">
            <router-link
              v-for="link in adminLinks" :key="link.to"
              :to="link.to"
              class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
              :class="isDrawerLinkActive(link.to)
                ? 'bg-brand-50 text-brand-700'
                : 'text-gray-600 hover:bg-gray-50'"
              @click="drawerOpen = false"
            >
              <span class="text-xl w-7 text-center">{{ link.icon }}</span>
              <span>{{ link.label }}</span>
            </router-link>
          </div>

          <!-- Profil + déconnexion en bas -->
          <div class="border-t border-gray-100 px-4 py-4 space-y-3">
            <div class="flex items-center gap-3">
              <img
                v-if="auth.profile?.photoURL"
                :src="auth.profile.photoURL"
                class="w-9 h-9 rounded-full object-cover ring-2 ring-brand-200"
              />
              <div class="min-w-0">
                <p class="text-sm font-medium truncate">{{ auth.profile?.name }}</p>
                <p class="text-xs text-gray-400 truncate">{{ auth.profile?.email }}</p>
              </div>
            </div>
            <button
              class="w-full text-sm text-red-600 font-medium py-2 rounded-lg hover:bg-red-50 transition"
              @click="handleSignOut"
            >
              {{ t('auth.signOut') }}
            </button>
          </div>
        </nav>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { onClickOutside } from '@vueuse/core'
import { useAuthStore } from '@/stores/auth'
import { useGymStore } from '@/stores/gym'
import { applyLocale } from '@/utils/rtl'
import NavLink from './NavLink.vue'

const { t, locale } = useI18n()
const auth   = useAuthStore()
const gym    = useGymStore()
const router = useRouter()
const route  = useRoute()

const menuOpen  = ref(false)
const drawerOpen = ref(false)
const menuRef   = ref(null)
onClickOutside(menuRef, () => { menuOpen.value = false })

function toggleLocale() {
  const next = locale.value === 'en' ? 'he' : 'en'
  applyLocale(next, { locale })
}

async function handleSignOut() {
  menuOpen.value  = false
  drawerOpen.value = false
  await auth.signOut()
  router.push('/login')
}

// Ferme le drawer sur changement de route
router.afterEach(() => { drawerOpen.value = false })

const adminLinks = computed(() => {
  if (auth.isSuperAdmin) {
    return [
      { to: '/superadmin', icon: '🏢', label: t('superAdmin.title') },
    ]
  }
  const base = [
    { to: '/admin',           icon: '🏠', label: t('nav.admin')     },
    { to: '/admin/exercises', icon: '🏋️',  label: t('nav.exercises') },
    { to: '/admin/scheduler', icon: '📅',  label: t('nav.scheduler') },
    { to: '/admin/plans',     icon: '📋',  label: t('nav.plans')     },
    { to: '/admin/monitor',   icon: '📡',  label: t('nav.monitor')   },
  ]
  if (auth.isAdmin) {
    base.splice(1, 0, { to: '/admin/coaches', icon: '🧑‍💼', label: t('nav.coaches') })
    base.push(        { to: '/admin/users',   icon: '👥',  label: t('users.title') })
    base.push(        { to: '/admin/gym',     icon: '⚙️',  label: t('gym.settings') })
  }
  return base
})

function isDrawerLinkActive(to) {
  if (to === '/admin') return route.path === '/admin'
  return route.path.startsWith(to)
}
</script>

<style scoped>
.fade-enter-active, .fade-leave-active   { transition: opacity 0.15s; }
.fade-enter-from, .fade-leave-to         { opacity: 0; }

.drawer-enter-active, .drawer-leave-active { transition: opacity 0.25s; }
.drawer-enter-from, .drawer-leave-to       { opacity: 0; }
</style>
