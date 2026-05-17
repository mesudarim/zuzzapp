<template>
  <div class="space-y-4">

    <!-- ── Controls ──────────────────────────────────────── -->
    <div class="flex flex-wrap items-center gap-2">
      <!-- View toggle -->
      <div class="flex gap-1 bg-gray-100 rounded-xl p-1 shrink-0">
        <button
          v-for="v in viewOptions" :key="v.key" type="button"
          class="px-3 py-1 rounded-lg text-sm font-medium transition-colors"
          :class="view === v.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          @click="setView(v.key)"
        >{{ v.label }}</button>
      </div>

      <!-- Navigation -->
      <button type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition font-bold text-lg"
        @click="prev">‹</button>
      <span class="font-semibold text-gray-800 text-sm min-w-[160px] text-center">{{ periodLabel }}</span>
      <button type="button"
        class="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100 transition font-bold text-lg"
        @click="next">›</button>

      <button type="button" class="btn-secondary text-xs ms-auto" @click="goToday">
        {{ t('scheduler.today') }}
      </button>
    </div>

    <AppSpinner v-if="slotsStore.calendarLoading" />

    <!-- ══ MONTH VIEW ═══════════════════════════════════════ -->
    <template v-else-if="view === 'month'">
      <div class="grid grid-cols-7 text-center">
        <div v-for="h in dayHeaders" :key="h" class="text-xs font-medium text-gray-400 py-1">{{ h }}</div>
      </div>
      <div class="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
        <div
          v-for="cell in monthCells" :key="cell.date"
          class="p-1 min-h-[80px] sm:min-h-[100px] cursor-pointer transition-colors"
          :class="[cell.inMonth ? 'bg-white hover:bg-gray-50' : 'bg-gray-50']"
          @click="openDay(cell.date)"
        >
          <div
            class="w-6 h-6 flex items-center justify-center rounded-full text-xs mb-1 mx-auto sm:mx-0"
            :class="cell.isToday
              ? 'bg-brand-600 text-white font-bold'
              : cell.inMonth ? 'text-gray-600' : 'text-gray-300'"
          >{{ cell.day }}</div>

          <div
            v-for="slot in cell.slots.slice(0, 3)" :key="slot.id"
            class="text-[10px] sm:text-xs px-1.5 py-0.5 rounded mb-0.5 truncate cursor-pointer leading-snug transition-colors"
            :class="slotChipClass(slot)"
            @click.stop="openEdit(slot)"
          >{{ slot.startTime }} {{ slot.coachName?.split(' ')[0] ?? '' }}</div>

          <div v-if="cell.slots.length > 3" class="text-[10px] text-gray-400 ps-1">
            +{{ cell.slots.length - 3 }}
          </div>
        </div>
      </div>
    </template>

    <!-- ══ WEEK VIEW — time grid ═════════════════════════════ -->
    <template v-else-if="view === 'week'">
      <!-- Sticky day-header row -->
      <div class="flex border-b border-gray-100 pb-1">
        <div class="w-14 shrink-0" />
        <div class="grid grid-cols-7 flex-1 min-w-[560px]">
          <div v-for="day in weekDays" :key="day.date" class="text-center px-0.5">
            <p class="text-[10px] sm:text-xs text-gray-400 uppercase tracking-wide">{{ day.header }}</p>
            <div
              class="w-7 h-7 mx-auto flex items-center justify-center rounded-full text-sm font-semibold mt-0.5 cursor-pointer hover:bg-gray-100 transition"
              :class="day.isToday ? 'bg-brand-600 text-white' : 'text-gray-700'"
              @click="openDay(day.date)"
            >{{ day.dayNum }}</div>
          </div>
        </div>
      </div>

      <!-- Scrollable time grid -->
      <div class="overflow-x-auto overflow-y-auto rounded-xl border border-gray-200" style="max-height: 620px">
        <div class="flex min-w-[620px]" :style="{height: TOTAL_HEIGHT + 'px'}">

          <!-- Time labels -->
          <div class="w-14 shrink-0 relative border-e border-gray-100">
            <div
              v-for="h in HOURS" :key="h"
              class="absolute w-full pe-2 text-right"
              :style="{top: hourTop(h) - 8 + 'px'}"
            >
              <span class="text-[10px] sm:text-xs text-gray-400 leading-none">
                {{ String(h).padStart(2,'0') }}:00
              </span>
            </div>
          </div>

          <!-- Day columns -->
          <div class="grid flex-1 relative" :style="{gridTemplateColumns: 'repeat(7, 1fr)'}">
            <!-- Hour lines (shared background) -->
            <div
              v-for="h in HOURS" :key="'line' + h"
              class="absolute w-full border-t border-gray-100 pointer-events-none"
              :style="{top: hourTop(h) + 'px'}"
            />
            <!-- Half-hour lines -->
            <div
              v-for="h in HOURS" :key="'half' + h"
              class="absolute w-full border-t border-gray-50 pointer-events-none"
              :style="{top: hourTop(h) + PX_PER_HOUR / 2 + 'px'}"
            />

            <!-- Today column highlight -->
            <div
              v-if="todayColIndex >= 0"
              class="absolute top-0 bottom-0 bg-brand-50/40 pointer-events-none"
              :style="{
                left: (todayColIndex / 7 * 100) + '%',
                width: (1 / 7 * 100) + '%'
              }"
            />

            <!-- Per-day slot columns -->
            <div
              v-for="day in weekDays" :key="day.date + '_col'"
              class="relative border-e border-gray-100 last:border-e-0"
            >
              <div
                v-for="slot in day.slots" :key="slot.id"
                class="absolute inset-x-0.5 sm:inset-x-1 rounded-lg px-1 sm:px-1.5 py-1 cursor-pointer overflow-hidden transition-colors"
                :class="slotCardClass(slot)"
                :style="slotStyle(slot)"
                @click="openEdit(slot)"
              >
                <p class="font-bold text-[10px] sm:text-xs leading-tight">{{ slot.startTime }}–{{ slot.endTime }}</p>
                <p class="text-[10px] truncate opacity-75 hidden sm:block">{{ slot.coachName }}</p>
                <p class="text-[10px] opacity-60">{{ slot.bookedCount }}/{{ slot.capacity }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ DAY VIEW ══════════════════════════════════════════ -->
    <template v-else-if="view === 'day'">
      <!-- Scrollable time grid — single day -->
      <div class="overflow-y-auto rounded-xl border border-gray-200" style="max-height: 640px">
        <div class="flex" :style="{height: TOTAL_HEIGHT + 'px'}">
          <!-- Time labels -->
          <div class="w-14 shrink-0 relative border-e border-gray-100">
            <div
              v-for="h in HOURS" :key="h"
              class="absolute w-full pe-2 text-right"
              :style="{top: hourTop(h) - 8 + 'px'}"
            ><span class="text-xs text-gray-400">{{ String(h).padStart(2,'0') }}:00</span></div>
          </div>

          <!-- Single day column -->
          <div class="flex-1 relative">
            <!-- Hour lines -->
            <div
              v-for="h in HOURS" :key="'line' + h"
              class="absolute w-full border-t border-gray-100 pointer-events-none"
              :style="{top: hourTop(h) + 'px'}"
            />
            <div
              v-for="h in HOURS" :key="'half' + h"
              class="absolute w-full border-t border-gray-50 pointer-events-none"
              :style="{top: hourTop(h) + PX_PER_HOUR / 2 + 'px'}"
            />

            <!-- Empty state -->
            <div
              v-if="daySlots.length === 0"
              class="absolute inset-0 flex items-center justify-center"
            >
              <p class="text-gray-400 text-sm">{{ t('scheduler.noSlots') }}</p>
            </div>

            <!-- Slots -->
            <div
              v-for="slot in daySlots" :key="slot.id"
              class="absolute inset-x-2 sm:inset-x-4 rounded-xl px-3 py-2 cursor-pointer transition-colors"
              :class="slotCardClass(slot)"
              :style="slotStyle(slot)"
              @click="openEdit(slot)"
            >
              <p class="font-bold text-sm leading-tight">{{ slot.startTime }} – {{ slot.endTime }}</p>
              <p class="text-xs text-gray-600 mt-0.5">🧑‍💼 {{ slot.coachName }}</p>
              <p class="text-xs text-gray-400 mt-0.5">{{ slot.bookedCount }} / {{ slot.capacity }} {{ t('slots.spotsLeft', slot.capacity - slot.bookedCount) }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ══ EDIT MODAL ════════════════════════════════════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="editOpen" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="closeEdit" />
          <form
            class="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl shadow-xl p-6 space-y-4 z-10"
            @submit.prevent="handleSave"
          >
            <div class="flex items-center justify-between">
              <h3 class="font-semibold text-gray-900">{{ t('scheduler.editSlot') }}</h3>
              <button type="button" class="text-sm font-medium text-red-500 hover:text-red-700 transition" @click="openDeleteConfirm">
                {{ t('common.delete') }}
              </button>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.date') }}</label>
              <input v-model="editForm.date" type="date" class="input" required />
            </div>

            <div class="grid grid-cols-2 gap-3">
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.startTime') }}</label>
                <input v-model="editForm.startTime" type="time" class="input" required />
              </div>
              <div>
                <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.endTime') }}</label>
                <input v-model="editForm.endTime" type="time" class="input" required />
              </div>
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.capacity') }}</label>
              <input v-model.number="editForm.capacity" type="number" min="1" class="input" required />
            </div>

            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('coaches.title') }}</label>
              <select v-model="editForm.coachId" class="input" required @change="onCoachChange">
                <option value="" disabled>{{ t('scheduler.selectCoach') }}</option>
                <option v-for="c in coachesStore.coaches" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>

            <p v-if="editError" class="text-red-600 text-xs">{{ editError }}</p>

            <div class="flex gap-3 pt-1">
              <button type="button" class="btn-secondary flex-1" @click="closeEdit">{{ t('common.cancel') }}</button>
              <button type="submit" class="btn-primary flex-1" :disabled="saving">
                {{ saving ? t('common.loading') : t('common.save') }}
              </button>
            </div>
          </form>
        </div>
      </Transition>
    </Teleport>

    <ConfirmDialog
      v-model="deleteOpen"
      :message="t('scheduler.confirmDelete', { time: editForm.startTime + '–' + editForm.endTime })"
      @confirm="handleDelete"
    />
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted, onUnmounted } from 'vue'
import { useI18n }         from 'vue-i18n'
import { useSlotsStore }   from '@/stores/slots'
import { useCoachesStore } from '@/stores/coaches'
import { dateToISO, addDays, addMonths, getWeekStart, monthLabel, todayISO } from '@/utils/date'
import AppSpinner    from '@/components/shared/AppSpinner.vue'
import ConfirmDialog from '@/components/shared/ConfirmDialog.vue'

