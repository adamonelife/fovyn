# Goal evaluation timing matrix

| Rule | Can succeed early? | Can fail early? | Requires period close? | Requires elapsed time? |
|---|---:|---:|---:|---:|
| At least / minimum | Yes, when the minimum is reached | No | Only if still unresolved | No |
| At most / maximum | No | Yes, when the limit is exceeded | Yes for success | Yes |
| Exactly | No | Yes, when the target is exceeded | Yes for success | Yes |
| Range | No by default | Yes, when an additive value exceeds the upper bound | Yes for success | Yes |
| Finite total using minimum | Yes, when the total is reached | No | No | No |
| Measurement target using minimum | Yes, when the threshold is reached | No | No unless maintenance is configured | No unless maintenance is configured |
| Avoidance / duration | No | Yes when a violating record makes failure conclusive | Yes | Yes |

Periods are anchored to `goals.starts_on`. Current V1 periods are day, week, month, and year. A future explicit rolling/calendar/custom-window field must supply its own period-boundary strategy rather than silently reverting to calendar weeks.

Canonical record create, edit, delete, and backdate operations evaluate both the previous and new occurrence windows. Tree stages are a high-water mark and never regress after corrections.

## Cross-module contribution contract

A real-world fact remains canonical in its owning module. An explicit compatible
Goal association creates a reversible entry in `goal_source_contributions`; it
does not create a second `tracking_records` or History item. The source identity
and Goal identity form a unique pair, so explicit and future automatic matching
cannot count the same fact twice. Editing, unlinking, or deleting the source
re-evaluates the affected Goal period while preserving non-regressing earned
Tree growth.

Nutrition's V1 explicit association is intentionally limited to count-based
Goals. Numeric mappings such as protein, calories, weight, duration, and money
must use an explicit structured automatic-metric mapping rather than treating
an arbitrary module entry as a value of `1`.
