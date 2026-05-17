import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onAuthStateChanged,
} from 'firebase/auth'
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useGymStore } from './gym'

export const useAuthStore = defineStore('auth', () => {
  const user    = ref(null)
  const profile = ref(null)
  const ready   = ref(false)

  const isSuperAdmin    = computed(() => profile.value?.role === 'superAdmin')
  const isAdmin         = computed(() => profile.value?.role === 'admin')
  const isTrainer       = computed(() => profile.value?.role === 'trainer')
  const isMember        = computed(() => profile.value?.role === 'member')
  const isStaff         = computed(() => isAdmin.value || isTrainer.value || isSuperAdmin.value)
  const needsOnboarding = computed(() => !!profile.value && !profile.value.onboardingDone)

  // ── Init ──────────────────────────────────────────────────
  function init() {
    return new Promise((resolve) => {
      const auth = getAuth()
      const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          user.value = firebaseUser
          await loadProfile(firebaseUser)
        } else {
          user.value    = null
          profile.value = null
        }
        ready.value = true
        unsub()
        resolve()
      })
    })
  }

  // ── Load / create Firestore profile ───────────────────────
  async function loadProfile(firebaseUser) {
    const gymStore = useGymStore()
    const docRef   = doc(db, 'users', firebaseUser.uid)
    const snap     = await getDoc(docRef)

    if (snap.exists()) {
      profile.value = snap.data()
      // Restore gym context if not already loaded
      if (profile.value.gymId && !gymStore.currentGym) {
        await gymStore.loadById(profile.value.gymId)
      }
    } else {
      // First-time login → create profile with current gym context
      const newProfile = {
        uid:            firebaseUser.uid,
        name:           firebaseUser.displayName,
        email:          firebaseUser.email,
        photoURL:       firebaseUser.photoURL,
        role:           'member',
        gymId:          gymStore.gymId ?? null,
        onboardingDone: false,
        weight:         null,
        height:         null,
        birthDate:      null,
        createdAt:      serverTimestamp(),
      }
      await setDoc(docRef, newProfile)
      profile.value = newProfile
    }
  }

  // ── Google Sign-In ────────────────────────────────────────
  async function signInWithGoogle() {
    const auth     = getAuth()
    const provider = new GoogleAuthProvider()
    const result   = await signInWithPopup(auth, provider)
    user.value = result.user
    await loadProfile(result.user)
    ready.value = true
    return profile.value
  }

  // ── Onboarding ────────────────────────────────────────────
  async function completeOnboarding({ photoURL, weight, height, birthDate, name } = {}) {
    const data = {
      onboardingDone: true,
      weight:    weight    || null,
      height:    height    || null,
      birthDate: birthDate || null,
    }
    if (photoURL) data.photoURL = photoURL
    if (name)     data.name     = name
    await setDoc(doc(db, 'users', user.value.uid), data, { merge: true })
    profile.value = { ...profile.value, ...data }
  }

  // ── Update profile ────────────────────────────────────────
  async function updateProfile({ photoURL, weight, height, birthDate, name } = {}) {
    const data = {
      weight:    weight    ?? null,
      height:    height    ?? null,
      birthDate: birthDate ?? null,
    }
    if (photoURL !== undefined) data.photoURL = photoURL
    if (name)                   data.name     = name
    await setDoc(doc(db, 'users', user.value.uid), data, { merge: true })
    profile.value = { ...profile.value, ...data }
  }

  // ── Sign Out ──────────────────────────────────────────────
  async function signOut() {
    await firebaseSignOut(getAuth())
    user.value    = null
    profile.value = null
  }

  return {
    user, profile, ready,
    isSuperAdmin, isAdmin, isTrainer, isMember, isStaff, needsOnboarding,
    init, signInWithGoogle, signOut, completeOnboarding, updateProfile,
  }
})
