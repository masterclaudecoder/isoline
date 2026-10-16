# How Isoline is designed

This is what we hold ourselves to. Every screen, string and animation in Isoline is checked against it, and the Builder's design rules carry the same ideas into the kits people make. If something here and the code disagree, fix the code.

## What we believe

**The work is the interface.** People come to make a picture, a palette or a kit. Their work fills the screen, and the controls sit around it, quiet and out of the way. Previews show your own design, never a stock example.

**Every choice has a reason.** A color, a shadow, a border, a line of copy: if we can't say why it's there, it goes. Defaults are where generic interfaces come from, so nothing ships on a default we didn't choose.

**Fewer, better things.** One leading element per screen. One hover style. One icon set. One accent, kept for calls to action and selection. When two things compete, one of them loses its color or its weight.

**Smooth beats fast-looking.** Animations get frames before anything else. Heavy work waits for idle time, never blocks a transition, and says what it's doing when it can't be hidden.

**Written like a person.** Short, plain, specific. We say what a control does and stop.

## Layout and visual language

- Group with space and hairline rules first. A card is the last resort, and cards never sit inside cards.
- Panels follow the task: build on the left, options in the middle, the work on the right. Each page is laid out for its own job, not poured into one template.
- Type is set with care: Instrument Sans with a real scale, tuned tracking and narrow widths for display sizes. Cyrillic falls back to Inter Tight, scaled to the same lowercase height.
- Sentence case everywhere. No ALL CAPS labels, no eyebrow line above a heading.
- Shadows are soft and neutral. No colored glows, no colored stripe down a card's side.
- The accent is for calls to action and selection. Everything else is ink, muted ink and surfaces.
- Icons come from one set and earn their place next to a label. No icon tiles above feature text.
- Numbers sit in sentences, tables or on the picture, not as a small label over a big figure.
- Controls in one row share a height. Segmented controls, switches and fields look the same everywhere.

## Motion and interaction

- Motion explains a change: opening, closing, adding, removing, reordering. It never decorates.
- Elements in a group move with slight variation in timing, so changes read as natural rather than mechanical.
- Nothing lifts, scales or slides on hover. Hover is one consistent tint.
- Reduced motion is respected everywhere, with instant or crossfaded changes in its place.
- Work that takes time shows a note at once: a roll shows "Rolling a new look" before the heavy work starts, and it stays long enough to read.
- Thumbnails and previews fill in by priority: what's in view first, a rough blurred version before the sharp one, never a stale or empty frame.
- Undo exists for everything destructive. Deletes show a toast with Undo instead of a confirmation dialog.

## Writing

Our copy follows the same rules as [stop-slop](https://github.com/hardikpandya/stop-slop), adapted for interface text.

- Labels name the thing. Helper text says what happens, in one short line, or isn't there.
- Buttons say what they do: Save, Export PNG, Copy link. Never Submit, OK or Click here.
- Empty states are one line about what's missing: "No saved looks yet."
- Notices state the result: "Link copied", "Opened without effects to keep it smooth". No apologies, no exclamation marks.
- No em dashes, in any language. Use a comma, a colon or a new sentence.
- No "not X, it's Y" contrasts, no throat-clearing ("Here's the thing"), no filler adverbs (simply, seamlessly, effortlessly, just, really).
- No marketing voice inside the tool. "Make patterns, gradients and effects, animate them and export anywhere" beats "Unleash your creativity".
- Specific over vague: "Frame time, shown on the canvas" beats "Performance information".
- Translations may change the wording to sound natural. Russian copy reads like a Russian designer wrote it, not like English with Russian words.

## What gives away a vibe-coded interface

These are the patterns we look for and remove. Any one alone can be fine; together they say nobody made a decision.

**Layout**
- A grid of three identical cards, each with an icon in a colored rounded square at the top left, a bold title and two lines of grey text.
- Bento grids for content that has no reason to be a grid.
- Stat cards: a small grey label over a huge number, repeated in a row of three or four.
- Every section wrapped in its own rounded box with a soft shadow.
- A centered hero with a slogan, two buttons and a gradient blob, followed by features, stats, testimonials and a dark call-to-action band.
- Cards with a colored left border to show "type" or "status".

**Labels and type**
- ALL CAPS eyebrow text above a heading, often in a pill-shaped chip with a tinted background.
- A badge or chip on every row, saying the same thing each time.
- Status dots that never change.
- Inter or the system stack at default tracking for everything, with no scale.
- Separator glyphs (·, •, |, em dashes) between items instead of spacing.

**Color and effects**
- Purple-to-blue or indigo gradients, Tailwind's default indigo buttons.
- Glassmorphism on every surface, neon glows, colored shadows.
- Emoji used as icons, sparkle icons for anything involving AI.
- Five or six accent colors competing on one screen.

**Interaction**
- Everything lifts and scales on hover.
- Arrows or chevrons on every button.
- Spinners with no words, or loading states that appear late.
- No empty, loading or error states designed, only the full one.
- Confirmation dialogs where an undo would do.

**Copy**
- "Welcome back!", "Let's get started!", exclamation marks in UI text.
- "Seamlessly", "effortlessly", "powerful", "unlock", "supercharge", "elevate".
- "It's not just X, it's Y." Rhetorical setups. Three-item lists by reflex.
- Helper text that repeats the label, or explains what any user can see.
- Invented statistics, logo walls and stock testimonials.

## Checklist before shipping

- Does the screen have one clear lead, and does the rest recede?
- Is every color, border and shadow there for a reason we can name?
- Can any string be shorter? Does any string contain an em dash, an exclamation mark or a filler adverb?
- Are empty, loading and error states designed?
- Does every change animate, and does anything move on hover that shouldn't?
- Does it work at phone width, in dark mode, with reduced motion, in Russian?
- Would a designer who had never seen it guess a person made each choice?
