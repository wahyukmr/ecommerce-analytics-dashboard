import { useEffect, useState, type PropsWithChildren } from "react";
import { detectUserLocale } from "../libs";
import { LocaleContext } from "./LocaleContext";
import type { UserLocaleInfo } from "../libs/locale";

/**
 * When the app loads: Detect the browser's default locale & time zone.
 * Request the user's location permission.
 * If the user grants permission: Retrieve coordinates → convert to time zone using timezonedb. Update the global React Context state.
 * If the user denies permission: Continue using the browser's default time zone.
 */
export const LocaleProvider = ({
  children,
}: PropsWithChildren): React.JSX.Element => {
  const [localeInfo, setLocaleInfo] = useState<UserLocaleInfo>(() =>
    detectUserLocale(),
  );

  useEffect(() => {
    const handleLanguageChange = () => {
      const detected = detectUserLocale();

      setLocaleInfo((prev) => ({
        ...prev,
        locale: detected.locale,
        userTimezone: detected.userTimezone,
      }));
    };

    window.addEventListener("languagechange", handleLanguageChange);

    return () => {
      window.removeEventListener("languagechange", handleLanguageChange);
    };
  }, []);

  return <LocaleContext value={localeInfo}>{children}</LocaleContext>;
};
