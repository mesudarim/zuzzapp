<template>
  <main class="max-w-lg mx-auto px-4 py-6 space-y-6">
    <h2 class="text-lg font-semibold text-gray-900">{{ t('stats.title') }}</h2>

    <!-- Exercise selector -->
    <select v-model="selectedExerciseId" class="input" @change="onExerciseChange">
      <option value="" disabled>{{ t('stats.selectExercise') }}</option>
      <option v-for="ex in exercisesStore.exercises" :key="ex.id" :value="ex.id">
        {{ ex.name }}
      </option>
    </select>

    <p v-if="!selectedExerciseId" class="text-gray-400 text-sm text-center py-8">
      {{ t('stats.noHistory') }}
    </p>

    <template v-else-if="logsStore.historyLogs.length">
      <!-- Weight over time -->
      <div class="card">
        <p class="text-sm font-medium text-gray-700 mb-3">{{ t('stats.weightChart') }}</p>
        <Line :data="weightChartData" :options="chartOptions" />
      </div>
      <!-- Reps over time -->
      <div class="card">
        <p class="text-sm font-medium text-gray-700 mb-3">{{ t('stats.repsChart') }}</p>
        <Line :data="repsChartData" :options="chartOptions" />
      </div>
    </template>

    <p v-else class="text-gray-400 text-sm text-center py-8">{{ t('stats.noHistory') }}</p>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js'
import { useExercisesStore }   from '@/stores/exercises'
import { useTrainingLogsStore } from '@/stores/trainingLogs'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler)

const { t } = useI18n()
const exercisesStore = useExercisesStore()
const logsStore      = useTrainingLogsStore()

const selectedExerciseId = ref('')

function onExerciseChange() {
  if (selectedExerciseId.value) logsStore.subscribeHistory(selectedExerciseId.value)
}

// Build chart data from history logs (each log = one session, take max weight/reps per session)
const labels = computed(() => logsStore.historyLogs.map((l) => l.date))

const weightChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Max Weight (kg)',
    data: logsStore.historyLogs.map((l) => Math.max(...l.sets.map((s) => s.actualWeight))),
    borderColor: '#0284c7',
    backgroundColor: 'rgba(2,132,199,0.1)',
    tension: 0.4,
    fill: true,
  }],
}))

const repsChartData = computed(() => ({
  labels: labels.value,
  datasets: [{
    label: 'Max Reps',
    data: logsStore.historyLogs.map((l) => Math.max(...l.sets.map((s) => s.actualReps))),
    borderColor: '#16a34a',
    backgroundColor: 'rgba(22,163,74,0.1)',
    tension: 0.4,
    fill: true,
  }],
}))

const chartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: false } },
}

onMounted(() => exercisesStore.subscribe())
onUnmounted(() => logsStore.unsubscribeAll())
</script>