const { t, locale } = useI18n()
const slotsStore   = useSlotsStore()
const coachesStore = useCoachesStore()

// ── Time grid constants ───────────────────────────────────
const DAY_START_H  = 4
const DAY_END_H    = 23
const PX_PER_HOUR  = 64
const HOURS        = Array.from({ length: DAY_END_H - DAY_START_H + 1 }, (_, i) => DAY_START_H + i)
const TOTAL_HEIGHT = HOURS.length * PX_PER_HOUR

function hourTop(h) {
  return (h - DAY_START_H) * PX_PER_HOUR
}

function slotStyle(slot) {
  const [sh, sm] = slot.startTime.split(':').map(Number)
  const [eh, em] = (slot.endTime || slot.startTime).split(':').map(Number)
  const startMin = sh * 60 + sm
  const endMin   = eh * 60 + em
  const clampedStart = Math.max(startMin, DAY_START_H * 60)
  const clampedEnd   = Math.min(endMin, (DAY_END_H + 1) * 60)
  const top    = (clampedStart - DAY_START_H * 60) * PX_PER_HOUR / 60
  const height = Math.max((clampedEnd - clampedStart) * PX_PER_HOUR / 60, 28)
  return { top: `${top}px`, height: `${height}px` }
}

// ── View state ────────────────────────────────────────────
const view   = ref('week')
const cursor = ref(new Date())

