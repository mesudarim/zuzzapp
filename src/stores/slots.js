import { defineStore } from 'pinia'
import { ref } from 'vue'
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
  query,
  where,
  orderBy,
  runTransaction,
  writeBatch,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuthStore } from './auth'
import { useGymStore } from './gym'

export const useSlotsStore = defineStore('slots', () => {
  const slots   = ref([])
  const loading = ref(false)
  const error   = ref(null)

  // ── Calendar (range) subscription — separate from day subscription ──
  const calendarSlots   = ref([])
  const calendarLoading = ref(false)

  let unsubscribe        = null
  let calendarUnsub      = null

  // ── Subscribe to a specific date ──────────────────────────
  function subscribeToDate(date) {
    unsubscribe?.()
    loading.value = true
    const gymStore = useGymStore()
    const constraints = [where('date', '==', date), orderBy('startTime')]
    if (gymStore.gymId) constraints.splice(1, 0, where('gymId', '==', gymStore.gymId))
    const q = query(collection(db, 'slots'), ...constraints)
    unsubscribe = onSnapshot(
      q,
      (snap) => {
        slots.value   = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        loading.value = false
      },
      (err) => {
        error.value   = err.message
        loading.value = false
      }
    )
  }

  function unsubscribeAll() {
    unsubscribe?.()
    unsubscribe = null
    slots.value = []
  }

  // ── Subscribe to a date range (for calendar view) ─────────
  // gymId filter applied client-side to avoid composite index requirement
  function subscribeCalendar(startDate, endDate) {
    calendarUnsub?.()
    calendarLoading.value = true
    const gymStore = useGymStore()
    const q = query(
      collection(db, 'slots'),
      where('date', '>=', startDate),
      where('date', '<=', endDate),
    )
    calendarUnsub = onSnapshot(
      q,
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        calendarSlots.value   = gymStore.gymId
          ? all.filter((s) => s.gymId === gymStore.gymId)
          : all
        calendarLoading.value = false
      },
      (err) => {
        console.error('Calendar subscription error:', err)
        calendarLoading.value = false
      }
    )
  }

  function unsubscribeCalendar() {
    calendarUnsub?.()
    calendarUnsub      = null
    calendarSlots.value = []
  }

  // ── Admin CRUD ────────────────────────────────────────────
  async function addSlot(data) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()
    await addDoc(collection(db, 'slots'), {
      ...data,
      gymId:       gymStore.gymId ?? null,
      bookedCount: 0,
      createdBy:   auth.user.uid,
      createdAt:   serverTimestamp(),
    })
  }

  async function updateSlot(id, data) {
    await updateDoc(doc(db, 'slots', id), data)
  }

  async function deleteSlot(id) {
    await deleteDoc(doc(db, 'slots', id))
  }

  // ── Member booking (atomic transaction) ───────────────────
  // Returns true on success, throws if full.
  async function bookSlot(slotId) {
    const auth   = useAuthStore()
    const slotRef = doc(db, 'slots', slotId)

    await runTransaction(db, async (tx) => {
      const slotSnap = await tx.get(slotRef)
      if (!slotSnap.exists()) throw new Error('Slot not found')

      const { bookedCount, capacity } = slotSnap.data()
      if (bookedCount >= capacity) throw new Error('Slot is full')

      // Increment counter
      tx.update(slotRef, { bookedCount: bookedCount + 1 })

      // Create booking document
      const bookingRef = doc(collection(db, 'bookings'))
      tx.set(bookingRef, {
        slotId,
        userId:       auth.user.uid,
        userName:     auth.profile.name,
        userPhotoURL: auth.profile.photoURL,
        bookedAt:     serverTimestamp(),
      })
    })
  }

  // ── Bulk creation / overwrite ─────────────────────────────
  // weekdays: array of JS day numbers (0=Sun…6=Sat)
  // timeSlots: array of { startTime, endTime }
  // Returns total number of slots written.
  async function bulkCreate({ startDate, endDate, weekdays, timeSlots, capacity, coachId, coachName }) {
    const auth     = useAuthStore()
    const gymStore = useGymStore()

    // 1. Generate all matching dates
    const dates = []
    const cur = new Date(startDate + 'T12:00:00')
    const end = new Date(endDate   + 'T12:00:00')
    while (cur <= end) {
      if (weekdays.includes(cur.getDay())) {
        dates.push(cur.toISOString().slice(0, 10))
      }
      cur.setDate(cur.getDate() + 1)
    }

    // 2. Fetch existing slots in range to detect overwrites
    const q = query(
      collection(db, 'slots'),
      where('date', '>=', startDate),
      where('date', '<=', endDate)
    )
    const snap = await getDocs(q)
    // key = "date_startTime" → existing docId
    const existing = {}
    snap.docs.forEach((d) => {
      const { date, startTime } = d.data()
      existing[`${date}_${startTime}`] = d.id
    })

    // 3. Write in batches of 499 (Firestore limit = 500)
    const batches = []
    let batch    = writeBatch(db)
    let opCount  = 0

    const flush = () => { batches.push(batch); batch = writeBatch(db); opCount = 0 }

    for (const date of dates) {
      for (const ts of timeSlots) {
        const key     = `${date}_${ts.startTime}`
        const payload = {
          date,
          startTime: ts.startTime,
          endTime:   ts.endTime,
          capacity,
          coachId,
          coachName,
          gymId:     gymStore.gymId ?? null,
        }

        if (existing[key]) {
          // Overwrite mutable fields — preserve bookedCount
          batch.update(doc(db, 'slots', existing[key]), payload)
        } else {
          const newRef = doc(collection(db, 'slots'))
          batch.set(newRef, {
            ...payload,
            bookedCount: 0,
            createdBy:   auth.user.uid,
            createdAt:   serverTimestamp(),
          })
        }

        opCount++
        if (opCount >= 499) flush()
      }
    }
    if (opCount > 0) flush()

    await Promise.all(batches.map((b) => b.commit()))
    return dates.length * timeSlots.length
  }

  return {
    slots, loading, error,
    calendarSlots, calendarLoading,
    subscribeToDate, unsubscribeAll,
    subscribeCalendar, unsubscribeCalendar,
    addSlot, updateSlot, deleteSlot, bookSlot, bulkCreate,
  }
})
