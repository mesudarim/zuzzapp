<template>
  <main class="max-w-lg mx-auto px-4 py-6 space-y-4">
    <h2 class="text-lg font-semibold text-gray-900">{{ t('slots.title') }}</h2>

    <input type="date" v-model="selectedDate" class="input max-w-[180px]" @change="onDateChange" />

    <AppSpinner v-if="slotsStore.loading" />
    <p v-else-if="!slotsStore.slots.length" class="text-gray-500 text-sm text-center py-8">
      {{ t('common.noData') }}
    </p>

    <div v-else class="space-y-3">
      <div v-for="slot in slotsStore.slots" :key="slot.id" class="card space-y-2">
        <div class="flex items-center justify-between">
          <span class="font-bold text-brand-700">{{ slot.startTime }} – {{ slot.endTime }}</span>
          <span class="badge" :class="isFull(slot) ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'">
            {{ isFull(slot) ? t('slots.full') : `${slot.capacity - slot.bookedCount} left` }}
          </span>
        </div>
        <p class="text-sm text-gray-600">🧑‍💼 {{ slot.coachName }}</p>
        <button
          class="btn-primary w-full"
          :disabled="isFull(slot) || pending === slot.id || isBooked(slot.id)"
          @click="handleBook(slot.id)"
        >
          {{ isBooked(slot.id) ? t('slots.booked') : pending === slot.id ? t('common.loading') : t('slots.book') }}
        </button>
      </div>
    </div>
  </main>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useSlotsStore } from '@/stores/slots'
import { todayISO } from '@/utils/date'
import AppSpinner from '@/components/shared/AppSpinner.vue'

const { t } = useI18n()
const slotsStore = useSlotsStore()

const selectedDate = ref(todayISO())
const pending      = ref(null)
const bookedSlots  = ref(new Set())

const isFull   = (slot) => slot.bookedCount >= slot.capacity
const isBooked = (slotId) => bookedSlots.value.has(slotId)

function onDateChange() { slotsStore.subscribeToDate(selectedDate.value) }

async function handleBook(slotId) {
  pending.value = slotId
  try {
    await slotsStore.bookSlot(slotId)
    bookedSlots.value.add(slotId)
  } catch (err) {
    alert(err.message)
  } finally {
    pending.value = null
  }
}

onMounted(() => slotsStore.subscribeToDate(selectedDate.value))
onUnmounted(() => slotsStore.unsubscribeAll())
</script>
