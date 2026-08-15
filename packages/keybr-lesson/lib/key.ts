import { type Letter } from "@keybr/phonetic-model";
import { type KeySample, type KeyStats, type KeyStatsMap } from "@keybr/result";
import { type CodePoint } from "@keybr/unicode";
import { type Target } from "./target.ts";

const ACCURACY_WINDOW_ATTEMPTS = 200;
const ACCURACY_WINDOW_RESULTS = 200;

export function recentAccuracy(
  samples: readonly KeySample[],
  maxAttempts = ACCURACY_WINDOW_ATTEMPTS,
  minSampleIndex = 0,
): { accuracy: number | null; attempts: number } {
  let hitCount = 0;
  let missCount = 0;

  for (let index = samples.length - 1; index >= 0; index -= 1) {
    const sample = samples[index];
    if (sample.index < minSampleIndex) {
      break;
    }
    hitCount += sample.hitCount;
    missCount += sample.missCount;
    if (hitCount + missCount >= maxAttempts) {
      break;
    }
  }

  const attempts = hitCount + missCount;
  return {
    accuracy: attempts > 0 ? hitCount / attempts : null,
    attempts,
  };
}

export class LessonKey implements KeyStats {
  static from(
    keyStats: KeyStats,
    target: Target,
    resultCount: number | null = null,
  ): LessonKey {
    const { letter, samples, timeToType, bestTimeToType } = keyStats;
    const minSampleIndex =
      resultCount == null
        ? 0
        : Math.max(0, resultCount - ACCURACY_WINDOW_RESULTS);
    const { accuracy: recentAccuracyValue, attempts: recentAttempts } =
      recentAccuracy(samples, ACCURACY_WINDOW_ATTEMPTS, minSampleIndex);
    return new LessonKey({
      letter,
      samples,
      timeToType,
      bestTimeToType,
      confidence: target.confidence(timeToType),
      bestConfidence: target.confidence(bestTimeToType),
      recentAccuracy: recentAccuracyValue,
      recentAttempts,
    });
  }

  readonly letter: Letter;
  readonly samples: readonly KeySample[];
  readonly timeToType: number | null;
  readonly bestTimeToType: number | null;
  readonly confidence: number | null;
  readonly bestConfidence: number | null;
  readonly recentAccuracy: number | null;
  readonly recentAttempts: number;
  readonly isIncluded: boolean;
  readonly isFocused: boolean;
  readonly isForced: boolean;

  constructor({
    letter,
    samples,
    timeToType,
    bestTimeToType,
    confidence,
    bestConfidence,
    recentAccuracy = null,
    recentAttempts = 0,
    isIncluded = false,
    isFocused = false,
    isForced = false,
  }: {
    letter: Letter;
    samples: readonly KeySample[];
    timeToType: number | null;
    bestTimeToType: number | null;
    confidence: number | null;
    bestConfidence: number | null;
    recentAccuracy?: number | null;
    recentAttempts?: number;
    isIncluded?: boolean;
    isFocused?: boolean;
    isForced?: boolean;
  }) {
    this.letter = letter;
    this.samples = samples;
    this.timeToType = timeToType;
    this.bestTimeToType = bestTimeToType;
    this.confidence = confidence;
    this.bestConfidence = bestConfidence;
    this.recentAccuracy = recentAccuracy;
    this.recentAttempts = recentAttempts;
    this.isIncluded = isIncluded;
    this.isFocused = isFocused;
    this.isForced = isForced;
    Object.freeze(this);
  }

  asIncluded(): LessonKey {
    return new LessonKey({
      ...this,
      isIncluded: true,
    });
  }

  asExcluded(): LessonKey {
    return new LessonKey({
      ...this,
      isIncluded: false,
      isFocused: false,
      isForced: false,
    });
  }

  asForced(): LessonKey {
    return new LessonKey({
      ...this,
      isIncluded: true,
      isForced: true,
    });
  }

  asFocused(): LessonKey {
    return new LessonKey({
      ...this,
      isIncluded: true,
      isFocused: true,
    });
  }
}

export class LessonKeys implements Iterable<LessonKey> {
  static includeAll(keyStatsMap: KeyStatsMap, target: Target): LessonKeys {
    return new LessonKeys(
      [...keyStatsMap].map((keyStats) =>
        LessonKey.from(keyStats, target, keyStatsMap.results.length).asIncluded(),
      ),
    );
  }

  readonly #letters: readonly Letter[];
  readonly #keys: Map<CodePoint, LessonKey>;

  constructor(keys: readonly LessonKey[]) {
    this.#letters = [...keys.map(({ letter }) => letter)];
    this.#keys = new Map(keys.map((key) => [key.letter.codePoint, key]));
  }

  get letters(): readonly Letter[] {
    return this.#letters;
  }

  [Symbol.iterator](): IterableIterator<LessonKey> {
    return this.#keys.values();
  }

  findIncludedKeys(): LessonKey[] {
    return [...this.#keys.values()].filter((key) => key.isIncluded);
  }

  findExcludedKeys(): LessonKey[] {
    return [...this.#keys.values()].filter((key) => !key.isIncluded);
  }

  findFocusedKey(): LessonKey | null {
    return [...this.#keys.values()].find((key) => key.isFocused) ?? null;
  }

  include({ codePoint }: Letter): void {
    this.#keys.set(codePoint, this.#keys.get(codePoint)!.asIncluded());
  }

  exclude({ codePoint }: Letter): void {
    this.#keys.set(codePoint, this.#keys.get(codePoint)!.asExcluded());
  }

  force({ codePoint }: Letter): void {
    this.#keys.set(codePoint, this.#keys.get(codePoint)!.asForced());
  }

  focus({ codePoint }: Letter): void {
    this.#keys.set(codePoint, this.#keys.get(codePoint)!.asFocused());
  }

  find(codePoint: CodePoint): LessonKey | null {
    return this.#keys.get(codePoint) ?? null;
  }
}
