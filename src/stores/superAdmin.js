import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  doc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'

// Collections that carry a gymId field
const COLLECTIONS = ['users', 'exercises', 'coaches', 'workoutPlans', 'slots', 'trainingLogs']

export const useSuperAdminStore = defineStore('superAdmin', () => {
  const gyms        = ref([])
  const gymsLoading = ref(false)

  const gymUsers        = ref([])
  const gymUsersLoading = ref(false)

  let unsubGyms     = null
  let unsubGymUsers = null

  // ── All gyms subscription ──────────────────────────────────
  function subscribeGyms() {
    if (unsubGyms) return
    gymsLoading.value = true
    unsubGyms = onSnapshot(
      collection(db, 'gyms'),
      (snap) => {
        gyms.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        gymsLoading.value = false
      }
    )
  }

  function unsubscribeGyms() {
    unsubGyms?.()
    unsubGyms  = null
    gyms.value = []
  }

  // ── Users for one gym ──────────────────────────────────────
  function subscribeGymUsers(gymId) {
    unsubGymUsers?.()
    gymUsersLoading.value = true
    unsubGymUsers = onSnapshot(
      query(collection(db, 'users'), where('gymId', '==', gymId)),
      (snap) => {
        gymUsers.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        gymUsersLoading.value = false
      }
    )
  }

  function unsubscribeGymUsers() {
    unsubGymUsers?.()
    unsubGymUsers  = null
    gymUsers.value = []
  }

  // ── Create gym ─────────────────────────────────────────────
  async function createGym({ name, slug }) {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const existing = await getDocs(
      query(collection(db, 'gyms'), where('slug', '==', clean))
    )
    if (!existing.empty) throw new Error('slug_taken')

    const ref = await addDoc(collection(db, 'gyms'), {
      name,
      slug:      clean,
      logoURL:   '',
      createdAt: serverTimestamp(),
    })
    return ref.id
  }

  // ── Update gym ─────────────────────────────────────────────
  async function updateGym(gymId, data) {
    await updateDoc(doc(db, 'gyms', gymId), data)
  }

  // ── Assign user role ───────────────────────────────────────
  async function setUserRole(uid, role) {
    await updateDoc(doc(db, 'users', uid), { role })
  }

  // ── Move user to gym ───────────────────────────────────────
  async function setUserGym(uid, gymId) {
    await updateDoc(doc(db, 'users', uid), { gymId })
  }

  // ── Fetch single gym ───────────────────────────────────────
  async function fetchGym(gymId) {
    const snap = await getDoc(doc(db, 'gyms', gymId))
    if (!snap.exists()) return null
    return { id: snap.id, ...snap.data() }
  }

  // ── Search user by email ───────────────────────────────────
  async function searchUserByEmail(email) {
    const snap = await getDocs(
      query(collection(db, 'users'), where('email', '==', email.toLowerCase()))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  // ── Migrate legacy data to a gym ──────────────────────────
  // Catches documents where gymId is null OR the field is missing entirely
  // (Firestore's where('gymId','==',null) misses docs without the field).
  // Returns a count map: { users: N, exercises: N, ... }
  async function migrateLegacyData(targetGymId, onProgress) {
    const counts = {}

    for (const col of COLLECTIONS) {
      onProgress?.(col)

      // Full collection scan — filter client-side for missing/null gymId
      const snap = await getDocs(collection(db, col))
      const unassigned = snap.docs.filter((d) => !d.data().gymId)

      counts[col] = unassigned.length
      if (unassigned.length === 0) continue

      // Write in batches of 499
      let batch   = writeBatch(db)
      let opCount = 0

      for (const d of unassigned) {
        batch.update(doc(db, col, d.id), { gymId: targetGymId })
        opCount++
        if (opCount >= 499) {
          await batch.commit()
          batch   = writeBatch(db)
          opCount = 0
        }
      }
      if (opCount > 0) await batch.commit()
    }

    return counts
  }

  return {
    gyms, gymsLoading,
    gymUsers, gymUsersLoading,
    subscribeGyms, unsubscribeGyms,
    subscribeGymUsers, unsubscribeGymUsers,
    createGym, updateGym,
    setUserRole, setUserGym,
    fetchGym, searchUserByEmail,
    migrateLegacyData,
  }
})
