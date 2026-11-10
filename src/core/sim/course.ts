/**
 * Training-course rules: reach every checkpoint in order while a tick-based timer runs.
 * Pure state transitions — no rendering, no wall clock.
 */
import type { CheckpointDef } from './map.js';

export interface CourseState {
  readonly checkpoints: readonly CheckpointDef[];
  /** Index of the checkpoint to reach next; equals checkpoints.length once finished. */
  nextIndex: number;
  startedAtTick: number | null;
  finishedAtTick: number | null;
  /** Ticks since the start at which each checkpoint was reached. */
  splits: number[];
}

export interface CourseUpdate {
  reachedIndex: number;
  finished: boolean;
}

export function createCourse(checkpoints: readonly CheckpointDef[]): CourseState {
  return { checkpoints, nextIndex: 0, startedAtTick: null, finishedAtTick: null, splits: [] };
}

export function resetCourse(course: CourseState): void {
  course.nextIndex = 0;
  course.startedAtTick = null;
  course.finishedAtTick = null;
  course.splits.length = 0;
}

/**
 * Advances the course for one tick.
 * @param x,y,z  centre of the runner's body
 * @param moving true while the runner is giving movement input (starts the clock)
 * @returns the checkpoint reached this tick, or null
 */
export function updateCourse(
  course: CourseState,
  tick: number,
  x: number,
  y: number,
  z: number,
  moving: boolean,
): CourseUpdate | null {
  if (course.finishedAtTick !== null || course.checkpoints.length === 0) return null;
  if (course.startedAtTick === null) {
    if (!moving) return null;
    course.startedAtTick = tick;
  }
  const target = course.checkpoints[course.nextIndex];
  if (!target) return null;
  const dx = x - target.x;
  const dy = y - target.y;
  const dz = z - target.z;
  if (dx * dx + dy * dy + dz * dz > target.radius * target.radius) return null;

  const reachedIndex = course.nextIndex;
  course.splits.push(tick - course.startedAtTick);
  course.nextIndex++;
  const finished = course.nextIndex >= course.checkpoints.length;
  if (finished) course.finishedAtTick = tick;
  return { reachedIndex, finished };
}

/** Ticks on the clock: 0 before the start, frozen after the finish. */
export function courseElapsedTicks(course: CourseState, tick: number): number {
  if (course.startedAtTick === null) return 0;
  const end = course.finishedAtTick ?? tick;
  return Math.max(0, end - course.startedAtTick);
}
