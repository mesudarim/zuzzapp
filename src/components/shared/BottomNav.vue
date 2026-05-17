<!--
  BottomNav — fixed bar at the bottom of the screen on mobile (< md breakpoint).
  Visible only for members. Admins use the top navbar which has more links.

  Uses safe-area-inset-bottom so it sits above the iPhone home indicator.
-->
<template>
  <nav
    class="fixed bottom-0 inset-x-0 z-40 md:hidden
           bg-white border-t border-gray-100 shadow-[0_-1px_6px_rgba(0,0,0,0.06)]"
    style="padding-bottom: env(safe-area-inset-bottom)"
  >
    <ul class="flex items-stretch h-16">
      <li v-for="item in navItems" :key="item.to" class="flex-1">
        <router-link
          :to="item.to"
          class="flex flex-col items-center justify-center gap-1 h-full w-full
                 text-gray-400 transition-colors"
          :class="isActive(item.to) ? 'text-brand-600' : 'hover:text-gray-600'"
        >
          <!-- Icon -->
          <span class="text-2xl leading-none">{{ item.icon }}</span>
          <!-- Label -->
          <span class="text-[10px] font-medium leading-none">{{ t(item.labelKey) }}</span>

          <!-- Active indicator dot -->
          <span
            v-if="isActive(item.to)"
            class="absolute bottom-2 w-1 h-1 rounded-full bg-brand-600"
          />
        </router-link>
      </li>
    </ul>
  </nav>
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useGymStore } from '@/stores/gym'

const { t }    = useI18n()
const route    = useRoute()
const gymStore = useGymStore()

const ALL_ITEMS = [
  { to: '/',        icon: '🏠', labelKey: 'nav.home',    always: true },
  { to: '/book',    icon: '📅', labelKey: 'nav.book',    always: false },
  { to: '/workout', icon: '🏋️', labelKey: 'nav.workout', always: true },
  { to: '/stats',   icon: '📈', labelKey: 'nav.stats',   always: true },
]

const navItems = computed(() =>
  ALL_ITEMS.filter((item) => item.always || gymStore.showBooking)
)

function isActive(path) {
  if (path === '/') return route.path === '/'
  return route.path.startsWith(path)
}
</script>
