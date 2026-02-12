import { create } from "zustand";

export type ToggleKey =
  | "thirds"
  | "phi"
  | "spiral"
  | "leading"
  | "horizon"
  | "symmetry"
  | "diagonal"
  | "subject";

type ToggleState = {
  show: Record<ToggleKey, boolean>;
  set: (k: ToggleKey, v: boolean) => void;
  toggle: (k: ToggleKey) => void;
  setAll: (v: boolean) => void;
};

export const useUI = create<ToggleState>((set) => ({
  show: {
    thirds: true,
    phi: true,
    spiral: true,
    leading: true,
    horizon: true,
    symmetry: true,
    diagonal: true,
    subject: true,
  },
  set: (k, v) => set((s) => ({ show: { ...s.show, [k]: v } })),
  toggle: (k) => set((s) => ({ show: { ...s.show, [k]: !s.show[k] } })),
  setAll: (v) =>
    set(() => ({
      show: {
        thirds: v,
        phi: v,
        spiral: v,
        leading: v,
        horizon: v,
        symmetry: v,
        diagonal: v,
        subject: v,
      },
    })),
}));
