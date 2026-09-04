/* First Light — the second 366: The Makers.

   A motivational and inspirational track, meant to stand day for day beside the
   Philosophers. Same twelve monthly themes, in the same order, so a reader can
   switch tracks mid-year and land on the same subject rather than the same
   sentence: March is Discipline and Habit on both, and the kept-quote keys are
   namespaced by track (`makers:3-14`), so nothing a reader saved on one track is
   overwritten or claimed by the other.

   WHO IS IN IT. Not philosophers again under another name. This track is people
   who MADE something and said something usable about the making of it — writers,
   builders, athletes, scientists, cooks, organisers, people who kept going. The
   register is nearer the shift than the seminar: the reader is often standing up,
   often tired, and has about ninety seconds.

   THE CITATION STANDARD IS THE SAME ONE, AND IT IS NOT NEGOTIABLE. See SOURCES.md.
   Motivational quotation is the single most corrupted body of text in English —
   the genre runs on confident misattribution, and a great many of the lines that
   feel most quotable here are Victorian paraphrase, advertising copy, or invented
   outright in the last thirty years. Every entry in this file must survive the
   same audit January and February survived: named work, chapter or page or date,
   and an honest hedge with a printed note wherever the trail runs out. A famous
   line with no source does not go in unhedged because it is inspiring. That is
   exactly how the Stoic quotation trade got the way it is.

   Entries are [day, quote, source, tradition, note?], identical in shape to Q, so
   every reader of the data — Today, the Year, search, the Vault, the by-heart
   shelf — works on this track without knowing which track it is holding.

   INCOMPLETE ON PURPOSE, AND SAFE WHILE INCOMPLETE. The track is offered to the
   reader only once all 366 days are written and audited; until then flActiveTrack()
   refuses to hand it out and falls back to the Philosophers. See js/tracks.js. */

const MONTHS_MAKERS = [
  ["January", "Beginning Again", "Every maker's year opens the same way: with a blank thing and no proof it will work. These are the people who started anyway."],
  ["February", "Compassion and Kindness", "The month for what the work is finally for — the people it is done with, and the people it is done for."],
  ["March", "Discipline and Habit", "Nothing here is about inspiration. It is about the hours that get kept when nobody is watching and it is not going well."],
  ["April", "Renewal and the Way", "Beginning again after the thing failed — which is most of the making, and the part nobody photographs."],
  ["May", "Wisdom and Counsel", "What people who did the work say to people about to do it. Short, practical, and earned the hard way."],
  ["June", "Truth and Clarity", "Seeing the work as it actually is, not as you hoped. The month for honest assessment and plain speech."],
  ["July", "Courage in Trial", "High summer, hard roads. The nerve it takes to keep going when the outcome is genuinely in doubt."],
  ["August", "Impermanence", "Everything made is temporary, including the best of it. What that changes, and what it does not."],
  ["September", "Justice and Service", "Work as something owed. The month for the makers who thought the point was other people."],
  ["October", "Stillness and Silence", "Rest, attention, and the quiet that the work needs and rarely gets."],
  ["November", "Gratitude and Mortality", "Counting what was given, and counting the days. The two disciplines that sharpen one another."],
  ["December", "Renewal and Hope", "The darkest month, and the oldest promise the makers keep: begin again."]
];

/* Days are added a month at a time, each batch audited before it lands.
   Nothing goes in this object that has not been through the citation pass. */
const Q_MAKERS = {
  1: [], 2: [], 3: [], 4: [], 5: [], 6: [],
  7: [], 8: [], 9: [], 10: [], 11: [], 12: []
};
