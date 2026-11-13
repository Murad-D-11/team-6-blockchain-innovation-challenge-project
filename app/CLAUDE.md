# Frontend design rules for Solstice (read before touching any UI)

This file governs the visual and interaction layer only. The root CLAUDE.md still governs everything else.
**Override for this pass (set by Abdullah, Nov 12):** the file-ownership rule in the root CLAUDE.md is lifted for UI work. You may edit any file in `app/src/app/**`, `app/src/components/**` and the labels/copy in `app/src/data/**`. You may NOT edit `app/src/lib/**`, `contracts/`, `scripts/`, `packages/`, `app/src/config/`, shared types, or anything that changes what a transaction does.

## What this product is, in one breath
Maria is a Filipina domestic worker about to leave for Hong Kong. A remittance company (RemitCo) pays her pre-departure bills straight to the clinic and training centre. She repays a capped share of each transfer she sends home. Every payment lands on a public receipt on Stellar. Fictional people, test USDC, testnet only.

## Who looks at this
1. **Judges (Stellar people, fintech founders)** in a 1-minute video, a trifold, and a 3-minute pitch. They decide in about 5 seconds whether the idea is clear. The first screen must show the idea, not describe it.
2. **A worker on a cheap phone**, 375px wide, slow network, English as a second language. Plain words, large targets, one task per screen.
Design for the phone first. Desktop is the same layout with more air, not a different product.

## The one design idea: money you can watch move
The product is a ledger. Make the money visible instead of decorating around it.
- **Home hero:** show the actual flow with real demo numbers. Bills in, who pays each (employer / RemitCo / blocked), then one transfer of 400 splitting into 340 to Lorna and 60 to RemitCo, with the balance falling 195.70 to 135.70. A visitor should understand Solstice without reading a paragraph.
- **Balance owed** is the hero number on the worker page. Show it as a number plus a thin bar that shrinks with each remittance.
- **A transfer** is drawn as one amount splitting into two, never as a form.
- **The receipt page** reads like a printed receipt: ruled lines, monospaced amounts, a timeline of what happened.
Anywhere a number moves, show before and after.

## Look and feel
- **Mood:** calm, exact, trustworthy. A good bank statement crossed with a printed remittance slip. Not a startup landing page, not a crypto app.
- **Surface:** warm paper, not cold grey. Suggested start: paper oklch(96% 0.012 85), sheet oklch(99% 0.005 85), ink oklch(22% 0.03 200), muted oklch(45% 0.02 200), rules oklch(85% 0.015 85). Adjust by eye, then check contrast.
- **One accent colour**, used only for the single most important action on a screen and for links. Suggested: deep teal oklch(42% 0.09 195). Do not spread it across icons, badges and borders.
- **Status colours are reserved and consistent:** paid/received = green, owed/pending = amber, blocked/refused = red. Always paired with a text label, never colour alone.
- **Type:** keep the existing three roles (display sans, body serif, mono) unless a better pairing is clearly justified. Use the mono face with tabular figures for every amount so digits line up. Cap display headings: nothing above about 3rem on mobile or 4.5rem on desktop. Three heading sizes plus body plus small is the whole scale.
- **Shape:** near-square corners (2-4px), hairline rules instead of boxes where possible. No shadows, no glassmorphism, no gradients, no blurred blobs.
- **Space:** a consistent 4/8 scale. Fewer, larger groups beat many small cards. A card inside a card is a bug.

## Banned (these are what makes it look AI-generated)
- Purple/blue gradients, gradient text, glowing borders, glass panels.
- Centered hero with a tagline, two buttons and a floating dashboard screenshot.
- Three-up "feature" cards with a round icon on top. Icon grids of any kind.
- Emoji or stock illustrations as decoration. Fake logos, fake testimonials, fake metrics, fake "trusted by".
- Rounded-2xl cards with soft shadows on every block. Pill badges on everything.
- Hover-lift cards, bouncing or parallax animation, dark-mode toggles, scroll-jacking.
- Marketing filler: "seamless", "empower", "revolutionize", "unlock", "effortless", "next-generation".
- Headings in title case shouting at 6xl. One idea per heading, sentence case.

## Copy
- Plain English, short sentences, concrete numbers and names ("RemitCo pays the training centre 190 USDC"). Say who does what.
- Buttons are verbs that say the result: "Send 400 home", "Confirm 65 USDC", not "Submit" or "Continue".
- Never use the words illegal, legally, or the law. The rulebook is the funder's policy, not a legal claim.
- Keep the honesty copy exactly: the "enforced by the contract vs checked by the app" split, "Fictional invoices and test USDC", the line that the fingerprint does not prove an invoice is genuine, and that Solstice cannot stop a recruiter asking for cash elsewhere. You may restyle these; do not weaken or remove them.
- The employer is optional: always "can", never "will".
- Use the funder name RemitCo and the product name Solstice. "Laya" must not appear in anything a user can see.

