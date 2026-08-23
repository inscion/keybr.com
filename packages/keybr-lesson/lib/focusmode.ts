import { Enum, type EnumItem } from "@keybr/lang";

export class FocusMode implements EnumItem {
  static readonly SPEED = new FocusMode("speed");
  static readonly ACCURACY = new FocusMode("accuracy");
  static readonly BOTH = new FocusMode("both");
  static readonly ALL = new Enum<FocusMode>(
    FocusMode.SPEED,
    FocusMode.ACCURACY,
    FocusMode.BOTH,
  );

  private constructor(readonly id: string) {
    Object.freeze(this);
  }

  toString() {
    return this.id;
  }

  toJSON() {
    return this.id;
  }
}
