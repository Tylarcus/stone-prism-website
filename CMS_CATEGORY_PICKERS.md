# Stone Prism — CMS category pickers

## Artwork categories (Visual Archive)

When editing an image in **Visual Archive**, the **Artwork category** field
is now a searchable picker. It shows the readable names of existing categories
and saves the correct technical ID without requiring manual typing.

The original choices were preserved:
- Illustrations (`illustration`)
- Collages & Flyers (`collage`)
- Instruments (`gear`)
- Album Art (`album`)

To **add** a new category, open **Visual Categories / Filters** in Pages CMS,
create an entry with a descriptive **Category name** and a unique lowercase
**Category ID** (such as `live-shows`). The technical ID is only entered
once, when defining a new category. It then becomes a selectable option for
every artwork entry automatically—no config changes needed.

Do not change a category's ID after you've assigned it to pictures;
renaming its human-readable label is fine.

The category entries live in `content/visual-category-options/*.json`.
The preexisting `content/visual-categories.json` is kept as a backup for older
clones but is no longer used when the new collection exists.

## Music categories

**Music / Official releases & demos** already has dropdowns for the
**Music category** (Official / Website-exclusive Demo) and **Recording format**
(Single / EP / Album / Demo / Collection). The labels now make that clearer.
No existing recordings or IDs were changed.

## Safety

- This upgrade changes only Pages CMS editing controls and the category
  source used when building the published Visual Archive filters.
- Existing artwork category IDs, recording information, images, playback,
  homepage selections, and custom artwork references remain unchanged.
- A new category entry appears in site filters automatically on next publish.
