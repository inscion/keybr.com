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
import { FormattedMessage, useIntl } from "react-intl";

export function AdaptiveFocusProp(): ReactNode {
  const { formatMessage } = useIntl();
  const { settings, updateSettings } = useSettings();
  const focusMode = settings.get(lessonProps.guided.focusMode);
  const targetAccuracy = settings.get(lessonProps.guided.targetAccuracy);

  const options = [
    {
      value: FocusMode.SPEED.id,
      name: formatMessage({ id: "focusMode.speed", defaultMessage: "Speed" }),
    },
    {
      value: FocusMode.ACCURACY.id,
      name: formatMessage({
        id: "focusMode.accuracy",
        defaultMessage: "Accuracy",
      }),
    },
    {
      value: FocusMode.BOTH.id,
      name: formatMessage({ id: "focusMode.both", defaultMessage: "Both" }),
    },
  ];

  return (
    <>
      <FieldList>
        <Field>
          <FormattedMessage
            id="settings.adaptiveFocus.label"
            defaultMessage="Adaptive focus:"
          />
        </Field>
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
          <Field>
            <FormattedMessage
              id="settings.targetAccuracy.label"
              defaultMessage="Target accuracy:"
            />
          </Field>
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
          <FormattedMessage
            id="settings.adaptiveFocus.description"
            defaultMessage="After all letter keys are unlocked, Speed preserves the original guided focus behavior. Accuracy focuses the least accurate well-sampled key below the target accuracy, falling back to current speed when all sampled keys are accurate enough. Both alternates two accuracy-focused lessons with one speed-focused lesson. During progressive key unlocking, the original speed-based focus is always preserved."
          />
        </Description>
      </Explainer>
    </>
  );
}
