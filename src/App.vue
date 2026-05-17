<template>
  <!-- Top navbar — hidden on login page -->
  <AppNavbar v-if="showNav" />

  <!--
    pb-20 on mobile: leaves space above the BottomNav bar (h-16 = 4rem + safe area).
    On md+ screens pb-0 since BottomNav is hidden there.
  -->
  <div :class="showBottomNav ? 'pb-20 md:pb-0' : ''">
    <RouterView />
  </div>

  <!-- Mobile bottom navigation (members only, not on login) -->
  <BottomNav v-if="showBottomNav" />
</template>

<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import AppNavbar from '@/components/shared/AppNavbar.vue'
import BottomNav from '@/components/shared/BottomNav.vue'

const route = useRoute()
const auth  = useAuthStore()

// Pas de nav sur login ni sur l'onboarding
const isAuthPage    = computed(() => route.meta.public || route.meta.onboarding)
const showNav       = computed(() => !isAuthPage.value)
const showBottomNav = computed(() => !isAuthPage.value && auth.isMember)
</script>
