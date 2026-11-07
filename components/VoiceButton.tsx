"use client";
import { useState } from "react";
import { Volume2, Square } from "lucide-react";
import { useApp } from "./Providers";
import type { Draw } from "@/lib/types";

const spell = (s: string) => s.replace(/\s/g, " ").split("").join(" ");

export function VoiceButton({ draw }: { draw: Draw }) {
  const { t, lang } = useApp();
  const [on, setOn] = useState(false);
  function toggle() {
    const synth = window.speechSynthesis; if (!synth) return alert("Speech not supported on this device");
    if (on) { synth.cancel(); setOn(false); return; }
    const p = draw.prizes;
    const ml = lang === "ml";
    const parts = [
      ml ? `${draw.name} ഫലം.` : `${draw.name} lottery result.`,
      ...(["first", "second", "third"] as const).flatMap((k) => p[k].slice(0, 1).map((w) =>
        `${ml ? { first: "ഒന്നാം സമ്മാനം", second: "രണ്ടാം സമ്മാനം", third: "മൂന്നാം സമ്മാനം" }[k] : { first: "First prize", second: "Second prize", third: "Third prize" }[k]}: ${spell(w.ticket)}${w.district ? ", " + w.district.toLowerCase() : ""}.`)),
    ];
    synth.cancel();
    parts.forEach((txt, i) => {
      const u = new SpeechSynthesisUtterance(txt); u.lang = ml ? "ml-IN" : "en-IN"; u.rate = 0.85;
      if (i === parts.length - 1) u.onend = () => setOn(false);
      synth.speak(u);
    });
    setOn(true);
  }
  return <button className="btn btn-ghost" onClick={toggle}>{on ? <Square size={16} /> : <Volume2 size={16} />}{on ? t("stop") : t("listen")}</button>;
}
