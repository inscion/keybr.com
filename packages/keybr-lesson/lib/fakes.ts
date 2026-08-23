import { type Letter } from "@keybr/phonetic-model";
import {
  type KeySample,
  type KeyStats,
  type KeyStatsMap,
  speedToTime,
} from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { type LessonKeys } from "./key.ts";
import { Target } from "./target.ts";

export function fakeKeyStatsMap(
  settings: Settings,
  items: [
    letter: Letter,
    confidence: number | null,
    bestConfidence: number | null,
    accuracyCounts?: readonly [hitCount: number, missCount: number],
  ][],
): KeyStatsMap {
  const target = new Target(settings);
  const map = new Map<Letter, KeyStats>(
    items.map(([letter, confidence, bestConfidence, accuracyCounts]) => {
      const timeToType =
        confidence == null
          ? null
          : speedToTime(target.targetSpeed) / confidence;
      const bestTimeToType =
        bestConfidence == null
          ? null
          : speedToTime(target.targetSpeed) / bestConfidence;
      const samples: KeySample[] = [];
      if (accuracyCounts != null && timeToType != null) {
        const [hitCount, missCount] = accuracyCounts;
        samples.push({
          index: 0,
          timeStamp: 0,
          hitCount,
          missCount,
          timeToType,
          filteredTimeToType: timeToType,
        });
      }
      return [
        letter,
        {
          letter,
          samples,
          timeToType,
          bestTimeToType,
        } as KeyStats,
      ];
    }),
  );
  return {
    letters: [...map.keys()],
    results: [],
    get: (letter) => map.get(letter),
    [Symbol.iterator]: () => map.values(),
  } as KeyStatsMap;
}

export function printLessonKeys(lessonKeys: LessonKeys) {
  return lessonKeys
    .findIncludedKeys()
    .map((key) => {
      let s = `${key.letter}`;
      if (key.isForced) {
        s = `!${s}`;
      }
      if (key.isFocused) {
        s = `[${s}]`;
      }
      return s;
    })
    .join("");
}
