# Design: Solstice

The product uses Hallmark’s Almanac direction. The homepage is an invoice register, the request is an editable list of bills, and a receipt is a single ruled document.

## System

- Genre is editorial for the homepage and task-focused for the workspaces.
- Slate stock, pale paper, and blue-black ink establish the page hierarchy. Use magenta on the current action and links that need emphasis.
- Hanken Grotesk carries headings, controls, and product text. Newsreader carries the short homepage introduction. Geist Mono aligns amounts and holds technical identifiers.
- A two-pixel rule marks the start of a sheet. Hairlines separate rows. Keep surfaces square, with a two-pixel corner on controls.
- Use the demo’s actual bill types and values wherever an example helps. Keep payment status and funding terms visible as text.

## Controls and motion

- Use a solid accent action, an outlined secondary action, and underlined text links.
- Let disclosures and feedback carry state. Respect reduced-motion preferences and show keyboard focus.

## Exports

The source palette and type roles are in `app/src/app/tokens.css`. Tailwind aliases and shared styles are in `app/src/app/globals.css`.
