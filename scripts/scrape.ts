import { fetchListing } from "../lib/scraper/lotisParser";
fetchListing().then((r) => console.table(r.slice(0, 10)));
