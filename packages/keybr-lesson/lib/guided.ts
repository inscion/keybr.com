import { type WordList } from "@keybr/content";
import { type Keyboard } from "@keybr/keyboard";
import { Filter, Letter, type PhoneticModel } from "@keybr/phonetic-model";
import { type RNGStream } from "@keybr/rand";
import { type KeyStatsMap } from "@keybr/result";
import { type Settings } from "@keybr/settings";
import { Dictionary, filterWordList } from "./dictionary.ts";
import { FocusMode } from "./focusmode.ts";
import { LessonKey, LessonKeys } from "./key.ts";
import { Lesson } from "./lesson.ts";
import { lessonProps } from "./settings.ts";
import { Target } from "./target.ts";
import { generateFragment } from "./text/fragment.ts";
import {
  mangledWords,
  phoneticWords,
  randomWords,
  uniqueWords,
} from "./text/words.ts";

const MIN_ACCURACY_ATTEMPTS = 100;

export class GuidedLesson extends Lesson {
  readonly dictionary: Dictionary;

  constructor(
    settings: Settings,
    keyboard: Keyboard,
    model: PhoneticModel,
    wordList: WordList,
  ) {
    super(settings, keyboard, model);
    this.dictionary = new Dictionary(
      filterWordList(wordList, this.codePoints).filter(
        (word) => word.length > 2,
      ),
    );
  }

  override get letters() {
    return this.model.letters;
  }

  override update(keyStatsMap: KeyStatsMap) {
    const alphabetSize = this.settings.get(lessonProps.guided.alphabetSize);
    const recoverKeys = this.settings.get(lessonProps.guided.recoverKeys);
    const focusMode = this.settings.get(lessonProps.guided.focusMode);
    const targetAccuracy = this.settings.get(lessonProps.guided.targetAccuracy);

    const letters = this.#getLetters();

    const minSize = 6;
    const maxSize =
      minSize + Math.round((letters.length - minSize) * alphabetSize);

    const target = new Target(this.settings);

    const lessonKeys = new LessonKeys(
      letters.map((letter) => LessonKey.from(keyStatsMap.get(letter), target)),
    );

    for (const lessonKey of lessonKeys) {
      const includedKeys = lessonKeys.findIncludedKeys();

      if (includedKeys.length < minSize) {
        // Meet the minimal required alphabet size.
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      if (includedKeys.length < maxSize) {
        // Meet the maximal required alphabet size.
        lessonKeys.force(lessonKey.letter);
        continue;
      }

      if ((lessonKey.bestConfidence ?? 0) >= 1) {
        // Must include all confident keys.
        lessonKeys.include(lessonKey.letter);
        continue;
      }

      if (recoverKeys) {
        if (includedKeys.every((key) => (key.confidence ?? 0) >= 1)) {
          // Include a new key only when all the previous keys
          // are now above the target speed.
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      } else {
        if (includedKeys.every((key) => (key.bestConfidence ?? 0) >= 1)) {
          // Include a new key only when all the previous keys
          // were once above the target speed.
          lessonKeys.include(lessonKey.letter);
          continue;
        }
      }
    }

    const includedKeys = lessonKeys.findIncludedKeys();
    const allLettersIncluded = lessonKeys.findExcludedKeys().length === 0;

    // Preserve the stock speed-based curriculum while new letters are still
    // being introduced. Accuracy-aware focus starts only after the alphabet
    // is fully included so that an older inaccurate key cannot starve a newly
    // unlocked key of practice.
    if (!allLettersIncluded || focusMode === FocusMode.SPEED) {
      const weakest = this.#findStockSpeedKey(includedKeys, recoverKeys);
      if (weakest != null) {
        lessonKeys.focus(weakest.letter);
      }
      return lessonKeys;
    }

    const accuracyKey = this.#findAccuracyKey(includedKeys, targetAccuracy);
    const speedKey = this.#findCurrentSpeedKey(includedKeys);

    let focusedKey: LessonKey | null;
    if (focusMode === FocusMode.ACCURACY) {
      focusedKey = accuracyKey;
    } else {
      // In combined mode, prefer accuracy for two lessons and speed for one.
      // Fall back to the other queue when the preferred queue is empty.
      const preferAccuracy = keyStatsMap.results.length % 3 !== 2;
      focusedKey = preferAccuracy
        ? (accuracyKey ?? speedKey)
        : (speedKey ?? accuracyKey);
    }

    if (focusedKey != null) {
      lessonKeys.focus(focusedKey.letter);
    }

    return lessonKeys;
  }

  #findStockSpeedKey(
    keys: readonly LessonKey[],
    recoverKeys: boolean,
  ): LessonKey | null {
    const confidenceOf = (key: LessonKey): number => {
      return recoverKeys ? (key.confidence ?? 0) : (key.bestConfidence ?? 0);
    };
    return (
      [...keys]
        .filter((key) => confidenceOf(key) < 1)
        .sort((a, b) => confidenceOf(a) - confidenceOf(b))[0] ?? null
    );
  }

  #findCurrentSpeedKey(keys: readonly LessonKey[]): LessonKey | null {
    return (
      [...keys]
        .filter((key) => (key.confidence ?? 0) < 1)
        .sort((a, b) => (a.confidence ?? 0) - (b.confidence ?? 0))[0] ?? null
    );
  }

  #findAccuracyKey(
    keys: readonly LessonKey[],
    targetAccuracy: number,
  ): LessonKey | null {
    return (
      [...keys]
        .filter(
          (key) =>
            key.recentAttempts >= MIN_ACCURACY_ATTEMPTS &&
            (key.recentAccuracy ?? 1) < targetAccuracy,
        )
        .sort(
          (a, b) => (a.recentAccuracy ?? 1) - (b.recentAccuracy ?? 1),
        )[0] ?? null
    );
  }

  override generate(lessonKeys: LessonKeys, rng: RNGStream) {
    const filter = new Filter(
      lessonKeys.findIncludedKeys(),
      lessonKeys.findFocusedKey(),
    );
    const wordGenerator = this.#makeWordGenerator(filter, rng);
    const words = mangledWords(
      uniqueWords(wordGenerator),
      this.model.language,
      Letter.restrict(Letter.punctuators, this.codePoints),
      {
        withCapitals: this.settings.get(lessonProps.capitals),
        withPunctuators: this.settings.get(lessonProps.punctuators),
      },
      rng,
    );
    return generateFragment(this.settings, words, {
      repeatWords: this.settings.get(lessonProps.repeatWords),
    });
  }

  #getLetters() {
    const { letters } = this.model;
    const { codePoints } = this;
    if (this.settings.get(lessonProps.guided.keyboardOrder)) {
      return Letter.weightedFrequencyOrder(letters, ({ codePoint }) =>
        codePoints.weight(codePoint),
      );
    } else {
      return Letter.frequencyOrder(letters);
    }
  }

  #makeWordGenerator(filter: Filter, rng: RNGStream) {
    const pseudoWords = phoneticWords(this.model, filter, rng);
    if (this.settings.get(lessonProps.guided.naturalWords)) {
      const words = this.dictionary.find(filter).slice(0, 1000);
      while (words.length < 15) {
        const word = pseudoWords();
        if (word != null) {
          words.push(word);
        } else {
          break;
        }
      }
      if (words.length === 0) {
        words.push("?");
      }
      return randomWords(words, rng);
    }
    return pseudoWords;
  }
}