const viewOptions = computed(() => [
  { key: 'month', label: t('scheduler.calMonth') },
  { key: 'week',  label: t('scheduler.calWeek')  },
  { key: 'day',   label: t('scheduler.calDay')   },
])

function setView(v) { view.value = v }
function openDay(dateStr) {
  cursor.value = new Date(dateStr + 'T12:00:00')
  view.value   = 'day'
}

// ── Navigation ────────────────────────────────────────────
function prev() {
  if (view.value === 'month') cursor.value = addMonths(cursor.value, -1)
  else if (view.value === 'week') cursor.value = addDays(cursor.value, -7)
  else cursor.value = addDays(cursor.value, -1)
}
function next() {
  if (view.value === 'month') cursor.value = addMonths(cursor.value, 1)
  else if (view.value === 'week') cursor.value = addDays(cursor.value, 7)
  else cursor.value = addDays(cursor.value, 1)
}
function goToday() { cursor.value = new Date() }

// ── Week start (locale-aware) ─────────────────────────────
const weekStartDay = computed(() => locale.value === 'he' ? 0 : 1)

// ── Date range ────────────────────────────────────────────
const rangeStart = computed(() => {
  if (view.value === 'day') return dateToISO(cursor.value)
  if (view.value === 'week') return dateToISO(getWeekStart(cursor.value, weekStartDay.value))
  // month: start from Monday of first week
  const first = new Date(cursor.value.getFullYear(), cursor.value.getMonth(), 1, 12)
  return dateToISO(getWeekStart(first, weekStartDay.value))
})

