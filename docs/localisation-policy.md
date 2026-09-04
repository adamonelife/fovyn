# Fovyn localisation policy

English (`en`) is the canonical V1 locale. Bahasa Indonesia is the first planned additional locale, but must not be exposed until complete and human-reviewed for sensitive language.

Canonical database values, identifiers, routes and enum keys remain language-independent. User-created names and text are preserved exactly as entered. Translation resources provide presentation labels only.

## Branded terminology registry

| Canonical key | English | Initial policy |
| --- | --- | --- |
| `fovyn` | Fovyn | Keep brand name |
| `forest` | Forest | Deliberate localisation decision |
| `nursery` | Nursery | Deliberate localisation decision |
| `clearing` | The Clearing | Deliberate localisation decision |
| `canopy` | The Canopy | Keep branded term until reviewed |
| `grove` | Grove | Deliberate localisation decision |
| `growth_rings` | Growth Rings | Deliberate localisation decision |
| `tree_guide` | Tree Guide | Localise after terminology review |
| `dormant_woods` | Dormant Woods | Deliberate localisation decision |
| `heartwood` | Heartwood | Keep branded term until reviewed |
| `root_for` | Root For | Keep branded term; localise explanation |
| `bloom` | Bloom | Deliberate localisation decision |
| `tend` | Tend | Deliberate localisation decision |
| `plant_together` | Plant Together | Deliberate localisation decision |
| `grow_together` | Grow Together | Deliberate localisation decision |
| `climate` | Climate | Localise |

## Definition of Done

- User-facing copy uses semantic localisation keys.
- Canonical values remain language-independent.
- User content is not automatically translated.
- Dates, times, numbers and currencies use locale-aware formatters.
- Layout tolerates longer strings on mobile and desktop.
- Guidance, Suggestions, validation and errors are localisable.
- Missing keys are visible to Development diagnostics and never shown to users in a released locale.
