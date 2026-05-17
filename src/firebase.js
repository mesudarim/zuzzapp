import { initializeApp }  from 'firebase/app'
import { getAnalytics }  from 'firebase/analytics'
import { getFirestore }  from 'firebase/firestore'
import { getAuth }       from 'firebase/auth'
import { getStorage }    from 'firebase/storage'

const firebaseConfig = {
  apiKey:            'AIzaSyBY6EduFUrLNifzr3hcsl6YYCDKv2Px7Xw',
  authDomain:        'zuzzapp.firebaseapp.com',
  projectId:         'zuzzapp',
  storageBucket:     'zuzzapp.firebasestorage.app',
  messagingSenderId: '125721881598',
  appId:             '1:125721881598:web:f19484a2fed1a506092eaf',
  measurementId:     'G-BCG2GYK7WL',
}

const app       = initializeApp(firebaseConfig)
const analytics = getAnalytics(app)
const db        = getFirestore(app)
const auth      = getAuth(app)
const storage   = getStorage(app)

export { app, analytics, db, auth, storage }
