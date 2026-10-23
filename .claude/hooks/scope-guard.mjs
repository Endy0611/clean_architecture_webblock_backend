// PostToolUse (Edit|Write|MultiEdit): generated sites and Puck blocks must stay showcase-only (business rule 1).
// Tells Claude (does not undo) when cart/checkout/order/booking/payment code shows up in site code.
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { readInput, rel, ok, projectDir } from "./lib.mjs";

const file = rel(readInput().tool_input?.file_path);
const siteCode = /^(templates\/site-template|packages\/puck-blocks)\//.test(file) && /\.(tsx?|jsx?|prisma)$/.test(file);
if (!siteCode || !existsSync(path.join(projectDir, file))) ok();

const text = readFileSync(path.join(projectDir, file), "utf8");
const hits = [...new Set((text.match(/\b(add[_ ]?to[_ ]?cart|shopping[_ ]?cart|checkout|place[_ ]?order|buy[_ ]?now|book[_ ]?now|booking|stripe|paypal|khqr)\b/gi) || []).map(s => s.toLowerCase()))];
if (hits.length) {
  process.stdout.write(JSON.stringify({
    decision: "block",
    reason: `${file} contains ${hits.join(", ")}. WebBlock sites are showcase only (no cart, checkout, orders, bookings or payments; CTAs say "Contact us"). Remove it, or ask the user if this is intended.`,
  }));
}
ok();
