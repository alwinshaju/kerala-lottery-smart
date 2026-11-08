"use client";
import Link from "next/link";
import { ArrowLeft, Share2 } from "lucide-react";
import { PoojaBumperHub } from "@/components/PoojaBumperHub";
import { useApp } from "@/components/Providers";

export default function BumperPage() {
  const { lang } = useApp();

  const handleShare = () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      navigator.share({
        title: "Pooja Bumper 2026 (BR-112) - Kerala State Lottery",
        text: "Pooja Bumper 2026 (BR-112) Draw on Nov 28, 2026 at 2:00 PM IST! 1st Prize ₹12 Crore. Check prize tiers, past winners & smart number generator.",
        url: window.location.href,
      }).catch(() => {});
    } else if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Bar with back link and share */}
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

      <PoojaBumperHub />
    </div>
  );
}

