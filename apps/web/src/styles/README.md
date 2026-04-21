# DeckForge Design Tokens

## Colour palette

All colours are defined as CSS custom properties on `:root` and `.dark` in `src/index.css`.
Reference them in Tailwind as semantic utility classes — never use hardcoded hex or oklch values.

| Token      | Light (`#hex`)  | Dark (`#hex`)   | Usage                                   |
|------------|-----------------|-----------------|----------------------------------------- |
| `bg`       | `#FAFAF7`       | `#0F0F0E`       | Page background                         |
| `surface`  | `#FFFFFF`       | `#1A1A18`       | Cards, modals, inputs                   |
| `fg`       | `#1A1A18`       | `#F5F5F2`       | Body text, headings                     |
| `muted`    | `#6B6B66`       | `#8E8E89`       | Placeholders, secondary labels, meta    |
| `accent`   | `#B45309`       | `#F59E0B`       | **Primary actions only** (CTA buttons, active tab underline, focus rings) |
| `success`  | `#059669`       | `#10B981`       | Positive feedback, "Easy" grade button  |
| `warn`     | `#DC2626`       | `#EF4444`       | Destructive actions, "Again" grade      |
| `border`   | `#D9D7D2`       | `#2A2A27`       | All borders, dividers, skeleton bg      |

**Rule: one accent colour, used sparingly, on primary actions only.**
Never use `accent` for decoration, hover states, or secondary UI chrome.

## Typography

| Family        | Variable          | Usage                                                     |
|---------------|-------------------|-----------------------------------------------------------|
| `font-serif`  | Fraunces          | H1, H2, card-front in review, landing hero, session end   |
| `font-sans`   | Inter             | Everything else — body, labels, buttons, nav              |
| `font-mono`   | JetBrains Mono    | API keys, next-interval text under review buttons, code   |

## Motion constants

| Name         | Duration  | Easing     | Used for                       |
|--------------|-----------|------------|--------------------------------|
| `flip`       | `300ms`   | `ease-out` | Card 3D rotate-Y in review     |
| `tab`        | `150ms`   | default    | Tab switches, theme toggle     |
| `press`      | `100ms`   | default    | Button active/press scale      |

Apply via Tailwind: `duration-flip`, `duration-tab`, `duration-press` (extended in `tailwind.config.ts`).

## Shadows

- `shadow-lg` — modals and dialogs only
- `shadow-md` — card hover in library grid only
- Nowhere else

## Iconography

Lucide React only. One stroke weight (`strokeWidth={1.75}`), no mixing with other icon libraries,
no emoji in UI chrome.
