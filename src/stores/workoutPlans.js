import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  where,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'
import { useGymStore } from './gym'
import { todayISO } from '@/utils/date'
import { blocksToExercises } from '@/utils/planBlocks'

export const useWorkoutPlansStore = defineStore('workoutPlans', () => {
  /** Today's plan for the logged-in member */
  const todayPlan = ref(null)
  /** All plans (admin view) */
  const allPlans  = ref([])
  const loading   = ref(false)
  const error     = ref(null)

  let unsubToday = null
  let unsubAll   = null

  // ── Member: subscribe to today's plan ─────────────────────
  // Handles both legacy {date} and new {startDate, endDate} plans.
  function subscribeToday() {
    if (unsubToday) return
    const auth  = useAuthStore()
    const today = todayISO()

    // Fetch all plans for this user, filter client-side for today
    const q = query(
      collection(db, 'workoutPlans'),
      where('userId', '==', auth.user.uid)
    )
    unsubToday = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      // Prefer a plan whose range covers today; fall back to exact date match
      todayPlan.value =
        all.find((p) =>
          p.startDate && p.endDate
            ? p.startDate <= today && p.endDate >= today
            : p.date === today
        ) ?? null
    })
  }

  // ── Admin: subscribe to all plans ────────────────────────
  // gymId filter applied client-side to avoid composite index requirement.
  // No orderBy — sort client-side to handle both legacy {date} and new {startDate}.
  function subscribeAll() {
    if (unsubAll) return
    const gymStore = useGymStore()
    unsubAll = onSnapshot(
      collection(db, 'workoutPlans'),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        const filtered = gymStore.gymId
          ? all.filter((p) => p.gymId === gymStore.gymId)
          : all
        allPlans.value = filtered.sort((a, b) => {
          const da = b.startDate ?? b.date ?? ''
          const db_ = a.startDate ?? a.date ?? ''
          return da.localeCompare(db_)
        })
      }
    )
  }

  function unsubscribeAll() {
    unsubToday?.(); unsubToday = null
    unsubAll?.();   unsubAll   = null
    todayPlan.value = null
    allPlans.value  = []
  }

  // ── Admin CRUD ────────────────────────────────────────────
  async function savePlan({ userId, userName, startDate, endDate, blocks }) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()
    await addDoc(collection(db, 'workoutPlans'), {
      userId,
      userName:  userName  ?? '',
      date:      startDate,
      startDate,
      endDate,
      blocks,
      exercises: blocksToExercises(blocks), // backward compat for logger
      gymId:     gymStore.gymId ?? null,
      createdBy: auth.user.uid,
      createdAt: serverTimestamp(),
      updatedAt: null,
    })
  }

  // ── Member: create own plan (autonomous gyms) ─────────────
  async function saveSelfPlan({ startDate, endDate, blocks }) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()
    await addDoc(collection(db, 'workoutPlans'), {
      userId:      auth.user.uid,
      userName:    auth.profile?.name ?? '',
      date:        startDate,
      startDate,
      endDate,
      blocks,
      exercises:   blocksToExercises(blocks),
      gymId:       gymStore.gymId ?? null,
      createdBy:   auth.user.uid,
      selfCreated: true,
      createdAt:   serverTimestamp(),
      updatedAt:   null,
    })
  }

  async function updatePlan(id, data) {
    const payload = { ...data, updatedAt: serverTimestamp() }
    // Keep exercises[] in sync if blocks provided
    if (payload.blocks) payload.exercises = blocksToExercises(payload.blocks)
    await updateDoc(doc(db, 'workoutPlans', id), payload)
  }

  async function deletePlan(id) {
    await deleteDoc(doc(db, 'workoutPlans', id))
  }

  return {
    todayPlan, allPlans, loading, error,
    subscribeToday, subscribeAll, unsubscribeAll,
    savePlan, saveSelfPlan, updatePlan, deletePlan,
  }
})