const rangeEnd = computed(() => {
  if (view.value === 'day') return dateToISO(cursor.value)
  if (view.value === 'week') {
    return dateToISO(addDays(new Date(rangeStart.value + 'T12:00:00'), 6))
  }
  return dateToISO(addDays(new Date(rangeStart.value + 'T12:00:00'), 41))
})

const periodLabel = computed(() => {
  if (view.value === 'month') return monthLabel(cursor.value, locale.value)
  if (view.value === 'day') {
    return cursor.value.toLocaleDateString(
      locale.value === 'he' ? 'he-IL' : 'fr-FR',
      { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
    )
  }
  // week
  const s = new Date(rangeStart.value + 'T12:00:00')
  const e = new Date(rangeEnd.value   + 'T12:00:00')
  const fmt = (d) => d.toLocaleDateString(locale.value === 'he' ? 'he-IL' : 'fr-FR', { day: 'numeric', month: 'short' })
  return `${fmt(s)} – ${fmt(e)}, ${e.getFullYear()}`
})

// ── Subscribe when range changes ──────────────────────────
watch([rangeStart, rangeEnd], ([s, e]) => {
  slotsStore.subscribeCalendar(s, e)
}, { immediate: true })

// ── Slots grouped by date ─────────────────────────────────
const slotsByDate = computed(() => {
  const map = {}
  for (const slot of slotsStore.calendarSlots) {
    if (!map[slot.date]) map[slot.date] = []
    map[slot.date].push(slot)
  }
  for (const date in map) {
    map[date].sort((a, b) => a.startTime.localeCompare(b.startTime))
  }
  return map
})

// ── Day headers (locale-aware order) ─────────────────────
const DAY_KEYS = ['daySun','dayMon','dayTue','dayWed','dayThu','dayFri','daySat']
const dayHeaders = computed(() =>
  Array.from({ length: 7 }, (_, i) => t(`scheduler.${DAY_KEYS[(weekStartDay.value + i) % 7]}`))
)

// ── Month cells ───────────────────────────────────────────
const monthCells = computed(() => {
  const start    = new Date(rangeStart.value + 'T12:00:00')
  const curMonth = cursor.value.getMonth()
  const todayStr = todayISO()
  return Array.from({ length: 42 }, (_, i) => {
    const d       = addDays(start, i)
    const dateStr = dateToISO(d)
    return {
      date:    dateStr,
      day:     d.getDate(),
      inMonth: d.getMonth() === curMonth,
      isToday: dateStr === todayStr,
      slots:   slotsByDate.value[dateStr] ?? [],
    }
  })
})

// ── Week days ─────────────────────────────────────────────
const todayStr = todayISO()
const weekDays = computed(() =>
  Array.from({ length: 7 }, (_, i) => {
    const d       = addDays(new Date(rangeStart.value + 'T12:00:00'), i)
    const dateStr = dateToISO(d)
    return {
      date:    dateStr,
      header:  t(`scheduler.${DAY_KEYS[d.getDay()]}`),
      dayNum:  d.getDate(),
      isToday: dateStr === todayStr,
      slots:   slotsByDate.value[dateStr] ?? [],
    }
  })
)

const todayColIndex = computed(() =>
  weekDays.value.findIndex((d) => d.isToday)
)

// ── Day slots (day view) ──────────────────────────────────
const daySlots = computed(() =>
  (slotsByDate.value[dateToISO(cursor.value)] ?? [])
)

// ── Slot styling ──────────────────────────────────────────
function slotChipClass(slot) {
  return slot.bookedCount >= slot.capacity
    ? 'bg-red-100 text-red-700 hover:bg-red-200'
    : 'bg-brand-100 text-brand-700 hover:bg-brand-200'
}
function slotCardClass(slot) {
  return slot.bookedCount >= slot.capacity
    ? 'bg-red-50 border border-red-100 hover:bg-red-100'
    : 'bg-brand-50 border border-brand-100 hover:bg-brand-100'
}

// ── Edit Modal ────────────────────────────────────────────
const editOpen    = ref(false)
const saving      = ref(false)
const editError   = ref('')
const editingSlot = ref(null)

const editForm = reactive({
  date: '', startTime: '', endTime: '', capacity: 1, coachId: '', coachName: '',
})

function openEdit(slot) {
  editingSlot.value = slot
  editError.value   = ''
  Object.assign(editForm, {
    date:      slot.date,
    startTime: slot.startTime,
    endTime:   slot.endTime,
    capacity:  slot.capacity,
    coachId:   slot.coachId,
    coachName: slot.coachName,
  })
  editOpen.value = true
}
function closeEdit() { editOpen.value = false }

function onCoachChange() {
  const coach = coachesStore.coaches.find((c) => c.id === editForm.coachId)
  editForm.coachName = coach?.name ?? ''
}

async function handleSave() {
  if (!editForm.coachId) { editError.value = t('scheduler.errorNoCoach'); return }
  saving.value = true; editError.value = ''
  try {
    await slotsStore.updateSlot(editingSlot.value.id, {
      date: editForm.date, startTime: editForm.startTime, endTime: editForm.endTime,
      capacity: editForm.capacity, coachId: editForm.coachId, coachName: editForm.coachName,
    })
    closeEdit()
  } catch (err) { editError.value = err.message }
  finally { saving.value = false }
}

// ── Delete ────────────────────────────────────────────────
const deleteOpen = ref(false)
function openDeleteConfirm() { deleteOpen.value = true }
async function handleDelete() {
  deleteOpen.value = false
  await slotsStore.deleteSlot(editingSlot.value.id)
  closeEdit()
}

// ── Lifecycle ─────────────────────────────────────────────
onMounted(async () => {
  await coachesStore.fetchOnce()
  coachesStore.subscribe()
})
onUnmounted(() => slotsStore.unsubscribeCalendar())
</script>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: opacity 0.2s; }
.modal-enter-from,  .modal-leave-to      { opacity: 0; }
</style>
