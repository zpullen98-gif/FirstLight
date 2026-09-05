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
1:[
[1,'The scariest moment is always just before you start. After that, things can only get better.','Stephen King, On Writing: A Memoir of the Craft (Scribner, 2000), "On Living: A Postscript," section 6','Letters','Not general advice. King wrote this in the postscript to On Writing, describing his first afternoon back at work in a wheelchair, weeks after a van nearly killed him in June 1999.'],
[2,'Let what might happen, to the Crimea I would go. If in no other way, then would I upon my own responsibility and at my own cost.','Mary Seacole, Wonderful Adventures of Mrs. Seacole in Many Lands, ch. 8 (James Blackwood, 1857)','Service'],
[3,'I always get up and make a cup of coffee while it is still dark—it must be dark—and then I drink the coffee and watch the light come.','Toni Morrison, "The Art of Fiction No. 134," The Paris Review 128 (Fall 1993), interviewed by Elissa Schappell and Claudia Brodsky Lacour','Letters'],
[4,'I am about to begin a systematic study of the subject in preparation for practical work to which I expect to devote what time I can spare from my regular business.','Wilbur Wright, letter to the Smithsonian Institution, 30 May 1899','Craft','A bicycle-shop owner writing to a museum to ask for the reading list, four and a half years before Kitty Hawk. The letterhead is the Wright Cycle Company.'],
[5,'It tasted of seawater . . . of brine and flesh . . . and somehow . . . of the future. Everything was different now. Everything.','Anthony Bourdain, Kitchen Confidential (Bloomsbury, 2000), First Course: “Food Is Good”','Kitchen'],
[6,'I think it\'s much better to start out on something that you\'re not at all sure that you can do.','Edmund Hillary, Academy of Achievement interview, San Francisco, 16 November 1991','Sport'],
[7,'I\'m going to play with physics, whenever I want to, without worrying about any importance whatsoever.','Richard Feynman, Surely You’re Joking, Mr. Feynman!, with Ralph Leighton (W. W. Norton, 1985), “The Dignified Professor”','Science'],
[8,'The ritual is not the stretching and weight training I put my body through each morning at the gym; the ritual is the cab. The moment I tell the driver where to go, I have completed the ritual.','Twyla Tharp with Mark Reiter, The Creative Habit: Learn It and Use It for Life (Simon & Schuster, 2003), chapter 2, "Rituals of Preparation"','Stage'],
[9,'I\'d never written a short story before, but when I got home, I thought, Well, why not. So I wrote one and submitted it.','Chinua Achebe, "The Art of Fiction No. 139," The Paris Review 133 (Winter 1994), interviewed by Jerome Brooks','Letters'],
[10,'Humans are allergic to change. They love to say, "We\'ve always done it this way." I try to fight that. That\'s why I have a clock on my wall that runs counter-clockwise.','Grace Hopper, lecture at Ohio State University, 5 February 1987; reported by Philip Schieber, OCLC Newsletter no. 167 (1987)','Science'],
[11,'I came to the conclusion that I was going to have to create the Web on my own.','Tim Berners-Lee, Weaving the Web (HarperSanFrancisco, 1999), ch. 3, “info.cern.ch”','Craft'],
[12,'I wondered if I could accomplish anything, and if it were worth while for me to try.','Booker T. Washington, Up from Slavery, ch. 8 (Doubleday, Page, 1901)','Service'],
[13,'Almost all good writing begins with terrible first efforts. You need to start somewhere. Start by getting something — anything — down on paper.','Anne Lamott, Bird by Bird: Some Instructions on Writing and Life (Pantheon, 1994), chapter "Shitty First Drafts"','Letters'],
[14,'You got to take one step at a time. You got to do it right.','Hank Aaron, Academy of Achievement interview, Turner Field, Atlanta, 10 September 2013','Sport'],
[15,'The show doesn\'t go on because it\'s ready; it goes on because it\'s eleven-thirty.','Tina Fey, "Lessons from Late Night," The New Yorker, 14 March 2011 issue','Stage','Fey prints this as rule three, then adds: "This is something Lorne has said often about \'Saturday Night Live.\'" The maxim is Lorne Michaels\'s; the sentence, as published, is Fey\'s.'],
[16,'Learn how to cook — try new recipes, learn from your mistakes, be fearless, and above all have fun!','Julia Child, My Life in France, with Alex Prud’homme (Alfred A. Knopf, 2006)','Kitchen'],
[17,'The habit of writing thus for my own eye only is good practice. It loosens the ligaments. Never mind the misses and the stumbles.','Virginia Woolf, A Writer\'s Diary, ed. Leonard Woolf (1953), entry for Easter Sunday, 20 April 1919','Letters','In the diary the clause runs "my belief that the habit of writing thus for my own eye only is good practice" — Woolf offers it as a belief, and the opening capital is the almanac\'s.'],
[18,'I would have given anything then to have been back in Illinois, but I had not the moral courage to halt and consider what to do; I kept right on.','Ulysses S. Grant, Personal Memoirs, vol. 1, ch. 18 (Charles L. Webster & Co., 1885)','Service'],
[19,'When you are standing in the pulpit, you must sound as though you know what you\'re talking about. When you\'re writing, you\'re trying to find out something which you don\'t know.','James Baldwin, "The Art of Fiction No. 78," The Paris Review 91 (Spring 1984), interviewed by Jordan Elgrably','Letters'],
[20,'I often thought it was really like going to your own execution.','Dorothy Hamill, Academy of Achievement interview, Scottsdale, Arizona, 17 June 2000','Sport','She is describing competition mornings. Just before this she says she would be sick beforehand, and afterwards that she counted down the hours from waking.'],
[21,'Cooking came to me as though it had been there all along, waiting to be expressed; it came as words come to a child when it is time for her to speak.','Marcella Hazan, Amarcord: Marcella Remembers (Gotham Books, 2008)','Kitchen'],
[22,'There is no such thing as a quantum leap. There is only dogged persistence — and in the end you make it look like a quantum leap.','James Dyson, Against the Odds: An Autobiography (Orion Business Books, 1997)','Craft','Before the dual cyclone went into production Dyson had built 5,127 prototypes. The number is his own, from the same book.'],
[23,'It is easy to become the dupe of a deferred purpose, of the promise the future can never keep.','Jane Addams, Twenty Years at Hull-House, ch. 4, “The Snare of Preparation” (Macmillan, 1910)','Service'],
[24,'So after thought, I decided it would be possible to work and go on training. It proved difficult.','Roger Bannister, Academy of Achievement interviews, 27 October 2000 and 7 June 2002','Sport'],
[25,'One might say that work substitutes for talent, or better yet that it creates talent.','Santiago Ramón y Cajal, Advice for a Young Investigator, ch. 2, trans. Neely Swanson and Larry W. Swanson (MIT Press, 1999)','Science'],
[26,'I wrote to my mother in India for recipes. She would answer with long letters in Hindi which I would take with me to school.','Madhur Jaffrey, An Invitation to Indian Cooking (Alfred A. Knopf, 1973)','Kitchen','The "school" was the Royal Academy of Dramatic Art, where she had gone from Delhi to train as an actress. The book itself says only school.'],
[27,'I had a simple impulse to cut into the earth.','Maya Lin, Boundaries (Simon & Schuster, 2000)','Craft'],
[28,'As for myself, I experience a sort of terror when, at the moment of setting to work and finding myself before the infinitude of possibilities that present themselves, I have the feeling that everything is permissible to me.','Igor Stravinsky, Poetics of Music in the Form of Six Lessons, trans. Arthur Knodel and Ingolf Dahl (Harvard University Press, 1947), Lesson Three, "The Composition of Music," p. 63','Stage','Stravinsky delivered and published these Harvard lectures as his own, but they were drafted in French by Alexis Roland-Manuel with Pierre Souvtchinsky. The English is Knodel and Dahl\'s 1947 translation.'],
[29,'Yet it was in this miserable old shed that we passed the best and happiest years of our life, devoting our entire days to our work.','Marie Curie, Pierre Curie, trans. Charlotte and Vernon Kellogg (Macmillan, 1923), “Autobiographical Notes”','Science'],
[30,'If I could recover strength so much as to walk about, I would begin all over again.','Florence Nightingale, address to the probationer-nurses of the Nightingale School, May 1872; printed in Florence Nightingale to Her Nurses (Macmillan, 1914)','Service','Written, not spoken: these were annual letters to the Nightingale School, read aloud on her behalf by Sir Harry Verney. As the line says, she could not then walk about.'],
[31,'We are alive and well, and we have stores and equipment for the task that lies before us. The task is to reach land with all the members of the Expedition.','Ernest Shackleton, South (Heinemann, 1919), ch. 4, under 27 October 1915','Enterprise','The day Endurance was abandoned. South prints this under 27 October 1915 without calling it a diary entry; the manuscript diary at the Scott Polar Research Institute reads differently for that date.'],
],
  2: [], 3: [], 4: [], 5: [], 6: [],
  7: [], 8: [], 9: [], 10: [], 11: [], 12: []
};
