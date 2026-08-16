# First Light — A Year of Mornings

A year of mornings, in an app that works on a plane.

Three hundred sixty-six dated voices from the Stoics, the Taoists, and the Confucian
tradition — one for every day of the year, including the leap day. Five scriptures
read through across a year: the Bible, the Qur'an, the Rig Veda, the Dhammapada, and
the Tanakh, each with its full text. A goal ladder at five altitudes, from the atoms
of a day to the milestones of a year. A chapter on the body as every tradition here
teaches it. A long chapter on astrology, presented as the symbolic art it is. And a
vault of the words you chose to keep.

The surface follows your sky — dark before first light, warm through sunrise, plain
by day, cooler at dusk — computed from the sun's real altitude where you are.

## Running it

```bash
py serve.py 8633
```

Then open <http://127.0.0.1:8633>. Install it from the browser to get it on a home
screen; after the first load it runs with no connection at all.

## Your record

Everything you keep, check, and write stays on your device, in `localStorage`. There
is no account, no server, and nowhere for it to be sent. That also means it does not
survive a new phone or a cleared browser — so **Settings → Export** writes a JSON
backup, and Import merges it back without deleting anything already there.

## Built with

No framework, no bundler, no build step, no dependencies. Plain HTML, CSS, and
JavaScript in classic script tags. The repository is the deployable artifact.

Cormorant Garamond and Karla, self-hosted. Both are variable fonts, latin subset —
93 KB for the pair.

## The Library

Ten works across seven traditions, every one of them complete and held on the device
rather than fetched a passage at a time. Each tradition also has a written chamber —
what it is, the words it thinks in, its voices, its branches, what its people
actually do, and where to begin reading — and eight *threads* put one question to
every tradition at once, in its own words, including where they flatly disagree.

| Work | Translation | Extent |
|---|---|---|
| The Bible | World English Bible | 66 books · 1,189 chapters · 31,095 verses |
| The Hebrew Bible | JPS 1917 | 39 books · 929 chapters · 23,206 verses |
| The Qur'an | Marmaduke Pickthall | 114 surahs · 6,236 ayahs |
| The Rig Veda | Ralph T. H. Griffith | 10 mandalas · 1,028 hymns · 10,497 verses |
| The Dhammapada | F. Max Müller, 1881 | 26 chapters · 423 verses |
| The Bhagavad Gita | Sir Edwin Arnold, 1885 | 18 chapters |
| Three Upanishads | Swami Paramananda | Isa, Katha, Kena, with commentary |
| The Tao Te Ching | James Legge, 1891 | 81 chapters |
| The Analects | James Legge, 1893 | 20 books · 498 chapters |
| The Zhuangzi | Herbert A. Giles, 1889 | 33 chapters |

Every translation is public domain. Texts are prepared once by
`.scripts/fetch-texts.js` and committed, so the running app never calls an outside
service for scripture — which is both what makes it work on a plane and what keeps it
from bulk-downloading against the terms of the archives that host these texts.

Practice videos in The Body belong to their creators and are embedded from YouTube.

## A note on the astrology chapter

It is presented as the tradition understands itself, and the app says plainly what it
is: a symbolic and interpretive art with a long history, not a predictive science.
It has not been borne out under controlled testing. Read it as you would a myth —
for what it illuminates, not for what it forecasts.

## Licence

The code is yours to read. The quoted texts are public domain or quoted under fair
use with attribution; the practice videos belong to their creators.
