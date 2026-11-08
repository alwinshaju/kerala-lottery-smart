export type Lang = "en" | "ml";
const en = {
  appName: "Kerala Lottery", home: "Home", search: "Scan", predict: "Picks", vault: "My Vault", analytics: "Analytics", tools: "Tools",
  live: "LIVE DRAW IN PROGRESS", awaitingPdf: "Awaiting official PDF (~4:20 PM)", verified: "VERIFIED WITH OFFICIAL GOVT PDF", unverified: "Not yet verified with official PDF",
  downloadPdf: "Download Official PDF", first: "1st Prize", second: "2nd Prize", third: "3rd Prize", consolation: "Consolation Prize",
  listen: "Listen", stop: "Stop", share: "Share as image", check: "Check", ticketPh: "PA 380169 or last 4 digits 0169",
  won: "Congratulations! You won", noWin: "No prize won. Try again!", scan: "Scan ticket", demo: "DEMO DATA — synthetic results for development. Connect Supabase and ingest official PDFs for real data.",
  disclaimer: "Disclaimer: This platform is an independent informational tool and is NOT affiliated with or endorsed by the Government of Kerala or the Directorate of Kerala State Lotteries. We DO NOT sell lottery tickets online. Data is compiled from official sources (statelottery.kerala.gov.in and lotteryagent.kerala.gov.in). Always cross-verify winning tickets with the official Kerala Government Gazette.",
  consensus: "Confirmed by 2 public sources · official PDF check pending",
  feedNote: "Result from a public source · official PDF check pending",
  accept: "I understand", latest: "Latest result", schedule: "Weekly schedule", language: "മലയാളം",
  statDisclaimer: "Statistical projection only; not guaranteed. Every 6-digit number is equally likely to be drawn.",
  bumper: "Bumper", poojaBumper: "Pooja Bumper 2026", countdown: "Countdown", netPayout: "Net Payout",
  stall: "Stall Assistant",
};
const ml: typeof en = {
  appName: "കേരള ലോട്ടറി ഹബ്", home: "ഹോം", search: "തിരയൽ/സ്കാൻ", predict: "സ്മാർട്ട് പിക്ക്", vault: "എന്റെ വോൾട്ട്", analytics: "വിശകലനം", tools: "ടൂൾസ്",
  live: "നറുക്കെടുപ്പ് നടക്കുന്നു", awaitingPdf: "ഫലം ഉടൻ — ഔദ്യോഗിക PDF ~4:30 PM", verified: "ഔദ്യോഗിക സർക്കാർ PDF ഉപയോഗിച്ച് സ്ഥിരീകരിച്ചു", unverified: "ഔദ്യോഗിക PDF സ്ഥിരീകരണം ഇതുവരെ ആയിട്ടില്ല",
  downloadPdf: "ഔദ്യോഗിക PDF ഡൗൺലോഡ്", first: "ഒന്നാം സമ്മാനം", second: "രണ്ടാം സമ്മാനം", third: "മൂന്നാം സമ്മാനം", consolation: "സമാശ്വാസ സമ്മാനം",
  listen: "കേൾക്കുക", stop: "നിർത്തുക", share: "ചിത്രമായി പങ്കിടുക", check: "പരിശോധിക്കുക", ticketPh: "PA 380169 അല്ലെങ്കിൽ അവസാന 4 അക്കം 0169",
  won: "അഭിനന്ദനങ്ങൾ! നിങ്ങൾ നേടി", noWin: "സമ്മാനമില്ല. വീണ്ടും ശ്രമിക്കുക!", scan: "ടിക്കറ്റ് സ്കാൻ", demo: "ഡെമോ ഡാറ്റ — വികസനത്തിനുള്ള കൃത്രിമ ഫലങ്ങൾ.",
  disclaimer: "നിരാകരണം: ഇത് ഒരു സ്വതന്ത്ര വിവര ഉപകരണമാണ്; കേരള സർക്കാരുമായോ കേരള സംസ്ഥാന ലോട്ടറി ഡയറക്ടറേറ്റുമായോ ബന്ധമില്ല, അവരുടെ അംഗീകാരവുമില്ല. ഞങ്ങൾ ഓൺലൈനായി ലോട്ടറി ടിക്കറ്റ് വിൽക്കുന്നില്ല. ഡാറ്റ statelottery.kerala.gov.in, lotteryagent.kerala.gov.in എന്നിവയിൽ നിന്ന് ശേഖരിച്ചതാണ്. വിജയിച്ച ടിക്കറ്റുകൾ ഔദ്യോഗിക ഗസറ്റുമായി ഒത്തുനോക്കുക.",
  consensus: "2 പൊതു സ്രോതസ്സുകളിൽ ഒത്തുനോക്കി · ഔദ്യോഗിക PDF കാത്തിരിക്കുന്നു",
  feedNote: "പൊതു സ്രോതസ്സിൽ നിന്ന് · ഔദ്യോഗിക PDF കാത്തിരിക്കുന്നു",
  accept: "മനസ്സിലായി", latest: "ഏറ്റവും പുതിയ ഫലം", schedule: "പ്രതിവാര ഷെഡ്യൂൾ", language: "English",
  statDisclaimer: "സ്ഥിതിവിവര കണക്ക് മാത്രം; ഉറപ്പില്ല. ഏത് 6 അക്ക നമ്പറിനും തുല്യ സാധ്യതയാണ്.",
  bumper: "ബമ്പർ", poojaBumper: "പൂജ ബമ്പർ 2026", countdown: "കൗണ്ട്ഡൗൺ", netPayout: "നികുതി കഴിഞ്ഞുള്ള തുക",
  stall: "കടയിലെ ടിക്കറ്റ്",
};
export const dict = { en, ml };
export type Key = keyof typeof en;
