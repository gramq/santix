import { useEffect, useState } from "react";
import { translations, type Lang } from "./translations";

function getStoredLang(): Lang {
  if (typeof window === "undefined") return "ro";
  return (localStorage.getItem("santix-lang") as Lang) ?? "ro";
}

export function useLanguage() {
  const [lang, setLang] = useState<Lang>(getStoredLang);

  useEffect(() => {
    const handler = (e: Event) => {
      setLang((e as CustomEvent<Lang>).detail);
    };
    window.addEventListener("santix-lang-change", handler);
    return () => window.removeEventListener("santix-lang-change", handler);
  }, []);

  const t = translations[lang];
  return { lang, t };
}
