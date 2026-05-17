import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  onSnapshot,
  getDocs,
  setDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useGymStore } from './gym'

export const useCoachesStore = defineStore('coaches', () => {
  const coaches  = ref([])
  const loading  = ref(false)
  const error    = ref(null)

  let unsubscribe = null

  function gymQuery() {
    const gymStore = useGymStore()
    return gymStore.gymId
      ? query(collection(db, 'coaches'), where('gymId', '==', gymStore.gymId))
      : collection(db, 'coaches')
  }

  // ── Immediate load ────────────────────────────────────────
  async function fetchOnce() {
    loading.value = true
    error.value   = null
    try {
      const snap = await getDocs(gymQuery())
      coaches.value = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
    } catch (err) {
      error.value = err.message
      console.error('[coaches] fetchOnce:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Real-time listener ────────────────────────────────────
  function subscribe() {
    if (unsubscribe) return
    unsubscribe = onSnapshot(
      gymQuery(),
      (snap) => {
        coaches.value = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.name ?? '').localeCompare(b.name ?? ''))
        error.value = null
      },
      (err) => {
        error.value = err.message
        console.error('[coaches] snapshot:', err)
      }
    )
  }

  function unsubscribeAll() {
    unsubscribe?.()
    unsubscribe = null
  }

  // ── Promote user to coach ─────────────────────────────────
  async function promoteToCoach(user) {
    const gymStore = useGymStore()
    await setDoc(doc(db, 'coaches', user.uid), {
      uid:       user.uid,
      name:      user.name,
      email:     user.email,
      photoURL:  user.photoURL ?? null,
      bio:       user.bio ?? '',
      gymId:     gymStore.gymId ?? null,
      createdAt: serverTimestamp(),
    })
  }

  async function removeCoach(uid) {
    await deleteDoc(doc(db, 'coaches', uid))
  }

  async function updateCoach(uid, data) {
    await setDoc(doc(db, 'coaches', uid), data, { merge: true })
  }

  return {
    coaches, loading, error,
    fetchOnce, subscribe, unsubscribeAll,
    promoteToCoach, removeCoach, updateCoach,
  }
})
