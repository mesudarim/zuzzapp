# Firestore Database Schema — ZuzzApp

## Collection: `users/{uid}`
```
{
  uid:        string,           // same as document ID (Firebase Auth UID)
  name:       string,
  email:      string,
  photoURL:   string,
  role:       "admin" | "member",
  createdAt:  Timestamp
}
```

## Collection: `coaches/{coachId}`
```
{
  name:      string,
  bio:       string,
  photoURL:  string,
  createdAt: Timestamp
}
```

## Collection: `exercises/{exerciseId}`
```
{
  name:        string,
  description: string,
  videoUrl:    string,          // YouTube embed or direct URL
  createdAt:   Timestamp,
  createdBy:   string           // admin uid
}
```

## Collection: `slots/{slotId}`
```
{
  date:        string,          // "YYYY-MM-DD"
  startTime:   string,          // "HH:MM"
  endTime:     string,          // "HH:MM"
  capacity:    number,
  bookedCount: number,
  coachId:     string,
  coachName:   string,          // denormalized for cheap reads
  createdBy:   string,
  createdAt:   Timestamp
}
```

## Collection: `bookings/{bookingId}`
```
{
  slotId:       string,
  userId:       string,
  userName:     string,         // denormalized
  userPhotoURL: string,         // denormalized
  bookedAt:     Timestamp
}
```

## Collection: `workoutPlans/{planId}`
```
{
  userId:    string,
  date:      string,            // "YYYY-MM-DD"
  createdBy: string,            // admin uid
  createdAt: Timestamp,
  exercises: [
    {
      exerciseId:    string,
      name:          string,    // denormalized
      videoUrl:      string,    // denormalized
      targetSets:    number,
      targetReps:    number,
      targetWeight:  number     // in kg
    }
  ]
}
```

## Collection: `trainingLogs/{logId}`
```
{
  userId:       string,
  planId:       string,
  exerciseId:   string,
  exerciseName: string,
  date:         string,         // "YYYY-MM-DD"
  sets: [
    {
      setNumber:    number,
      actualWeight: number,
      actualReps:   number,
      loggedAt:     Timestamp
    }
  ],
  completedAt: Timestamp | null
}
```

## Composite Indexes (firestore.indexes.json)
- `bookings`: `slotId ASC, bookedAt ASC`  → for admin monitoring view
- `bookings`: `userId ASC, bookedAt DESC`  → for member booking history
- `workoutPlans`: `userId ASC, date ASC`   → for member day view
- `trainingLogs`: `userId ASC, date DESC`  → for stats chart
- `slots`: `date ASC, startTime ASC`       → for scheduler grid
