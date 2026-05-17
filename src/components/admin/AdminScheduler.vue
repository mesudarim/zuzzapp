<template>
  <div class="space-y-6">

    <!-- ── Main tab switcher ──────────────────────────────── -->
    <div class="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
      <button
        v-for="tab in mainTabs"
        :key="tab.key"
        type="button"
        class="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="activeTab === tab.key
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'"
        @click="activeTab = tab.key"
      >{{ tab.label }}</button>
    </div>

    <!-- ── Tab: Calendrier ───────────────────────────────── -->
    <AdminSchedulerCalendar v-if="activeTab === 'calendar'" />

    <!-- ── Tab: Gestion ─────────────────────────────────── -->
    <template v-else-if="activeTab === 'manage'">

      <!-- Sub-tab switcher -->
      <div class="flex gap-1 border-b border-gray-100">
        <button
          v-for="sub in manageTabs"
          :key="sub.key"
          type="button"
          class="px-3 pb-2 text-sm font-medium border-b-2 transition-colors -mb-px"
          :class="manageSub === sub.key
            ? 'border-brand-600 text-brand-700'
            : 'border-transparent text-gray-500 hover:text-gray-700'"
          @click="manageSub = sub.key"
        >{{ sub.label }}</button>
      </div>

      <!-- Sub: Ponctuel — add a single slot -->
      <template v-if="manageSub === 'single'">
        <p class="text-sm text-gray-500">{{ t('scheduler.singleHint') }}</p>

        <form class="space-y-4 max-w-md" @submit.prevent="handleAddSlot">
          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.date') }}</label>
            <input v-model="addForm.date" type="date" class="input" required />
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.startTime') }}</label>
              <input v-model="addForm.startTime" type="time" class="input" required />
            </div>
            <div>
              <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.endTime') }}</label>
              <input v-model="addForm.endTime" type="time" class="input" required />
            </div>
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('scheduler.capacity') }}</label>
            <input v-model.number="addForm.capacity" type="number" min="1" max="200" class="input" required />
          </div>

          <div>
            <label class="block text-xs font-medium text-gray-600 mb-1">{{ t('coaches.title') }}</label>
            <select
              v-model="addForm.coachId"
              class="input"
              required
              :disabled="coachesStore.loading"
              @change="onAddCoachChange"
            >
              <option value="" disabled>
                {{ coachesStore.loading ? t('common.loading') : t('scheduler.selectCoach') }}
              </option>
              <option v-for="c in coachesStore.coaches" :key="c.id" :value="c.id">
                {{ c.name }}
              </option>
            </select>
          </div>

          <p v-if="addError" class="text-red-600 text-sm">{{ addError }}</p>
          <p v-if="addSuccess" class="text-green-600 text-sm">{{ addSuccess }}</p>

          <button type="submit" class="btn-primary" :disabled="adding">
            {{ adding ? t('common.loading') : t('scheduler.addSlot') }}
          </button>
        </form>
      </template>

      <!-- Sub: Récurrent — bulk creator -->
      <AdminSchedulerBulk v-else-if="manageSub === 'bulk'" />
    </template>

  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from 'vue'
import { useI18n }            from 'vue-i18n'
import { useSlotsStore }      from '@/stores/slots'
import { useCoachesStore }    from '@/stores/coaches'
import { todayISO }           from '@/utils/date'
import AdminSchedulerCalendar from '@/components/admin/AdminSchedulerCalendar.vue'
import AdminSchedulerBulk     from '@/components/admin/AdminSchedulerBulk.vue'

const { t } = useI18n()
const slotsStore   = useSlotsStore()
const coachesStore = useCoachesStore()

// ── Main tabs ─────────────────────────────────────────────
const activeTab = ref('calendar')
const mainTabs = computed(() => [
  { key: 'calendar', label: t('scheduler.calendarTab') },
  { key: 'manage',   label: t('scheduler.manageTab')   },
])

// ── Manage sub-tabs ───────────────────────────────────────
const manageSub = ref('single')
const manageTabs = computed(() => [
  { key: 'single', label: t('scheduler.singleTab') },
  { key: 'bulk',   label: t('scheduler.bulkTab')   },
])

// ── Add single slot form ──────────────────────────────────
const adding    = ref(false)
const addError  = ref('')
const addSuccess = ref('')

const addForm = reactive({
  date:      todayISO(),
  startTime: '07:00',
  endTime:   '08:00',
  capacity:  15,
  coachId:   '',
  coachName: '',
})

function onAddCoachChange() {
  const coach = coachesStore.coaches.find((c) => c.id === addForm.coachId)
  addForm.coachName = coach?.name ?? ''
}

async function handleAddSlot() {
  addError.value   = ''
  addSuccess.value = ''
  if (!addForm.coachId) { addError.value = t('scheduler.errorNoCoach'); return }

  adding.value = true
  try {
    await slotsStore.addSlot({
      date:      addForm.date,
      startTime: addForm.startTime,
      endTime:   addForm.endTime,
      capacity:  addForm.capacity,
      coachId:   addForm.coachId,
      coachName: addForm.coachName,
    })
    addSuccess.value = t('scheduler.slotAdded')
    // Reset times only, keep date/coach for quick multi-add
    addForm.startTime = ''
    addForm.endTime   = ''
  } catch (err) {
    addError.value = err.message
  } finally {
    adding.value = false
  }
}

// ── Lifecycle ─────────────────────────────────────────────
onMounted(async () => {
  await coachesStore.fetchOnce()
  coachesStore.subscribe()
})
</script>
