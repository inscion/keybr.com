import { FocusMode, lessonProps } from "@keybr/lesson";
import { useSettings } from "@keybr/settings";
import {
  Description,
  Explainer,
  Field,
  FieldList,
  OptionList,
  Range,
  Value,
} from "@keybr/widget";
import { type ReactNode } from "react";

export function AdaptiveFocusProp(): ReactNode {
  const { settings, updateSettings } = useSettings();
  const focusMode = settings.get(lessonProps.guided.focusMode);
  const targetAccuracy = settings.get(lessonProps.guided.targetAccuracy);

  const options = [
    {
      value: FocusMode.SPEED.id,
      name: "Speed",
    },
    {
      value: FocusMode.ACCURACY.id,
      name: "Accuracy",
    },
    {
      value: FocusMode.BOTH.id,
      name: "Both",
    },
  ];

  return (
    <>
      <FieldList>
        <Field>Adaptive focus:</Field>
        <Field>
          <OptionList
            options={options}
            value={focusMode.id}
            onSelect={(id) => {
              updateSettings(
                settings.set(lessonProps.guided.focusMode, FocusMode.ALL.get(id)),
              );
            }}
          />
        </Field>
      </FieldList>
      {focusMode !== FocusMode.SPEED && (
        <FieldList>
          <Field>Target accuracy:</Field>
          <Field>
            <Range
              size={16}
              min={lessonProps.guided.targetAccuracy.min}
              max={lessonProps.guided.targetAccuracy.max}
              step={0.001}
              value={targetAccuracy}
              onChange={(value) => {
                updateSettings(
                  settings.set(lessonProps.guided.targetAccuracy, value),
                );
              }}
            />
          </Field>
          <Field>
            <Value value={`${(targetAccuracy * 100).toFixed(1)}%`} />
          </Field>
        </FieldList>
      )}
      <Explainer>
        <Description>
          After all letter keys are unlocked, Speed preserves the original
          guided focus behavior. Accuracy focuses the least accurate
          well-sampled key below the target accuracy. Both uses two
          accuracy-focused lessons for every one speed-focused lesson. During
          progressive key unlocking, the original speed-based focus is always
          preserved.
        </Description>
      </Explainer>
    </>
  );
}
