/**
 * Normalises any workout plan to the blocks[] format.
 * Legacy plans only have exercises[] — each exercise becomes a straight block.
 */
export function planToBlocks(plan) {
  if (plan?.blocks?.length) return plan.blocks
  return (plan?.exercises ?? []).map((ex) => ({
    type: 'straight',
    exercises: [ex],
  }))
}

/**
 * Flattens blocks back to a plain exercises[] array for backward compatibility.
 */
export function blocksToExercises(blocks) {
  return (blocks ?? []).flatMap((b) => b.exercises)
}

/**
 * Returns an empty straight-block exercise row for form init.
 */
export function emptyExercise() {
  return { exerciseId: '', exerciseName: '', videoUrl: '', targetSets: 3, targetReps: 10, targetWeight: 0 }
}

/**
 * Returns an empty superset block for form init.
 */
export function emptySupersetBlock() {
  return { type: 'superset', rounds: 3, exercises: [emptyExercise(), emptyExercise()] }
}

/**
 * Returns an empty straight block for form init.
 */
export function emptyStraightBlock() {
  return { type: 'straight', exercises: [emptyExercise()] }
}
