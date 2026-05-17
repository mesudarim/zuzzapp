<template>
  <div class="space-y-6">
    <!-- Note -->
    <p class="text-sm text-gray-500 bg-gray-50 rounded-xl px-4 py-3">
      {{ t('scheduler.overwriteNote') }}
    </p>

    <!-- Date range -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.dateFrom') }}</label>
        <input type="date" v-model="form.startDate" class="input" :min="todayISO()" />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.dateTo') }}</label>
        <input type="date" v-model="form.endDate" class="input" :min="form.startDate" />
      </div>
    </div>

    <!-- Weekday checkboxes -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-2">{{ t('scheduler.weekdays') }}</label>
      <div class="flex gap-2 flex-wrap">
        <button
          v-for="day in weekdayOptions"
          :key="day.value"
          type="button"
          class="w-11 h-11 rounded-full text-sm font-semibold border-2 transition-colors"
          :class="form.weekdays.includes(day.value)
            ? 'bg-brand-600 text-white border-brand-600'
            : 'border-gray-200 text-gray-500 hover:border-brand-300 hover:text-brand-600'"
          @click="toggleDay(day.value)"
        >
          {{ day.label }}
        </button>
      </div>
    </div>

    <!-- Time slots -->
    <div>
      <label class="block text-xs font-medium text-gray-600 mb-2">{{ t('scheduler.timeSlots') }}</label>
      <div class="space-y-2">
        <div v-for="(ts, i) in form.timeSlots" :key="i" class="flex items-center gap-2">
          <input
            type="time"
            v-model="ts.startTime"
            class="input flex-1"
            required
          />
          <span class="text-gray-400 shrink-0">–</span>
          <input
            type="time"
            v-model="ts.endTime"
            class="input flex-1"
            required
          />
          <button
            type="button"
            class="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors"
            :disabled="form.timeSlots.length === 1"
            @click="removeTimeSlot(i)"
          >
            ×
          </button>
        </div>
      </div>
      <button type="button" class="btn-secondary text-xs mt-2" @click="addTimeSlot">
        {{ t('scheduler.addTimeSlot') }}
      </button>
    </div>

    <!-- Capacity + Coach -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.capacity') }}</label>
        <input
          type="number"
          v-model.number="form.capacity"
          min="1"
          max="200"
          class="input"
        />
      </div>
      <div>
        <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('coaches.title') }}</label>
        <select
          v-model="form.coachId"
          class="input"
          :disabled="coachesStore.loading"
          @change="onCoachChange"
        >
          <option value="" disabled>
            {{ coachesStore.loading ? t('common.loading') : t('scheduler.selectCoach') }}
          </option>
          <option v-for="c in coachesStore.coaches" :key="c.id" :value="c.id">
            {{ c.name }}
          </option>
        </select>
      </div>
    </div>

    <!-- Preview -->
    <div
      v-if="preview.total > 0"
      class="bg-brand-50 border border-brand-100 rounded-xl px-4 py-3 text-sm text-brand-700 space-y-1"
    >
      <p class="font-semibold">{{ t('scheduler.previewTitle') }}</p>
      <p>{{ t('scheduler.previewLine', { slots: preview.timeSlots, days: preview.days, total: preview.total }) }}</p>
    </div>

    <!-- Error / success -->
    <p v-if="formError" class="text-red-600 text-sm">{{ formError }}</p>
    <p v-if="successMsg" class="text-green-600 text-sm font-medium">{{ successMsg }}</p>

    <!-- Submit -->
    <button
      type="button"
      class="btn-primary w-full"
      :disabled="submitting || preview.total === 0 || !form.coachId"
      @click="handleGenerate"
    >
      {{ submitting ? t('scheduler.generating') : t('scheduler.generate') }}
    </button>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n }         from 'vue-i18n'
import { useSlotsStore }   from '@/stores/slots'
import { useCoachesStore } from '@/stores/coaches'
import { todayISO }        from '@/utils/date'

const { t } = useI18n()
const slotsStore   = useSlotsStore()
const coachesStore = useCoachesStore()

// ── Weekday options (Mon–Sun display order) ───────────────
// JS getDay(): 0=Sun, 1=Mon … 6=Sat
const weekdayOptions = computed(() => [
  { value: 1, label: t('scheduler.dayMon') },
  { value: 2, label: t('scheduler.dayTue') },
  { value: 3, label: t('scheduler.dayWed') },
  { value: 4, label: t('scheduler.dayThu') },
  { value: 5, label: t('scheduler.dayFri') },
  { value: 6, label: t('scheduler.daySat') },
  { value: 0, label: t('scheduler.daySun') },
])

// ── Form state ────────────────────────────────────────────
const form = reactive({
  startDate: todayISO(),
  endDate:   '',
  weekdays:  [],           // array of JS day numbers
  timeSlots: [{ startTime: '07:00', endTime: '08:00' }],
  capacity:  15,
  coachId:   '',
  coachName: '',
})

function toggleDay(val) {
  const idx = form.weekdays.indexOf(val)
  if (idx === -1) form.weekdays.push(val)
  else form.weekdays.splice(idx, 1)
}

function addTimeSlot() {
  const last = form.timeSlots[form.timeSlots.length - 1]
  form.timeSlots.push({ startTime: last?.endTime ?? '09:00', endTime: '' })
}

function removeTimeSlot(i) {
  if (form.timeSlots.length > 1) form.timeSlots.splice(i, 1)
}

function onCoachChange() {
  const coach = coachesStore.coaches.find((c) => c.id === form.coachId)
  form.coachName = coach?.name ?? ''
}

// ── Preview ───────────────────────────────────────────────
const preview = computed(() => {
  if (!form.startDate || !form.endDate || form.weekdays.length === 0) {
    return { days: 0, timeSlots: 0, total: 0 }
  }
  const validSlots = form.timeSlots.filter((ts) => ts.startTime && ts.endTime)
  if (validSlots.length === 0) return { days: 0, timeSlots: 0, total: 0 }

  let days = 0
  const cur = new Date(form.startDate + 'T12:00:00')
  const end = new Date(form.endDate   + 'T12:00:00')
  if (cur > end) return { days: 0, timeSlots: 0, total: 0 }
  while (cur <= end) {
    if (form.weekdays.includes(cur.getDay())) days++
    cur.setDate(cur.getDate() + 1)
  }
  return { days, timeSlots: validSlots.length, total: days * validSlots.length }
})

// ── Submit ────────────────────────────────────────────────
const submitting = ref(false)
const formError  = ref('')
const successMsg = ref('')

async function handleGenerate() {
  formError.value  = ''
  successMsg.value = ''

  if (form.weekdays.length === 0) { formError.value = t('scheduler.errorNoWeekdays'); return }

  const validSlots = form.timeSlots.filter((ts) => ts.startTime && ts.endTime)
  if (validSlots.length === 0) { formError.value = t('scheduler.errorNoTimeSlots'); return }

  if (!form.coachId) { formError.value = t('scheduler.errorNoCoach'); return }

  submitting.value = true
  try {
    const total = await slotsStore.bulkCreate({
      startDate: form.startDate,
      endDate:   form.endDate,
      weekdays:  form.weekdays,
      timeSlots: validSlots,
      capacity:  form.capacity,
      coachId:   form.coachId,
      coachName: form.coachName,
    })
    successMsg.value = t('scheduler.generated', { n: total })
  } catch (err) {
    formError.value = err.message
  } finally {
    submitting.value = false
  }
}

// ── Init ──────────────────────────────────────────────────
onMounted(async () => {
  await coachesStore.fetchOnce()
  coachesStore.subscribe()
})
</script>
