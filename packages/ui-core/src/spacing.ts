import { ThemeSpacing } from "./types.js";

const BASE_SPACING = 8;

export const spacing: ThemeSpacing = (factor: number): string => {
  return `${BASE_SPACING * factor}px`;
};
