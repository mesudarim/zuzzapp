import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useGymStore } from '@/stores/gym'

// superAdmin meta shorthand
const superOnly = { requiresAuth: true, roles: ['superAdmin'] }

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    // ── Super Admin ───────────────────────────────────────────
    {
      path: '/superadmin',
      name: 'SuperAdminDashboard',
      component: () => import('@/views/superadmin/DashboardView.vue'),
      meta: superOnly,
    },
    {
      path: '/superadmin/gym/:id',
      name: 'SuperAdminGym',
      component: () => import('@/views/superadmin/GymDetailView.vue'),
      meta: superOnly,
    },
    {
      path: '/superadmin/proposals',
      name: 'SuperAdminProposals',
      component: () => import('@/views/superadmin/ExerciseProposalsView.vue'),
      meta: superOnly,
    },
    {
      path: '/superadmin/exercises/import',
      name: 'SuperAdminExerciseImport',
      component: () => import('@/views/superadmin/ExerciseImportView.vue'),
      meta: superOnly,
    },

    // ── Gym entry point (sets gym context, then redirects to login) ──
    {
      path: '/gym/:slug',
      name: 'GymEntry',
      component: () => import('@/views/GymEntryView.vue'),
      meta: { public: true },
    },

    // ── Auth ─────────────────────────────────────────────────
    {
      path: '/login',
      name: 'Login',
      component: () => import('@/views/auth/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/onboarding',
      name: 'Onboarding',
      component: () => import('@/views/auth/OnboardingView.vue'),
      meta: { requiresAuth: true, onboarding: true },
    },

    // ── Profile (all roles) ──────────────────────────────────
    {
      path: '/profile',
      name: 'Profile',
      component: () => import('@/views/ProfileView.vue'),
      meta: { requiresAuth: true },
    },

    // ── Member ───────────────────────────────────────────────
    {
      path: '/',
      name: 'MemberHome',
      component: () => import('@/views/member/HomeView.vue'),
      meta: { requiresAuth: true, roles: ['member'] },
    },
    {
      path: '/book',
      name: 'BookSlot',
      component: () => import('@/views/member/BookSlotView.vue'),
      meta: { requiresAuth: true, roles: ['member'] },
    },
    {
      path: '/workout',
      name: 'WorkoutLogger',
      component: () => import('@/views/member/WorkoutLoggerView.vue'),
      meta: { requiresAuth: true, roles: ['member'] },
    },
    {
      path: '/workout/builder',
      name: 'WorkoutBuilder',
      component: () => import('@/views/member/WorkoutBuilderView.vue'),
      meta: { requiresAuth: true, roles: ['member'] },
    },
    {
      path: '/stats',
      name: 'Stats',
      component: () => import('@/views/member/StatsView.vue'),
      meta: { requiresAuth: true, roles: ['member'] },
    },

    // ── Admin + Trainer ───────────────────────────────────────
    // 'admin' only
    {
      path: '/admin',
      name: 'AdminDashboard',
      component: () => import('@/views/admin/DashboardView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'trainer'] },
    },
    {
      path: '/admin/coaches',
      name: 'AdminCoaches',
      component: () => import('@/views/admin/CoachesView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/admin/users',
      name: 'AdminUsers',
      component: () => import('@/views/admin/UsersView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    {
      path: '/admin/users/:uid',
      name: 'AdminUserDetail',
      component: () => import('@/views/admin/UserDetailView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] },
    },
    // 'admin' + 'trainer'
    {
      path: '/admin/exercises',
      name: 'AdminExercises',
      component: () => import('@/views/admin/ExercisesView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'trainer'] },
    },
    {
      path: '/admin/scheduler',
      name: 'AdminScheduler',
      component: () => import('@/views/admin/SchedulerView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'trainer'] },
    },
    {
      path: '/admin/plans',
      name: 'AdminPlans',
      component: () => import('@/views/admin/WorkoutPlansView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'trainer'] },
    },
    {
      path: '/admin/monitor',
      name: 'AdminMonitor',
      component: () => import('@/views/admin/MonitorView.vue'),
      meta: { requiresAuth: true, roles: ['admin', 'trainer'] },
    },
    {
      path: '/admin/gym',
      name: 'AdminGym',
      component: () => import('@/views/admin/GymSettingsView.vue'),
      meta: { requiresAuth: true, roles: ['admin'] },
    },
  ],
})

// ── Navigation Guard ─────────────────────────────────────────
router.beforeEach(async (to) => {
  const auth     = useAuthStore()
  const gymStore = useGymStore()

  if (!auth.ready) await auth.init()

  // Restore gym context from localStorage — skip for superAdmin (no gym affiliation)
  if (!auth.isSuperAdmin && !gymStore.currentGym) await gymStore.tryLoadFromStorage()

  if (to.meta.public) return true

  // Non connecté → login
  if (to.meta.requiresAuth && !auth.user) {
    return { name: 'Login' }
  }

  // Connecté mais onboarding pas encore fait
  if (auth.user && auth.needsOnboarding && !to.meta.onboarding) {
    return { name: 'Onboarding' }
  }

  // Onboarding terminé mais on essaie d'y accéder → rediriger
  if (auth.user && !auth.needsOnboarding && to.meta.onboarding) {
    if (auth.isSuperAdmin) return { name: 'SuperAdminDashboard' }
    return auth.isStaff ? { name: 'AdminDashboard' } : { name: 'MemberHome' }
  }

  // Vérification du rôle (roles = tableau)
  if (to.meta.roles && !to.meta.roles.includes(auth.profile?.role)) {
    if (auth.isSuperAdmin) return { name: 'SuperAdminDashboard' }
    return auth.isStaff ? { name: 'AdminDashboard' } : { name: 'MemberHome' }
  }

  // Booking désactivé → rediriger vers l'accueil
  if (to.name === 'BookSlot' && !gymStore.showBooking) {
    return { name: 'MemberHome' }
  }

  return true
})

export default router
