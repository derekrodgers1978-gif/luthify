Place instrument GLB files here.

Each filename should match `model` in `src/config/instruments.json`.
For automatic material assignment, name meshes with these role tokens:

- `BODY`
- `NECK`
- `FRETBOARD`
- `PICKGUARD`
- `PICKUPS`
- `BRIDGE`
- `HARDWARE`

The renderer also includes legacy heuristics for current imported assets, but new production models should use the canonical names above.
