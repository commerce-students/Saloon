# Placeholder imagery

Everything in this folder is a **generated, illustrative image** — it is not
photography of Chic by Sisters Clinic, its team, its premises, a treatment or a
result. Nothing here should be published as if it were the real clinic without
being replaced first.

| File | Used by | Notes |
| --- | --- | --- |
| `hero.jpg` | Home page hero | Interior scene, 4:5 |
| `reception.jpg` | Location section | Reception corner, 4:3 |
| `detail.jpg` | “The experience” section | Still life, square |

## Replacing them

1. Export the approved photograph as a JPEG at roughly the same aspect ratio and
   at least 1600 px on the long edge.
2. Overwrite the file with the same name (no code changes needed), **or** add the
   new file and update the import in the relevant section component.
3. Update the `alt` text to describe the real photograph — search for the file
   name across `src/components`.
4. Run `npm run images:optimize` to strip metadata and re-encode the images.

The captions that say “Illustrative image” live in the section components; remove
them once real photography is in place.
