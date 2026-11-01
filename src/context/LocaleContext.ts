import { createContext, use } from "react";
import type { UserLocaleInfo } from "../libs/locale";

export const LocaleContext = createContext<UserLocaleInfo | null>(null);

export function useLocale(): UserLocaleInfo {
  const context = use(LocaleContext);

  if (!context) {
    throw new Error("useLocale must be used within LocaleProvider");
  }

  return context;
}
