import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import {
  collection, doc, getDoc, getDocs,
  addDoc, updateDoc, query, where, serverTimestamp,
} from 'firebase/firestore'
import { db } from '@/firebase'

const SLUG_KEY = 'zuzz_gym_slug'

// Generate a full brand palette from a single hex color and apply it as CSS vars
function applyBrandColor(hex) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const tint  = (c, f) => Math.round(c + (255 - c) * f)
  const shade = (c, f) => Math.round(c * (1 - f))
  const set   = (name, cr, cg, cb) =>
    document.documentElement.style.setProperty(`--brand-${name}`, `${cr} ${cg} ${cb}`)
  set('50',  tint(r,.95), tint(g,.95), tint(b,.95))
  set('100', tint(r,.85), tint(g,.85), tint(b,.85))
  set('500', tint(r,.20), tint(g,.20), tint(b,.20))
  set('600', r, g, b)
  set('700', shade(r,.20), shade(g,.20), shade(b,.20))
  set('900', shade(r,.55), shade(g,.55), shade(b,.55))
}

export const useGymStore = defineStore('gym', () => {
  const currentGym = ref(null)   // { id, name, slug, logoURL, ... }
  const loading    = ref(false)
  const error      = ref(null)

  const gymId        = computed(() => currentGym.value?.id ?? null)
  const gymMode      = computed(() => currentGym.value?.mode ?? 'coached')
  const isAutonomous = computed(() => gymMode.value === 'autonomous')
  const showBooking  = computed(() => currentGym.value?.showBooking ?? (gymMode.value === 'coached'))

  // ── Load by URL slug ──────────────────────────────────────
  async function loadBySlug(slug) {
    loading.value = true
    error.value   = null
    try {
      const q    = query(collection(db, 'gyms'), where('slug', '==', slug.toLowerCase()))
      const snap = await getDocs(q)
      if (snap.empty) { error.value = 'gym_not_found'; return false }
      currentGym.value = { id: snap.docs[0].id, ...snap.docs[0].data() }
      localStorage.setItem(SLUG_KEY, slug.toLowerCase())
      applyBrandColor(currentGym.value.primaryColor)
      return true
    } catch (err) {
      error.value = err.message
      return false
    } finally {
      loading.value = false
    }
  }

  // ── Load by Firestore document ID (used after login) ──────
  async function loadById(id) {
    try {
      const snap = await getDoc(doc(db, 'gyms', id))
      if (snap.exists()) {
        currentGym.value = { id: snap.id, ...snap.data() }
        if (currentGym.value.slug) localStorage.setItem(SLUG_KEY, currentGym.value.slug)
        applyBrandColor(currentGym.value.primaryColor)
      }
    } catch (err) {
      console.error('[gym] loadById:', err)
    }
  }

  // ── Try restoring from localStorage ──────────────────────
  async function tryLoadFromStorage() {
    const slug = localStorage.getItem(SLUG_KEY)
    if (slug && !currentGym.value) return loadBySlug(slug)
    return !!currentGym.value
  }

  // ── Create a new gym (first-time setup) ──────────────────
  async function createGym({ name, slug }) {
    const clean = slug.toLowerCase().replace(/[^a-z0-9-]/g, '-')
    const ref_  = await addDoc(collection(db, 'gyms'), {
      name,
      slug:      clean,
      logoURL:   null,
      createdAt: serverTimestamp(),
    })
    currentGym.value = { id: ref_.id, name, slug: clean, logoURL: null }
    localStorage.setItem(SLUG_KEY, clean)
    return ref_.id
  }

  // ── Update gym metadata (name, logo, etc.) ────────────────
  async function updateGym(id, data) {
    await updateDoc(doc(db, 'gyms', id), data)
    if (currentGym.value?.id === id) {
      currentGym.value = { ...currentGym.value, ...data }
      applyBrandColor(currentGym.value.primaryColor)
    }
  }

  return {
    currentGym, gymId, gymMode, isAutonomous, showBooking, loading, error,
    loadBySlug, loadById, tryLoadFromStorage, createGym, updateGym,
  }
})
