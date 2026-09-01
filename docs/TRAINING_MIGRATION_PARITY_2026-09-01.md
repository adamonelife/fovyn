# Training migration parity checkpoint

Verified on 1 September 2026 against the connected Google Sheet **Training Calculator** (`1kBOk6qQa0evlSzYcrRuhmXOQJpldW0S_iemDa3OHzhw`) and Supabase project `ukvrfejyyhgnzljquxvt`.

The Google Sheet remained read-only and unchanged.

| Source area | Sheet | Migrated Supabase | Result |
| --- | ---: | ---: | --- |
| Exercises | 58 | 58 | Exact row parity |
| Rules | 58 | 58 | Exact row parity |
| Template rows | 64 | 63 | Exact unique-row parity; the Sheet contains the identical `Leg / A / Bike` row twice |
| Workout-log rows | 88 | 88 | Exact row parity |
| Populated sets | 196 | 196 | Exact count parity |
| Session rows | 3 | 3 | Exact row parity |
| Session 0 baseline groupings | 4 | 4 | Preserved as four dated/type groupings |
| Cardio rows | 1 | 1 | Exact row parity |

Supabase contains one additional app-created training session dated 30 August 2026. It has no legacy session ID and is correctly excluded from migration parity.

The database therefore contains eight sessions in total: seven migrated historical/baseline sessions and one native Fovyn session.
