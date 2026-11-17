# Site design system

Use this guide for every new page and when revising an existing one. The goal is a clear upgrade decision at a glance, not a long report squeezed into a web page.

## Page structure

- Start with one short page title and a sentence describing the task. Avoid repeating the title in another panel.
- Put the decision, next action, or key comparison first. Put filters beside the content they control.
- Use the full desktop workspace for related information side by side. Keep cards and columns intrinsically sized so they collapse cleanly on narrow screens.
- Keep reference material, methodology, alternatives, and per-character breakdowns behind a clearly named disclosure. Do not make a user read setup instructions before seeing useful results.
- Use a single shared lineup or account context; do not repeat it in every section.

## Information density

- Show only information that changes the user's next decision. Prefer an action, amount, current state, and destination over repeated prose.
- Put short labels next to the value they explain. Do not stack multiple paragraphs of caveats under every row.
- Summarize large recipient sets with a count. When opened, show recipients in a compact responsive grid with a bounded scroll area.
- Keep recipient disclosures focused on character names; put slot numbers and replacement/refinement instructions in the action workflow instead.
- Keep alternatives distinct. Label them as alternatives so users do not add their quantities together.
- Show each source/shop once per item; collapse duplicate catalog routes instead of repeating the same shop in the primary offer and alternatives.
- Omit uncertain metadata labels when they do not change the user's next action. Keep meaningful distinctions such as random-pool availability.
- Keep uncertainty visible, but concise and next to the affected item. Put detailed evidence in a disclosure or link.
- Never hide a blocker, shortage, uncertainty, or relevant safety warning just to make a page look shorter.

## Layout and interaction

- Reuse the shared page shell, panels, tabs, filter controls, tables, badges, and character/resource components before adding new UI patterns.
- Use a comparison table when columns genuinely need comparison. On small screens, render table rows as labeled cards rather than forcing horizontal scrolling.
- Use cards for independent opportunities or teams. Group related work into tabs or sections instead of appending every workflow vertically.
- Give each disclosure a specific summary such as `Needs it (4)` rather than a generic `More` or `Who needs it`.
- Make scroll regions bounded, keyboard reachable through their content, and limited to secondary detail; never put the primary task in a tiny scroll box.
- Preserve semantic headings, table labels, keyboard behavior, visible focus, and descriptive accessible names.

## Visual language

- Continue the existing dark navy surfaces, restrained borders, cool-blue links, and game rarity colors.
- Keep a clear type scale: page title, section heading, item name, then muted supporting detail.
- Use one spacing rhythm and consistent card radii. Prefer alignment and whitespace over extra dividers, labels, or explanatory copy.
- Avoid decorative panels that do not group related information or clarify a decision.
- At desktop widths, make better use of horizontal space; at phone widths, reflow content without page-level horizontal overflow.

## Implementation

- Prefer shared components and existing domain calculations. Keep presentation changes out of domain logic.
- Avoid duplicating markup for desktop and mobile; use semantic markup and responsive CSS.
- Give visual changes focused interaction tests, especially for filters, disclosures, and responsive table/card behavior.
- Remove obsolete styles when replacing a layout. Keep styles readable and co-located by feature rather than adding another layer of one-off overrides.