## Real-chain behaviour must be designed, not hidden
On the live site a transaction takes 5 to 10 seconds and reads take 15 to 25 seconds. Every action and every read needs a designed waiting state: a labelled spinner or skeleton, buttons that disable and say what is happening ("Confirming on Stellar…"), no layout jump when data arrives, a clear error with a way to retry (including when the user rejects the Freighter popup). Test with the mock client by adding artificial delay if needed.

## Interaction and accessibility (non-negotiable)
- Touch targets at least 44px. Body text at least 16px on mobile. Contrast at least 4.5:1 for text.
- Visible keyboard focus on everything. Real labels on every input. `aria-live` on status text.
- Respect `prefers-reduced-motion`. Motion is only for state changes, 120-220ms, ease-out. No decorative animation.
- No horizontal scroll at 375px. Tables become stacked rows on mobile.

## How to work (to avoid breaking a working app)
1. This app is verified on the real chain and judged in under 24 hours. **Change presentation, not behaviour.** Prefer editing `tokens.css`, `globals.css`, `PageShell`, and the markup of pages. Do not change data flow, hooks, `useLaya()` calls, ids used by tests, route paths, or the order of transactions.
2. Work one screen at a time in this order: home, worker dashboard, bills page, receipt (`/proof/[id]`), funder, creditor/clinic, employer, family, admin. After each screen, stop and show me before moving on.
3. For each screen, capture before/after at 375px and 1280px (mock mode, `?role=` to switch accounts) and describe what changed in two sentences.
4. Reuse the existing components in `app/src/components/ui`. Do not add a UI library or a new font family. Do not add dependencies.
5. After every change: `npm test` and `npm run build` in `app/` and show me the results. Do not commit. I commit myself.
6. If a change would alter wording that is a pitch claim, or anything about what the contract enforces, stop and ask.

---

# DESIGN DIRECTION v2 (Nov 12, 4:40 PM) — THIS SUPERSEDES "Look and feel", "The one design idea" and the "keep the existing fonts / change presentation not structure" rules above

The first home-page pass was rejected as bland and too close to the old design. Do not make a recolour. Restructure the home page and make it memorable. Everything else above (banned list, copy rules, honesty copy, real-chain states, accessibility, no changes to lib/contracts) still applies.

## Concept: the remittance slip
The product is a paper trail, so the home page is a **remittance slip lying on a dark field**.
- **Full-bleed dark hero** (deep green-ink, about oklch(24% 0.06 175)) replaces the pale masthead and beige page. The header is part of this field, not a separate band.
- **One large paper slip** (warm paper, about oklch(96% 0.02 90)) sits on the field, slightly offset from the headline column, with a soft hard-edged shadow (no blur) so it reads as an object. It has a dashed perforation line and a small notch or stub at one edge. Inside it is the ledger: ruled rows, monospaced amounts, bill names in the serif.
- **Rubber-stamp status marks** replace small coloured squares: PAID, OWES 0.00, NOT PAID. Rotated about -3 degrees, double-ruled border, ink-red oklch(50% 0.2 28) or ink-green oklch(45% 0.12 155), uppercase mono, static (no animation). Always with the text label.
- **The money split is the focal point.** On the slip, set "400.00" in the largest type on the page, then draw it splitting with simple static SVG lines into "340.00 to Lorna" and "60.00 to RemitCo". Under it, the balance "195.70 to 135.70" with the bar. These three numbers are what a judge should remember.
- **One signal colour** on the dark field: saffron/amber about oklch(82% 0.15 85), used only on the main button (dark text on it) and the money-split highlight. No teal button.

## Type: allowed to change
You may add ONE characterful display face through next/font/google (for example Fraunces, Instrument Serif or DM Serif Display) for the headline and the big numbers. Keep the mono face for amounts and a plain sans for UI text. Headline is a statement, set smaller than before (max 3.5rem desktop, 2.25rem mobile), with the CTA directly under it, not floating at the far right.

## Layout
- Desktop: two columns on the dark field. Left: headline, one-line explanation, CTA. Right: the slip. The slip overlaps the bottom edge of the hero slightly and the page continues on paper below with "Walk through the demo" as numbered steps (1 to 9) and "Public receipts".
- Mobile 375px: headline, CTA, then the slip full width. No horizontal scroll.
- You may rewrite the markup and structure of `app/src/app/page.tsx` freely. Keep the existing links, role query strings, receipts list component and every line of honesty copy.

## Squint test (must pass before you show me)
Blur your eyes at the 1280px screenshot. If it still looks like pale rows of text under a big black headline, it has failed. It must show: a dark field, one bright paper object, stamps, and one huge number.

## Then, only after I approve the home page
Move the dark-field/paper/stamp/saffron tokens into `tokens.css` so the other screens inherit them, then check each screen for contrast and layout breaks. Do not redesign the other screens from scratch.

## Output
Show before/after at 375px and 1280px. Run npm test and npm run build in app/ and show me the results. Do not commit.
