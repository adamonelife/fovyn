# FORBAIR Forest Master Specification v1.0

Status: authoritative implementation baseline. Later locked decisions override earlier explorations.

## Product foundation

FORBAIR is mobile-first, fully responsive and cross-platform. Phone uses compact bottom navigation; desktop/Mac uses the available canvas intentionally, particularly for a wider, richer Forest. Desktop is not a stretched phone viewport.

Branding is part of the first component, never a later skin: premium warm stone and embossed white-grey surfaces, forest greens, restrained lime, geometric sans typography, soft premium cards, generous whitespace, and a calm natural feel. The authoritative logo is the supplied organic growing-F asset at `public/brand/forbair-mark.png`; temporary letterform recreations must not be substituted.

Canonical information architecture: **Home | Track | Goals | History | Account**. Home is Today and uses compact navigation modules rather than full stacked modules. For authenticated users, Account always opens profile/account—not login.

Locked build order: app shell/navigation → Home → Account foundation → Habits → wider tracking and Goals → Forest data layer → Forest renderer.

## Forest grammar

- One Goal creates one permanent Tree identity. Resuming a Goal restores the same Tree.
- Tree position is deterministic from stable seeds. Users never manually position Trees.
- Forest state derives from core FORBAIR records; it is not a parallel currency, XP system, or progression economy.
- Species represents what has been built; health represents how the Goal is doing now.
- Species never regresses. Wider environmental progress never regresses as punishment.
- Seed, Sprout and Young Plant exist only in the Nursery. Common Juniper is the first stage placed into a main Area.
- Goal Areas are Health, Mind, Self, People, Work and Wealth. Stable geography, water routes and major objects are deterministic; weather, wildlife and minor motion vary by bounded environment session.
- Reopening the Forest cannot reroll encounters. Sessions and cooldowns prevent farming.

## Canonical growth registry

Normal growth has 27 stages: Seed; Sprout; Young Plant; Common Juniper; Japanese Maple; Jacaranda; Rowan; Flowering Dogwood; Holly; Silver Birch; Golden Ginkgo; Rainbow Eucalyptus; White Willow; Cherry Blossom; Red Maple; Eucalyptus; Royal Poinciana / Flame Tree; English Oak; Copper Beech; Norway Spruce; Golden Larch; Blue Atlas Cedar; Giant Sequoia; Douglas Fir; Japanese Cedar; Giant Mountain Ash; Coast Redwood.

Coast Redwood is stage 27 and the final normal Growth Tree. Legendary states beyond it are Major Oak (2.5 years), Fortingall Yew (3 years), Methuselah (5 years), and Yggdrasil (10 years).

Registry IDs and classes are permanent. Growth, Legendary, Achievement, and Challenge species cannot collide or be reused across classes. Common names are presentation; botanical identity is authoritative.

## Days Present wildlife

A Day Present requires meaningful product interaction; opening the app alone is insufficient. Track current, longest, and lifetime Days Present. A broken streak removes nothing already earned.

| Consecutive meaningful days | Permanent eligibility unlock |
|---:|---|
| 7 | Orangutan |
| 30 | Gorilla |
| 100 | Forest Elephant |
| 365 | Great White Stag |

Unlock means eligibility only. Habitat, Area, time, season, weather, encounter-session evaluation, probability, and separate audio/background/hero cooldowns still apply. No milestone guarantees a sighting.

The Great White Stag is the sole Mythic Wildlife entry. It is naturalistic, extraordinarily rare, visibly 20–30% larger than normal Sika Deer, broad through the chest, with huge antlers and slower, heavier movement. No magical glow, particles, discovery popup, catalogue silhouette, or collectible treatment.

## Environment contract

Local time and approximate solar state transition continuously through pre-dawn, sunrise, morning, midday, afternoon, golden hour, sunset, twilight and night. Seasons are ecological aesthetics and can follow northern, southern or automatic cycles. Hybrid weather is default; real conditions bias probabilities without dictating every session.

Weather supports Clear, Partly Cloudy, Overcast, Mist, Light Rain, Forest Rain, Heavy Rain, Post-Rain, Wind, Still, Snow and Storm, including compatible combinations. Wetness, mist and snow accumulation decay naturally.

Water progresses permanently: Spring → Pond → Stream → Established Stream → Rock Pools/Cascades → Waterfall. Vegetation maturity also progresses permanently. Ancient features move Not Eligible → Unlocked → Discovered, are revealed naturally, and remain permanent.

Wildlife evaluation order: unlocked → suitable Area → habitat → time → season/weather → cooldown → environment-session evaluation → probability → audio/background/hero result. Environmental moments combine existing eligible systems; secret moments have no UI checklist or post-event badge.

## Forest Lab and Showcase account

Forest Lab is restricted to authorized developer/QA accounts. It can force and replay every Growth, Legendary, Achievement and Challenge Tree; all Tree and health states; every normal, Days Present and Mythic wildlife species; audio, background and hero encounters; environmental moments; ancient features; Areas; seasons; weather; solar states; water stages; quality tiers; animation speed; and reduced motion.

Overrides are renderer inputs only. They never create Goals, achievements, Days Present, history, streaks, unlocks or persisted user progress. Lab supports desktop/Mac, phone and tablet, with device/viewport and quality simulation. Assets are approved in the real renderer, not as isolated artwork.

## Architecture and testing gates

The dependency chain is Tracking → Goals → Goal Rule History → Growth Engine → Forest State → Renderer → Animation. Assets resolve through a versioned manifest/service layer and support High, Balanced and Performance tiers plus close, mid and distant detail. Production media belongs in object storage/CDN, not the source repository.

Required automated invariants include: Nursery stages cannot enter an Area; Resting protects eligible age; Pruning does not rewrite historical targets; resumed/completed Goals retain Tree identity; species never regresses; Ended leaves the live Forest; one record may contribute to multiple Goals without duplication; registry classes cannot collide; and repeated openings cannot farm encounters.
