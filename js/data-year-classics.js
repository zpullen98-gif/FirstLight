/* First Light: the third 366: The Classics.

   The famous lines of philosophy and literature, standing day for day beside
   the Philosophers and the Makers. Same twelve monthly themes, in the same
   order, so a reader can switch tracks mid-year and land on the same subject
   rather than the same sentence; kept and by-heart keys are namespaced by
   track (`classics:3-14`), so nothing a reader saved on one track is claimed
   by another.

   WHO IS IN IT. A line from a named work by a named author, in philosophy or
   imaginative literature: poetry, drama, fiction, essay, letters, diaries.
   Ancient to twentieth century. The sentence a book is known by, or its first
   or last, and it has to do something for the reader at six in the morning on
   the month's theme. Not scripture, which the Library owns; not film, which the
   lift bank owns; not proverbs, which the Philosophers' Wisdom tag owns; not
   business, oratory or self-help. Authors with ten or more entries on the
   Philosophers (Marcus Aurelius, Confucius, Laozi, Seneca, Zhuangzi, Epictetus,
   Publilius Syrus, Cicero) are not here: the reader who wants them has a year
   of them.

   THE CITATION STANDARD IS THE SAME ONE, AND IT IS NOT NEGOTIABLE. See
   SOURCES.md. Famous quotation is where the misattributions live: the Gandhi
   that is not Gandhi, the Einstein that is not Einstein, the Hemingway that
   never wrote it. Every entry here was found in a real edition before it
   landed, a translated line names its translator, and .scripts/check-year.js
   refuses the file otherwise. A line with no locatable source does not go in
   because it is famous. That is how it got famous.

   Entries are [day, quote, source, tradition, note?], identical in shape to Q
   and Q_MAKERS, so every reader of the data (Today, the Year, search, the
   Vault, the by-heart shelf, the lift pool) works on this track without
   knowing which it is holding. The tradition tag here is the FORM of the work:
   Philosophy, Poetry, Drama, Fiction, Essay, Correspondence, Diary. The source
   line leads with the author's name, because the card prints element 2 as the
   byline and has no author field of its own.

   INCOMPLETE ON PURPOSE, AND SAFE WHILE INCOMPLETE. The track is offered to
   the reader only once all 366 days are written and verified; until then
   flActiveTrack() refuses to hand it out and falls back to the Philosophers.
   See js/tracks.js. Months land one at a time through
   .scripts/year-classics/land-month.js, which runs the gate first. */

const MONTHS_CLASSICS = [
  ["January", "Beginning Again", "Opening lines. The first sentence of a book is a promise made before anything is proved, and the poets and philosophers made it anyway."],
  ["February", "Compassion and Kindness", "What the novelists knew about other people. The month for the lines that widen the circle."],
  ["March", "Discipline and Habit", "The writers on the work of writing, and the philosophers on the work of becoming. Practice, not inspiration."],
  ["April", "Renewal and the Way", "Spring in the poets, and the path in the philosophers. Setting out, and the road that teaches."],
  ["May", "Wisdom and Counsel", "Advice that outlived the giver: maxims, aphorisms, and the counsel a character gives on the way out of the door."],
  ["June", "Truth and Clarity", "Plain speech from people who chose every word. Seeing what is there, and saying it."],
  ["July", "Courage in Trial", "The heroic lines and the quieter ones: what the epics and the novels say about holding when it is hard."],
  ["August", "Impermanence", "The elegies. Poets on the passing of things, and the philosophers on what stays."],
  ["September", "Justice and Service", "What is owed. The moral philosophers and the social novelists on the debt to other people."],
  ["October", "Stillness and Silence", "The contemplatives: the quiet poems, the meditations, the lines about attention and the empty room."],
  ["November", "Gratitude and Mortality", "The two oldest subjects of literature, counted together. Thanks, and the last things."],
  ["December", "Renewal and Hope", "Closing lines, and the promise the books keep: the last sentence opens on a beginning."]
];

/* Months are added one at a time by land-month.js, each through the gate
   before it lands. Nothing goes in this object that has not been verified. */
const Q_CLASSICS = {
};
