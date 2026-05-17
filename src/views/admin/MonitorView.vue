<template>
  <main class="max-w-5xl mx-auto px-4 py-6 space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center gap-3">
      <h2 class="text-lg font-semibold">{{ t('monitor.title') }}</h2>
      <input type="date" v-model="selectedDate" class="input max-w-[180px] sm:ms-auto"
             @change="onDateChange" />
    </div>

    <!-- Slot selector -->
    <div v-if="slotsStore.slots.length">
      <label class="text-xs text-gray-600 mb-1 block">{{ t('monitor.selectSlot') }}</label>
      <select v-model="selectedSlotId" class="input max-w-xs">
        <option value="" disabled>—</option>
        <option v-for="slot in slotsStore.slots" :key="slot.id" :value="slot.id">
          {{ slot.startTime }} – {{ slot.endTime }} ({{ slot.coachName }})
        </option>
      </select>
    </div>

    <AppSpinner v-if="slotsStore.loading" />
    <p v-else-if="!slotsStore.slots.length" class="text-gray-400 text-sm text-center py-8">{{ t('common.noData') }}</p>

    <!-- Member performance table -->
    <div v-if="selectedSlotId && bookedUsers.length" class="overflow-x-auto">
      <table class="w-full text-sm border-separate border-spacing-y-2">
        <thead>
          <tr class="text-xs text-gray-500 uppercase tracking-wide">
            <th class="text-start ps-2">{{ t('monitor.members') }}</th>
            <th>{{ t('monitor.exercise') }}</th>
            <th>{{ t('monitor.setsLogged') }}</th>
            <th>{{ t('monitor.lastWeight') }}</th>
            <th>{{ t('monitor.lastReps') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in tableRows"
            :key="row.userId + row.exerciseId"
            class="bg-white rounded-lg shadow-sm"
          >
            <td class="py-2 ps-2 pe-4 rounded-s-lg">
              <div class="flex items-center gap-2">
                <img v-if="row.userPhotoURL" :src="row.userPhotoURL"
                     class="w-7 h-7 rounded-full object-cover" />
                <span class="font-medium truncate max-w-[120px]">{{ row.userName }}</span>
              </div>
            </td>
            <td class="py-2 px-3 text-gray-700">{{ row.exerciseName }}</td>
            <td class="py-2 px-3 text-center font-semibold text-brand-700">{{ row.setsLogged }}</td>
            <td class="py-2 px-3 text-center">{{ row.lastWeight }} kg</td>
            <td class="py-2 px-3 text-center rounded-e-lg">{{ row.lastReps }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <p v-else-if="selectedSlotId && !bookedUsers.length" class="text-gray-400 text-sm text-center py-8">
      {{ t('monitor.noMembers') }}
    </p>
  </main>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  collection, query, where, onSnapshot,
} from 'firebase/firestore'
import { db } from '@/firebase'
import { useSlotsStore }        from '@/stores/slots'
import { useTrainingLogsStore } from '@/stores/trainingLogs'
import { todayISO }             from '@/utils/date'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t } = useI18n()
const slotsStore = useSlotsStore()
const logsStore  = useTrainingLogsStore()

const selectedDate   = ref(todayISO())
const selectedSlotId = ref('')
const bookedUsers    = ref([])   // bookings for selected slot

let unsubBookings = null

function onDateChange() {
  selectedSlotId.value = ''
  slotsStore.subscribeToDate(selectedDate.value)
  logsStore.subscribeMonitor(selectedDate.value)
}

// Subscribe to bookings when slot changes
watch(selectedSlotId, (slotId) => {
  unsubBookings?.()
  bookedUsers.value = []
  if (!slotId) return

  const q = query(collection(db, 'bookings'), where('slotId', '==', slotId))
  unsubBookings = onSnapshot(q, (snap) => {
    bookedUsers.value = snap.docs.map((d) => d.data())
  })
})

// Join bookings with training logs for the table
const tableRows = computed(() => {
  const rows = []
  for (const user of bookedUsers.value) {
    const userLogs = logsStore.monitorLogs.filter((l) => l.userId === user.userId)
    if (userLogs.length === 0) {
      rows.push({
        userId: user.userId, userName: user.userName, userPhotoURL: user.userPhotoURL,
        exerciseId: '', exerciseName: '—', setsLogged: 0, lastWeight: '—', lastReps: '—',
      })
    } else {
      for (const log of userLogs) {
        const last = log.sets[log.sets.length - 1]
        rows.push({
          userId: user.userId, userName: user.userName, userPhotoURL: user.userPhotoURL,
          exerciseId: log.exerciseId, exerciseName: log.exerciseName,
          setsLogged: log.sets.length,
          lastWeight: last?.actualWeight ?? '—',
          lastReps:   last?.actualReps ?? '—',
        })
      }
    }
  }
  return rows
})

onMounted(() => {
  slotsStore.subscribeToDate(selectedDate.value)
  logsStore.subscribeMonitor(selectedDate.value)
})

onUnmounted(() => {
  unsubBookings?.()
  slotsStore.unsubscribeAll()
  logsStore.unsubscribeAll()
})
</script>
