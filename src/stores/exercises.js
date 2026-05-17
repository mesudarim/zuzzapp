import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'
import { useGymStore } from './gym'

export const useExercisesStore = defineStore('exercises', () => {
  const exercises = ref([])
  const loading   = ref(false)
  const error     = ref(null)

  let unsubGlobal = null
  let unsubGym    = null

  // ── Subscribe ─────────────────────────────────────────────
  // Two parallel subscriptions merged client-side:
  //  1. Global approved exercises (gymId == null, status == 'approved')
  //  2. This gym's own exercises (gymId == currentGymId, any status)
  // SuperAdmin (no gymId): only global approved.
  function subscribe() {
    if (unsubGlobal) return

    loading.value = true

    // Shared merge state
    let globalList = []
    let gymList    = []

    function merge() {
      // Combine, deduplicate by id, sort by name
      const all = [...globalList, ...gymList]
      const seen = new Set()
      exercises.value = all
        .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
        .sort((a, b) => {
          const strName = (v) => (typeof v === 'string' ? v : v?.en ?? v?.he ?? '')
          return strName(a.name).localeCompare(strName(b.name))
        })
      loading.value = false
    }

    // 1. Global approved exercises
    unsubGlobal = onSnapshot(
      query(
        collection(db, 'exercises'),
        where('gymId', '==', null),
        where('status', '==', 'approved')
      ),
      (snap) => {
        globalList = snap.docs.map((d) => ({ id: d.id, _scope: 'global', ...d.data() }))
        merge()
      },
      (err) => { error.value = err.message; loading.value = false }
    )

    // 2. Gym-specific exercises (all statuses so trainers see their pending ones)
    const gymStore = useGymStore()
    if (gymStore.gymId) {
      unsubGym = onSnapshot(
        query(collection(db, 'exercises'), where('gymId', '==', gymStore.gymId)),
        (snap) => {
          gymList = snap.docs.map((d) => ({ id: d.id, _scope: 'gym', ...d.data() }))
          merge()
        },
        (err) => { error.value = err.message }
      )
    }
  }

  function unsubscribeAll() {
    unsubGlobal?.(); unsubGlobal = null
    unsubGym?.();    unsubGym    = null
    exercises.value = []
  }

  // ── Add exercise ──────────────────────────────────────────
  // proposeGlobal: true → status='pending', stays in gym until superAdmin approves
  async function addExercise(data, proposeGlobal = false) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()
    await addDoc(collection(db, 'exercises'), {
      ...data,
      gymId:     gymStore.gymId ?? null,
      status:    proposeGlobal ? 'pending' : 'approved',
      createdBy: auth.user.uid,
      createdAt: serverTimestamp(),
    })
  }

  async function updateExercise(id, data) {
    await updateDoc(doc(db, 'exercises', id), data)
  }

  async function deleteExercise(id) {
    await deleteDoc(doc(db, 'exercises', id))
  }

  // ── SuperAdmin: fetch all pending proposals ────────────────
  async function fetchPendingProposals() {
    const snap = await getDocs(
      query(collection(db, 'exercises'), where('status', '==', 'pending'))
    )
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
  }

  // ── SuperAdmin: approve → make global ─────────────────────
  async function approveProposal(id) {
    await updateDoc(doc(db, 'exercises', id), {
      gymId:      null,
      status:     'approved',
      approvedAt: serverTimestamp(),
    })
  }

  // ── SuperAdmin: reject ────────────────────────────────────
  async function rejectProposal(id) {
    await updateDoc(doc(db, 'exercises', id), {
      status:     'rejected',
      rejectedAt: serverTimestamp(),
    })
  }

  // ── SuperAdmin: bulk import global exercises from JSON ────
  // Each item must have an `id` field used as the Firestore document ID.
  // Returns an array of { id, ok, error } results.
  async function importGlobalExercises(items) {
    const results = await Promise.allSettled(
      items.map((item) => {
        const { id, ...data } = item
        return setDoc(doc(db, 'exercises', id), {
          ...data,
          gymId:      null,
          status:     'approved',
          importedAt: serverTimestamp(),
        })
      })
    )
    return results.map((r, i) => ({
      id:    items[i].id,
      ok:    r.status === 'fulfilled',
      error: r.reason?.message ?? null,
    }))
  }

  return {
    exercises, loading, error,
    subscribe, unsubscribeAll,
    addExercise, updateExercise, deleteExercise,
    fetchPendingProposals, approveProposal, rejectProposal,
    importGlobalExercises,
  }
})
