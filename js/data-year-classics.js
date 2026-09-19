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
1:[
[1,"Days and months are travellers of eternity. So are the years that pass by.","Matsuo Bashō, The Narrow Road to the Deep North, opening sentences (trans. Nobuyuki Yuasa, 1966)","Diary"],
[2,"And now let us believe in a long year that is given to us, new, untouched, full of things that have never been, full of work that has never been done, full of tasks, claims, and demands; and let us see that we learn to take it without letting fall too much of what it has to bestow upon those who demand of it necessary, serious, and great things.","Rainer Maria Rilke, Letters 1892 to 1910, to Clara Rilke, Capri, 1 January 1907 (trans. J. B. Greene and M. D. Herter Norton, 1945)","Correspondence"],
[3,"Ring out the old, ring in the new, / Ring, happy bells, across the snow: / The year is going, let him go; / Ring out the false, ring in the true.","Alfred Tennyson, In Memoriam A.H.H., section CIV, lines 5 to 8 (Edward Moxon, 1850; CVI in the final text)","Poetry","In the 1850 first edition the Ring out, wild bells poem is section CIV; it became CVI only after Tennyson inserted two sections in 1851 and 1869. The wording is the first edition’s."],
[4,"Everything in the world began with a yes.","Clarice Lispector, The Hour of the Star, the opening sentence (Rodrigo S.M., the narrator) (trans. Giovanni Pontiero, 1986)","Fiction"],
[5,"Let no one be slow to seek wisdom when he is young nor weary in the search thereof when he is grown old.","Epicurus, Letter to Menoeceus, in Diogenes Laertius, Lives X.122 (trans. R. D. Hicks, 1925)","Philosophy"],
[6,"Marilla, isn’t it nice to think that to-morrow is a new day with no mistakes in it yet?","L. M. Montgomery, Anne of Green Gables, chapter 21, page 247 (Anne Shirley) (L. C. Page, 1908)","Fiction","Printed as the 1908 L. C. Page first edition has it, to-morrow with a hyphen; the unhyphenated form belongs to a modernised transcription, not to the edition named."],
[7,"Enlightenment is man’s emergence from his self-incurred immaturity.","Immanuel Kant, An Answer to the Question: What is Enlightenment?, opening sentence (trans. H. B. Nisbet, 1970)","Essay"],
[8,"Rise, brothers, rise, the wakening skies pray to the morning light, / The wind lies asleep in the arms of the dawn like a child that has cried all night.","Sarojini Naidu, Coromandel Fishers, lines 1 and 2, The Golden Threshold (William Heinemann, 1905)","Poetry","The 1905 edition prints a comma, not a semicolon, after the second rise, and titles the poem Coromandel Fishers without the article."],
[9,"It is perfectly true, as philosophers say, that life must be understood backwards. But they forget the other proposition, that it must be lived forwards.","Søren Kierkegaard, Journals, IV A 164, 1843 (trans. Alexander Dru, 1938)","Diary","Dru’s translation reads as philosophers say, with no article; the popular wording adds the. The Danish entry is Papirer IV A 164 of 1843."],
[10,"Welcome to the new life!","Anton Chekhov, The Cherry Orchard, Act IV, answering Anya as the family leaves the house (Trofimov) (trans. Constance Garnett, 1923)","Drama","Often quoted as the play’s last line; it is Trofimov’s answer to Anya as the young people leave the house, and Lopahin, Lyubov, Gaev and Firs all speak after it."],
[11,"Thence we came forth to rebehold the stars.","Dante Alighieri, Inferno, Canto XXXIV, line 139 (trans. Henry Wadsworth Longfellow, 1867)","Poetry"],
[12,"Men, though they must die, are not born in order to die but in order to begin.","Hannah Arendt, The Human Condition, ch. V, §34, p. 246 (University of Chicago Press, 1958)","Philosophy"],
[13,"In spring it is the dawn that is most beautiful.","Sei Shōnagon, The Pillow Book, section 1, the opening sentence (trans. Ivan Morris, 1967)","Diary"],
[14,"Every limit is a beginning as well as an ending.","George Eliot, Middlemarch, Finale, the opening sentence (1871 to 1872)","Fiction"],
[15,"Now is the winter of our discontent made glorious summer by this sun of York.","William Shakespeare, Richard III, Act 1, scene 1, lines 1 to 2 (Richard, Duke of Gloucester)","Drama"],
[16,"Nothing can ever happen twice. / In consequence, the sorry fact is / that we arrive here improvised / and leave without the chance to practice.","Wisława Szymborska, Nothing Twice, lines 1 to 4, Calling Out to Yeti (1957) (trans. Stanisław Barańczak and Clare Cavanagh, 1995)","Poetry"],
[17,"I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.","Henry David Thoreau, Walden, ch. 2, ‘Where I Lived, and What I Lived For’, 1854","Essay"],
[18,"One is not born, but rather becomes, a woman.","Simone de Beauvoir, The Second Sex, Book Two, Part IV, ch. XII (Childhood), opening sentence, p. 267 (trans. H. M. Parshley, 1953)","Philosophy"],
[19,"But that is the beginning of a new story—the story of the gradual renewal of a man, the story of his gradual regeneration, of his passing from one world into another, of his initiation into a new unknown life.","Fyodor Dostoevsky, Crime and Punishment, Epilogue, chapter 2, the closing paragraph (trans. Constance Garnett, 1914)","Fiction"],
[20,"As you set out for Ithaka / hope the voyage is a long one, / full of adventure, full of discovery.","C. P. Cavafy, Ithaka, lines 1 to 3, Collected Poems (trans. Edmund Keeley and Philip Sherrard, Princeton University Press, 1975)","Poetry","The voyage wording is the 1975 Keeley and Sherrard text. Their 1992 revised edition, the one most sites now print, reads hope your road is a long one."],
[21,"I hope I will be able to confide everything to you, as I have never been able to confide in anyone, and I hope you will be a great source of comfort and support.","Anne Frank, The Diary of a Young Girl: The Definitive Edition, entry of 12 June 1942 (trans. Susan Massotty, 1995)","Diary"],
[22,"For a conscious being, to exist is to change, to change is to mature, to mature is to go on creating oneself endlessly.","Henri Bergson, Creative Evolution, ch. I, p. 7 (trans. Arthur Mitchell, 1911)","Philosophy"],
[23,"A word is dead / When it is said, / Some say. / I say it just / Begins to live / That day.","Emily Dickinson, ‘A word is dead’ (Franklin 278), Poems, Third Series, ed. Mabel Loomis Todd, Life VI (1896)","Poetry"],
[24,"You are about to begin reading Italo Calvino’s new novel, If on a winter’s night a traveler.","Italo Calvino, If on a winter’s night a traveler, chapter 1, the opening sentence (trans. William Weaver, 1981)","Fiction"],
[25,"A book must be the axe for the frozen sea inside us.","Franz Kafka, Letters to Friends, Family, and Editors, to Oskar Pollak, 27 January 1904 (trans. Richard and Clara Winston, 1977)","Correspondence"],
[26,"Risk! Risk anything! Care no more for the opinions of others, for those voices. Do the hardest thing on earth for you. Act for yourself. Face the truth.","Katherine Mansfield, Journal of Katherine Mansfield, entry of 10 October 1922 (ed. J. Middleton Murry, 1927)","Diary","The 1927 Journal dates the entry 10 October 1922, under the heading The Final Step, and reads opinions in the plural. Later editions redate it to 14 October, her birthday."],
[27,"Believe that life is worth living, and your belief will help create the fact.","William James, Is Life Worth Living?, in The Will to Believe, final paragraph (1897)","Essay","Not the essay’s closing sentence: it opens the final paragraph, after Be not afraid of life, and James italicises is, which the card cannot show."],
[28,"For actually the earth had no roads to begin with, but when many men pass one way, a road is made.","Lu Xun, My Old Home, the closing sentence (the narrator) (trans. Yang Hsien-yi and Gladys Yang, 1960)","Fiction"],
[29,"We shall not cease from exploration / And the end of all our exploring / Will be to arrive where we started / And know the place for the first time.","T. S. Eliot, Four Quartets, ‘Little Gidding’, part V, lines 26 to 29 (Faber and Faber, 1942)","Poetry","The popular wording adds a comma after exploration; Eliot printed none. The text is Faber’s of 1942, collected in Four Quartets in 1944."],
[30,"One must imagine Sisyphus happy.","Albert Camus, The Myth of Sisyphus, closing sentence of the essay (trans. Justin O’Brien, 1955)","Philosophy"],
[31,"Last year is dead, they seem to say, / Begin afresh, afresh, afresh.","Philip Larkin, The Trees, lines 11 and 12, High Windows (Faber and Faber, 1974)","Poetry"]
],
2:[
[1,"What do we live for, if it is not to make life less difficult to each other?","George Eliot, Middlemarch, Book VIII, chapter 72 (Dorothea)","Fiction"],
[2,"No man is devoid of a heart sensitive to the suffering of others.","Mencius, Mencius, Book II, Part A, 6 (trans. D. C. Lau, 1970)","Philosophy"],
[3,"Then it is only kindness that makes sense anymore, / only kindness that ties your shoes / and sends you out into the day to mail letters and purchase bread, / only kindness that raises its head / from the crowd of the world to say / It is I you have been looking for, / and then goes with you everywhere / like a shadow or a friend.","Naomi Shihab Nye, Kindness, closing eight lines, Words Under the Words (Far Corner Books, 1995); first in Different Ways to Pray (1980)","Poetry"],
[4,"I am a man, and nothing that concerns a man do I deem a matter of indifference to me.","Terence, Heauton Timorumenos, Act 1, scene 1, line 77 (Chremes) (trans. Henry Thomas Riley, 1853)","Drama"],
[5,"Ultimately, we have just one moral duty: to reclaim large areas of peace in ourselves, more and more peace, and to reflect it toward others.","Etty Hillesum, An Interrupted Life, diary, 29 September 1942 (trans. Arnold J. Pomerans, 1983; Holt, 1996, p. 218)","Diary","The wording is the Henry Holt 1996 printing of Pomerans, p. 218, with the comma and toward; the 1983 Pantheon printing reads towards and no comma. The page itself was not opened; the entry date rests on every dated reproduction of the passage."],
[6,"His little, nameless, unremembered acts / Of kindness and of love.","William Wordsworth, Lines written a few miles above Tintern Abbey, lines 35 to 36, Lyrical Ballads (J. and A. Arch, 1798)","Poetry","Wording verified in the 1798 Lyrical Ballads text, where a comma follows unremembered in no copy consulted. In the 1798 numbering, with the half line Though absent long counted with the line before it, these are lines 35 and 36; the standard later text numbers them 34 and 35."],
[7,"Compassion is the chief law of human existence.","Fyodor Dostoevsky, The Idiot, Part II, chapter 5 (Prince Myshkin, in thought) (trans. Eva Martin, 1913)","Fiction"],
[8,"The love of our neighbor in all its fullness simply means being able to say to him: ‘What are you going through?’","Simone Weil, Waiting for God, Reflections on the Right Use of School Studies, p. 115 (trans. Emma Craufurd, 1951)","Essay"],
[9,"The quality of mercy is not strained. / It droppeth as the gentle rain from heaven / Upon the place beneath. It is twice blest: / It blesseth him that gives and him that takes.","William Shakespeare, The Merchant of Venice, Act 4, scene 1, lines 190 to 193, Folger edition (Portia)","Drama"],
[10,"Little feet of children / blue with cold, / how can they see you and not cover you— / dear God!","Gabriela Mistral, Piececitos (Little Feet), lines 1 to 4, Selected Poems of Gabriela Mistral (trans. Doris Dana, 1971)","Poetry"],
[11,"The best way to begin a day well is to think, on awakening, whether we cannot give pleasure during the day to at least one person.","Friedrich Nietzsche, Human, All-Too-Human, vol. I, section 589, The Day’s First Thought (trans. Helen Zimmern, 1909)","Philosophy"],
[12,"You never really understand a person until you consider things from his point of view … until you climb into his skin and walk around in it.","Harper Lee, To Kill a Mockingbird, Part One, chapter 3 (Atticus Finch)","Fiction","The spaced ellipsis stands for Scout’s interjection, Sir?, and the two dashes around it in the novel; every word is Lee’s."],
[13,"Don’t kill that fly! / Look—it’s wringing its hands, / wringing its feet.","Kobayashi Issa, ‘Don’t kill that fly!’, The Essential Haiku, Issa section (trans. Robert Hass, 1994)","Poetry"],
[14,"There is no charm equal to tenderness of heart.","Jane Austen, Emma, Volume II, chapter 13 (Emma Woodhouse, to herself)","Fiction"],
[15,"All the joy the world contains / Has come through wishing happiness for others. / All the misery the world contains / Has come through wanting pleasure for oneself.","Shantideva, The Way of the Bodhisattva, chapter 8, verse 129 (trans. Padmakara Translation Group, rev. ed. 2006)","Philosophy"],
[16,"I feel at home in the entire world, wherever there are clouds and birds and human tears.","Rosa Luxemburg, letter to Mathilde Wurm, 16 February 1917, from Wronke; The Letters of Rosa Luxemburg, p. 376 (trans. George Shriver, 2011)","Correspondence","The comma after world is restored to Shriver’s Verso text as three reviewers quote it; Nettl’s 1966 rendering prints the sentence without it. In the letter the sentence closes a rebuke of sorrow kept for one people only; alone it is the universal line."],
[17,"Life appears to me too short to be spent in nursing animosity or registering wrongs.","Charlotte Brontë, Jane Eyre, chapter 6 (Helen Burns)","Fiction"],
[18,"If I can stop one heart from breaking, / I shall not live in vain; / If I can ease one life the aching, / Or cool one pain, / Or help one fainting robin / Unto his nest again, / I shall not live in vain.","Emily Dickinson, ‘If I can stop one heart from breaking’ (Fr982, J919), Poems, ed. Todd and Higginson (Roberts Brothers, 1890), Life VI","Poetry"],
[19,"’Tis not my nature to join in hating, but in loving.","Sophocles, Antigone, line 523 (Antigone) (trans. R. C. Jebb, 1891)","Drama"],
[20,"She is a friend of my mind. She gather me, man. The pieces I am, she gather them and give them back to me in all the right order.","Toni Morrison, Beloved, Part Three (Knopf, 1987, pp. 272 to 273) (Sixo, remembered by Paul D)","Fiction","Sixo’s words for the Thirty-Mile Woman, as Paul D remembers them to Sethe in the last pages of Part Three: a reported line, and the reporter is named."],
[21,"Boundless compassion for all living beings is the surest and most certain guarantee of pure moral conduct, and needs no casuistry.","Arthur Schopenhauer, The Basis of Morality, Part III, Chapter VIII, (4) (trans. Arthur Brodrick Bullock, 1903)","Philosophy"],
[22,"Warning, in music-words / devout and large, / that we are each other’s / harvest: / we are each other’s / business: / we are each other’s / magnitude and bond.","Gwendolyn Brooks, Paul Robeson, lines 10 to 17, the closing lines, Family Pictures (Broadside Press, 1970)","Poetry"],
[23,"I have learnt that all men live not by care for themselves but by love.","Leo Tolstoy, What Men Live By, section XII (the angel Michael) (trans. Louise and Aylmer Maude, 1906)","Fiction"],
[24,"Love is the extremely difficult realisation that something other than oneself is real.","Iris Murdoch, The Sublime and the Good, Chicago Review 13.3 (1959), p. 51; in Existentialists and Mystics (1997), p. 215","Essay"],
[25,"He drew a circle that shut me out — / Heretic, rebel, a thing to flout. / But Love and I had the wit to win: / We drew a circle that took him in!","Edwin Markham, Outwitted, the whole poem, p. 1 (Voluntaries), The Shoes of Happiness, and Other Poems (Doubleday, Page, 1915)","Poetry"],
[26,"The only true voyage of discovery, the only fountain of Eternal Youth, would be not to visit strange lands but to possess other eyes, to behold the universe through the eyes of another, of a hundred others, to behold the hundred universes that each of them beholds, that each of them is.","Marcel Proust, The Captive, chapter II, the Vinteuil septet (trans. C. K. Scott Moncrieff, 1929)","Fiction","Scott Moncrieff’s sentence runs on after a semicolon: and this we can contrive with an Elstir, with a Vinteuil. The line is cut at that clause and given a full stop; every word is his, and the fountain of Eternal Youth is his own flourish, absent from the French."],
[27,"All real living is meeting.","Martin Buber, I and Thou, Part One, p. 11 (trans. Ronald Gregor Smith, 1937)","Philosophy"],
[28,"There is always something left to love. And if you ain’t learned that, you ain’t learned nothing.","Lorraine Hansberry, A Raisin in the Sun, Act III (Random House, 1959) (Mama, Lena Younger)","Drama"],
[29,"There is a land of the living and a land of the dead and the bridge is love, the only survival, the only meaning.","Thornton Wilder, The Bridge of San Luis Rey, Part Five: Perhaps an Intention, closing sentence (the Abbess, in thought)","Fiction"]
]
};
