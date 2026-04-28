# Configurator data guide

The configurator is data-driven. To add an instrument, avoid component edits unless the new asset needs a genuinely new renderer behavior.

## Add an instrument

1. Place the GLB in `/public/models/`.
2. Add an entry to `instruments.json`.
3. Use one of the existing `materialPreset` values unless the asset needs custom shader behavior.

Example:

```json
{
  "id": "new-model",
  "label": "New Model",
  "model": "new-model.glb",
  "priceAdj": 0,
  "renderer": {
    "targetSize": 4.25,
    "cameraDistance": 6.4,
    "rotation": [0, 0, 0],
    "materialPreset": "universal"
  }
}
```

## Mesh naming contract

Name meshes with these role tokens so the universal material system can apply live configuration:

- `BODY`
- `NECK`
- `FRETBOARD`
- `PICKGUARD`
- `PICKUPS`
- `BRIDGE`
- `HARDWARE`

Legacy imports still use heuristic matching, but new production assets should use the role tokens above.

## Add options

Shared option groups, defaults, and pricing live in `options.json`. Instrument choices are sourced from `instruments.json`, so adding an instrument automatically adds it to the Body Shape group.
