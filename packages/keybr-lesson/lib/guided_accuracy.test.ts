import { test } from "node:test";
import { Layout, loadKeyboard } from "@keybr/keyboard";
import { FakePhoneticModel } from "@keybr/phonetic-model";
import { Settings } from "@keybr/settings";
import { equal } from "rich-assert";
import { fakeKeyStatsMap, printLessonKeys } from "./fakes.ts";
import { FocusMode } from "./focusmode.ts";
import { GuidedLesson } from "./guided.ts";
import { recentAccuracy } from "./key.ts";
import { lessonProps } from "./settings.ts";

test("focus least accurate key after all letters are unlocked", () => {
  const settings = new Settings()
    .set(lessonProps.guided.focusMode, FocusMode.ACCURACY)
    .set(lessonProps.guided.targetAccuracy, 0.985);
  const keyboard = loadKeyboard(Layout.EN_US);
  const model = new FakePhoneticModel();
  const lesson = new GuidedLesson(settings, keyboard, model, []);
  const letters = model.letters;

  const lessonKeys = lesson.update(
    fakeKeyStatsMap(settings, [
      [letters[0], 1.1, 1.1, [99, 1]],
      [letters[1], 1.1, 1.1, [92, 8]],
      [letters[2], 1.1, 1.1, [96, 4]],
      [letters[3], 1.1, 1.1, [100, 0]],
      [letters[4], 1.1, 1.1, [100, 0]],
      [letters[5], 1.1, 1.1, [100, 0]],
      [letters[6], 1.1, 1.1, [100, 0]],
      [letters[7], 1.1, 1.1, [100, 0]],
      [letters[8], 1.1, 1.1, [100, 0]],
      [letters[9], 1.1, 1.1, [100, 0]],
    ]),
  );

  equal(printLessonKeys(lessonKeys), "A[B]CDEFGHIJ");
});

test("pure accuracy mode can focus an inaccurate key below target speed", () => {
  const settings = new Settings()
    .set(lessonProps.guided.focusMode, FocusMode.ACCURACY)
    .set(lessonProps.guided.targetAccuracy, 0.985);
  const keyboard = loadKeyboard(Layout.EN_US);
  const model = new FakePhoneticModel();
  const lesson = new GuidedLesson(settings, keyboard, model, []);
  const letters = model.letters;

  const lessonKeys = lesson.update(
    fakeKeyStatsMap(settings, [
      [letters[0], 0.7, 1.1, [90, 10]],
      [letters[1], 1.1, 1.1, [95, 5]],
      [letters[2], 1.1, 1.1, [100, 0]],
      [letters[3], 1.1, 1.1, [100, 0]],
      [letters[4], 1.1, 1.1, [100, 0]],
      [letters[5], 1.1, 1.1, [100, 0]],
      [letters[6], 1.1, 1.1, [100, 0]],
      [letters[7], 1.1, 1.1, [100, 0]],
      [letters[8], 1.1, 1.1, [100, 0]],
      [letters[9], 1.1, 1.1, [100, 0]],
    ]),
  );

  equal(printLessonKeys(lessonKeys), "[A]BCDEFGHIJ");
});

test("combined accuracy turn leaves below-speed keys to the speed queue", () => {
  const settings = new Settings()
    .set(lessonProps.guided.focusMode, FocusMode.BOTH)
    .set(lessonProps.guided.targetAccuracy, 0.985);
  const keyboard = loadKeyboard(Layout.EN_US);
  const model = new FakePhoneticModel();
  const lesson = new GuidedLesson(settings, keyboard, model, []);
  const letters = model.letters;

  const lessonKeys = lesson.update(
    fakeKeyStatsMap(settings, [
      // A is less accurate, but it is below target speed and belongs to speed.
      [letters[0], 0.7, 1.1, [90, 10]],
      // B is already fast enough, so it remains eligible for accuracy focus.
      [letters[1], 1.1, 1.1, [95, 5]],
      [letters[2], 1.1, 1.1, [100, 0]],
      [letters[3], 1.1, 1.1, [100, 0]],
      [letters[4], 1.1, 1.1, [100, 0]],
      [letters[5], 1.1, 1.1, [100, 0]],
      [letters[6], 1.1, 1.1, [100, 0]],
      [letters[7], 1.1, 1.1, [100, 0]],
      [letters[8], 1.1, 1.1, [100, 0]],
      [letters[9], 1.1, 1.1, [100, 0]],
    ]),
  );

  // fakeKeyStatsMap has zero results, so combined mode is on an accuracy turn.
  equal(printLessonKeys(lessonKeys), "A[B]CDEFGHIJ");
});

test("ignore inaccurate keys until enough attempts are observed", () => {
  const settings = new Settings()
    .set(lessonProps.guided.focusMode, FocusMode.ACCURACY)
    .set(lessonProps.guided.targetAccuracy, 0.985);
  const keyboard = loadKeyboard(Layout.EN_US);
  const model = new FakePhoneticModel();
  const lesson = new GuidedLesson(settings, keyboard, model, []);
  const letters = model.letters;

  const lessonKeys = lesson.update(
    fakeKeyStatsMap(settings, [
      [letters[0], 0.8, 1.1, [10, 10]],
      [letters[1], 1.1, 1.1, [100, 0]],
      [letters[2], 1.1, 1.1, [100, 0]],
      [letters[3], 1.1, 1.1, [100, 0]],
      [letters[4], 1.1, 1.1, [100, 0]],
      [letters[5], 1.1, 1.1, [100, 0]],
      [letters[6], 1.1, 1.1, [100, 0]],
      [letters[7], 1.1, 1.1, [100, 0]],
      [letters[8], 1.1, 1.1, [100, 0]],
      [letters[9], 1.1, 1.1, [100, 0]],
    ]),
  );

  // The 50%-accurate key has only 20 observations, so pure accuracy mode
  // deliberately leaves the lesson unfocused rather than falling back to speed.
  equal(printLessonKeys(lessonKeys), "ABCDEFGHIJ");
});

test("ignore accuracy samples outside the recent lesson window", () => {
  const result = recentAccuracy(
    [
      {
        index: 50,
        timeStamp: 0,
        hitCount: 0,
        missCount: 100,
        timeToType: 100,
        filteredTimeToType: 100,
      },
      {
        index: 250,
        timeStamp: 0,
        hitCount: 100,
        missCount: 0,
        timeToType: 100,
        filteredTimeToType: 100,
      },
    ],
    200,
    100,
  );

  equal(result.attempts, 100);
  equal(result.accuracy, 1);
});
