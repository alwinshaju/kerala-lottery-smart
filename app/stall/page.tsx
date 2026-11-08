"use client";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { StallAssistant } from "@/components/StallAssistant";
import { useApp } from "@/components/Providers";

export default function StallPage() {
  const { lang } = useApp();

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Kerala Lottery Stall Assistant",
        text: "Compare stall counter tickets and optimize books of 10 or 100 before buying at a lottery stall!",
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/"
          className="chip flex items-center gap-1.5 !text-xs !font-bold text-[color:var(--brand-d)]"
        >
          <ArrowLeft size={14} />
          {lang === "ml" ? "ഹോം" : "Back to Home"}
        </Link>
        <button
          onClick={handleShare}
          className="chip flex items-center gap-1.5 !text-xs !font-bold"
        >
          <Share2 size={14} />
          {lang === "ml" ? "പങ്കിടുക" : "Share"}
        </button>
      </div>

      <StallAssistant />
    </div>
  );
}

