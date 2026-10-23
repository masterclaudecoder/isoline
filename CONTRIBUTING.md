# Contributing

## Commits

Commits and PR titles follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>(<scope>): <summary>
```

Types: `feat`, `fix`, `perf`, `refactor`, `style`, `docs`, `test`, `build`, `ci`, `chore`, `revert`. Add `!` after the type, or a `BREAKING CHANGE:` footer, for breaking changes. PRs are squash merged with a conventional title.

## Versions

Every update that ships bumps the version in `changelog.js`. Versions read `2.xx.yy`:

- **Major** (`2`): big rewrites or breaking changes to saved designs.
- **Minor** (`xx`, 0 to 99): any release with a `feat`.
- **Patch** (`yy`, 0 to 99): releases with only fixes and smaller changes.

When a part passes 99, bump the part above it and reset the rest to 0.

## Changelog

Add a new entry at the top of `window.CHANGELOG` in `changelog.js`:

```js
{ v: "2.8.0", at: "2026-10-24T18:05:00+03:00", title: "Short name", media: "previews/changelog/2.8.0.webp", items: [
  ["feat", "What is new, in one short line"],
  ["fix", "What works now"],
] },
```

- `at` is the release time with seconds and a UTC offset.
- `items` use the commit types. The app groups them as Added, Fixed, Faster and Changed.
- Add the Russian text for every new line to `ru.js`.
- Major and bigger minor releases get a banner in `media`.

## Banners

Banners are short animated webp clips recorded with the same tool as tooltip clips. Add a recipe to `BANNERS` in `tools/record.mjs`, start a local server on port 8765, then run:

```
node tools/record.mjs changelog 2.8.0
```

It writes `previews/changelog/2.8.0.webp` and leaves `tips.js` alone. Needs `playwright` and `sharp` 0.34 or newer.
