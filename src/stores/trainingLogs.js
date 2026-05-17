import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  doc,
  onSnapshot,
  setDoc,
  updateDoc,
  arrayUnion,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'
import { useGymStore } from './gym'
import { todayISO } from '@/utils/date'

export const useTrainingLogsStore = defineStore('trainingLogs', () => {
  /** Today's logs for the current user: Map<exerciseId, logDoc> */
  const todayLogs = ref({})
  /** All logs for stats chart: array of logDocs */
  const historyLogs = ref([])
  /** Admin monitor: all logs for a given slotId date */
  const monitorLogs = ref([])

  const loading = ref(false)
  const error   = ref(null)

  let unsubToday   = null
  let unsubHistory = null
  let unsubMonitor = null

  // ── Subscribe to today's logs (member view) ───────────────
  function subscribeToday() {
    if (unsubToday) return
    const auth = useAuthStore()
    const today = todayISO()
    const q = query(
      collection(db, 'trainingLogs'),
      where('userId', '==', auth.user.uid),
      where('date', '==', today)
    )
    unsubToday = onSnapshot(q, (snap) => {
      const map = {}
      snap.docs.forEach((d) => { map[d.data().exerciseId] = { id: d.id, ...d.data() } })
      todayLogs.value = map
    })
  }

  function unsubscribeToday() {
    unsubToday?.()
    unsubToday = null
    todayLogs.value = {}
  }

  // ── Subscribe to history (stats chart) ───────────────────
  function subscribeHistory(exerciseId) {
    unsubHistory?.()
    const auth = useAuthStore()
    const q = query(
      collection(db, 'trainingLogs'),
      where('userId', '==', auth.user.uid),
      where('exerciseId', '==', exerciseId),
      orderBy('date', 'asc')
    )
    unsubHistory = onSnapshot(q, (snap) => {
      historyLogs.value = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
    })
  }

  // ── Admin monitor: subscribe to all logs for a date ───────
  // gymId filter applied client-side to avoid composite index requirement
  function subscribeMonitor(date) {
    unsubMonitor?.()
    const gymStore = useGymStore()
    const q = query(
      collection(db, 'trainingLogs'),
      where('date', '==', date)
    )
    unsubMonitor = onSnapshot(q, (snap) => {
      const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
      monitorLogs.value = gymStore.gymId
        ? all.filter((l) => l.gymId === gymStore.gymId)
        : all
    })
  }

  function unsubscribeAll() {
    unsubToday?.();   unsubToday   = null
    unsubHistory?.(); unsubHistory = null
    unsubMonitor?.(); unsubMonitor = null
    todayLogs.value = {}
    historyLogs.value = []
    monitorLogs.value = []
  }

  // ──────────────────────────────────────────────────────────
  // Log a single set for an exercise.
  //
  // If a log document for (userId + exerciseId + today) already exists,
  // we append to its `sets` array. Otherwise we create it.
  // ──────────────────────────────────────────────────────────
  async function logSet({ planId, exerciseId, exerciseName, setNumber, actualWeight, actualReps }) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()
    const today = todayISO()

    const setEntry = {
      setNumber,
      actualWeight: Number(actualWeight),
      actualReps:   Number(actualReps),
      loggedAt:     Timestamp.now(),
    }

    const existing = todayLogs.value[exerciseId]

    if (existing) {
      // Append set to existing log
      await updateDoc(doc(db, 'trainingLogs', existing.id), {
        sets: arrayUnion(setEntry),
      })
    } else {
      // Create new log document (use deterministic ID for idempotency)
      const logId  = `${auth.user.uid}_${exerciseId}_${today}`
      await setDoc(doc(db, 'trainingLogs', logId), {
        userId:       auth.user.uid,
        planId,
        exerciseId,
        exerciseName,
        date:         today,
        gymId:        gymStore.gymId ?? null,
        sets:         [setEntry],
        completedAt:  null,
      })
    }
  }

  // ── Mark an exercise as completed ─────────────────────────
  async function markExerciseDone(exerciseId) {
    const existing = todayLogs.value[exerciseId]
    if (!existing) return
    await updateDoc(doc(db, 'trainingLogs', existing.id), {
      completedAt: serverTimestamp(),
    })
  }

  return {
    todayLogs,
    historyLogs,
    monitorLogs,
    loading,
    error,
    subscribeToday,
    unsubscribeToday,
    subscribeHistory,
    subscribeMonitor,
    unsubscribeAll,
    logSet,
    markExerciseDone,
  }
})
