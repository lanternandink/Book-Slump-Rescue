import type { InsertCatalogBook } from "@shared/schema";

// Simple in-memory cache for API responses to avoid rate limiting
const searchCache = new Map<string, { data: InsertCatalogBook[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedSearch(query: string): InsertCatalogBook[] | null {
  const cached = searchCache.get(query.toLowerCase());
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return null;
}

function setCachedSearch(query: string, data: InsertCatalogBook[]): void {
  searchCache.set(query.toLowerCase(), { data, timestamp: Date.now() });
  // Cleanup old entries if cache gets too large
  if (searchCache.size > 100) {
    const now = Date.now();
    for (const [key, value] of searchCache.entries()) {
      if (now - value.timestamp > CACHE_TTL) {
        searchCache.delete(key);
      }
    }
  }
}

interface GoogleBooksVolume {
  id: string;
  volumeInfo: {
    title?: string;
    authors?: string[];
    description?: string;
    categories?: string[];
    pageCount?: number;
    publishedDate?: string;
    imageLinks?: {
      thumbnail?: string;
      smallThumbnail?: string;
      small?: string;
      medium?: string;
      large?: string;
    };
    industryIdentifiers?: Array<{
      type: string;
      identifier: string;
    }>;
  };
  saleInfo?: {
    saleability?: string;
    isEbook?: boolean;
  };
  accessInfo?: {
    epub?: { isAvailable?: boolean };
    pdf?: { isAvailable?: boolean };
  };
}

interface GoogleBooksResponse {
  totalItems: number;
  items?: GoogleBooksVolume[];
}

const GOOGLE_BOOKS_API = "https://www.googleapis.com/books/v1/volumes";

function deriveLength(pageCount: number | undefined): string {
  if (!pageCount) return "medium";
  if (pageCount < 300) return "short";
  if (pageCount <= 450) return "medium";
  return "long";
}

function deriveMoodFromCategories(categories: string[] | undefined, description: string | undefined): string {
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  if (/\b(humor|comedy|romantic comedy|funny|hilarious|witty|laugh|satirical|snarky)\b/.test(text)) {
    return "happy";
  }
  if (/\b(thriller|horror|suspense|chilling|terrifying|creepy|haunting|sinister)\b/.test(text)) {
    return "scary";
  }
  if (/\b(adventure|action|quest|epic|journey|battle|warrior|dragon|sword|magical)\b/.test(text)) {
    return "adventurous";
  }
  if (/\b(romance|love story|heartbreak|emotional|moving|bittersweet|poignant|love triangle)\b/.test(text)) {
    return "emotional";
  }
  if (/\b(mystery|detective|whodunit|investigation|clue|crime|puzzle)\b/.test(text)) {
    return "curious";
  }
  
  return "thoughtful";
}

function derivePaceFromDescription(categories: string[] | undefined, description: string | undefined): string {
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  if (/\b(thriller|action|suspense|fast-paced|page-turner|gripping|relentless|breakneck|adrenaline|race against|can't put down|unputdownable|nonstop|pulse-pounding|edge of your seat)\b/.test(text)) {
    return "fast";
  }
  if (/\b(literary fiction|literary|philosophical|meditative|contemplative|sweeping saga|epic saga|lyrical|introspective|leisurely|beautifully written|slowly unfold|richly detailed)\b/.test(text)) {
    return "slow";
  }
  
  return "medium";
}

export function deriveTags(categories: string[] | undefined, description: string | undefined): string[] {
  const tags: string[] = [];
  const catStr = (categories || []).join(" ").toLowerCase();
  const descStr = (description || "").toLowerCase();
  const text = catStr + " " + descStr;
  
  const tagRules: Array<{ tag: string; pattern: RegExp; source?: "cat" | "desc" | "both" }> = [
    { tag: "romance", pattern: /\b(romance|romantic|love story|love interest|love triangle|falling in love|swept off|kiss|kisses|heartbreak|can't stop thinking about|marriage of convenience|fake dating|arranged marriage|cowboy.*love|duke.*love|billionaire.*love|his heart|her heart|forbidden love|unrequited love|second chance.*love|irresistible|passion|desire|seduction|swoon|swoony|divorcée|divorcee|couldn't resist)\b/ },
    { tag: "fantasy", pattern: /\b(fantasy|magical|sorcery|wizards?|witches|fae|faerie|elves|enchant)\b/ },
    { tag: "sci-fi", pattern: /\b(science fiction|sci-fi|space opera|cyberpunk|dystopia|futuristic|interstellar|alien)\b/ },
    { tag: "mystery", pattern: /\b(mystery|detective|whodunit|investigation|crime fiction|sleuth)\b/ },
    { tag: "thriller", pattern: /\b(thriller|suspense|psychological thriller|espionage|spy)\b/ },
    { tag: "horror", pattern: /\b(horror|terrifying|supernatural horror|haunted|gothic horror)\b/ },
    { tag: "young-adult", pattern: /\b(young adult|ya fiction|teen fiction|juvenile fiction)\b/ },
    { tag: "new-adult", pattern: /\b(new adult|na fiction|college romance)\b/ },
    { tag: "historical-fiction", pattern: /\b(historical fiction|historical novel|set in the \d{3,4}|period drama)\b/ },
    { tag: "literary-fiction", pattern: /\b(literary fiction|literary novel|contemporary literature|booker prize|pulitzer)\b/ },
    { tag: "funny", pattern: /\b(humor|humorous|comedy|comedic|funny|hilarious|satirical|witty)\b/ },
    { tag: "biography", pattern: /\b(biography|autobiography|biographical|life story|memoir)\b/ },
    { tag: "memoir", pattern: /\b(memoir|personal narrative|autobiographical)\b/ },
    { tag: "self-help", pattern: /\b(self-help|personal development|self improvement|motivational|productivity)\b/ },
    { tag: "contemporary", pattern: /\b(contemporary fiction|contemporary romance|modern-day|present-day)\b/ },
    { tag: "paranormal", pattern: /\b(paranormal|supernatural|ghost|vampir|werewol|shapeshifter|demon)\b/ },
    { tag: "dystopian", pattern: /\b(dystopian|dystopia|post-apocalyptic|apocalyptic)\b/ },
    { tag: "dark", pattern: /\b(dark fiction|dark fantasy|dark romance|grimdark|noir)\b/ },
    { tag: "cozy", pattern: /\b(cozy mystery|cozy fiction|cozy romance|cosy|feel-good|heartwarming)\b/ },
    { tag: "romantasy", pattern: /\b(romantasy|romantic fantasy|fantasy romance)\b/ },
    { tag: "urban-fantasy", pattern: /\b(urban fantasy|paranormal romance|supernatural romance)\b/ },
    { tag: "steampunk", pattern: /\b(steampunk|clockwork|victorian fantasy)\b/ },
    { tag: "lgbtq", pattern: /\b(lgbtq|lgbt|queer|sapphic|gay|lesbian|bisexual|nonbinary|transgender)\b/ },
    { tag: "non-fiction", pattern: /\b(nonfiction|non-fiction|true story|true crime|journalism)\b/ },
    { tag: "true-crime", pattern: /\b(true crime|true-crime|criminal investigation|murder case)\b/ },
    { tag: "psychology", pattern: /\b(psychology|psychological|cognitive|behavioral|neuroscience|mental health)\b/ },
    { tag: "philosophy", pattern: /\b(philosophy|philosophical|existential|stoicism|ethics)\b/ },
    { tag: "science", pattern: /\b(science|scientific|physics|biology|chemistry|evolution|astronomy)\b/, source: "cat" },
    { tag: "history", pattern: /\b(history|historical|ancient|medieval|world war|civil war|century)\b/, source: "cat" },
    { tag: "mythology", pattern: /\b(mythology|mythological|greek myth|norse myth|retelling)\b/ },
    { tag: "retelling", pattern: /\b(retelling|reimagining|reimagined|fairy tale retold|modern retelling)\b/ },
    { tag: "wholesome", pattern: /\b(wholesome|heartwarming|uplifting|feel-good|gentle|tender)\b/ },
    { tag: "dragons", pattern: /\b(dragon|dragons|dragonrider)\b/ },
    { tag: "space", pattern: /\b(space|interstellar|galaxy|starship|space opera|astronaut)\b/ },
    { tag: "magic", pattern: /\b(magic system|magical|sorcery|spellcasting|enchantment|wizard school|academy of magic)\b/ },
    { tag: "gothic", pattern: /\b(gothic|gothic fiction|gothic romance|gothic horror|brooding|victorian)\b/ },
    { tag: "western", pattern: /\b(western|wild west|cowboy|frontier)\b/ },
    { tag: "sports", pattern: /\b(sports romance|athlete|football|baseball|hockey|soccer|boxing)\b/ },
    { tag: "mafia", pattern: /\b(mafia|organized crime|cartel|mob boss|underworld)\b/ },
    { tag: "military", pattern: /\b(military|soldier|marine|navy|special forces|army)\b/ },
    { tag: "academia", pattern: /\b(academia|professor|university|campus|college|scholar)\b/ },
    { tag: "workplace", pattern: /\b(workplace|office|boss|corporate|ceo|billionaire boss)\b/ },
    { tag: "royal", pattern: /\b(royalty|prince|princess|king|queen|crown|throne|kingdom)\b/ },
  ];
  
  for (const rule of tagRules) {
    const searchText = rule.source === "cat" ? catStr : rule.source === "desc" ? descStr : text;
    if (rule.pattern.test(searchText) && !tags.includes(rule.tag)) {
      tags.push(rule.tag);
    }
  }
  
  return tags;
}

export function deriveMoodTags(categories: string[] | undefined, description: string | undefined): string[] {
  const moodTags: string[] = [];
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  const moodRules: Array<{ mood: string; pattern: RegExp }> = [
    { mood: "cozy", pattern: /\b(cozy|cosy|heartwarming|comfort read|feel-good|feel good|wholesome|gentle|snuggle|warm|charming|delightful|sweet|tender)\b/ },
    { mood: "dark", pattern: /\b(dark|gritty|sinister|macabre|disturbing|twisted|brutal|chilling|nightmarish|haunting|menacing|ominous|bleak|grim)\b/ },
    { mood: "fast-paced", pattern: /\b(action|thriller|fast-paced|fast paced|gripping|page-turner|page turner|unputdownable|relentless|breakneck|nonstop|pulse-pounding|adrenaline|can't stop reading|couldn't put it down|race against)\b/ },
    { mood: "emotional", pattern: /\b(emotional|heartbreak|heartbreaking|moving|touching|tearjerker|tear-jerker|bittersweet|poignant|devastating|gut-wrenching|raw emotion|deeply felt|crying|weep)\b/ },
    { mood: "funny", pattern: /\b(funny|humor|humorous|comedy|witty|hilarious|laugh|laughing|satirical|snarky|tongue-in-cheek|comedic|rom-com|romcom)\b/ },
    { mood: "romantic", pattern: /\b(romance|romantic|love story|love triangle|swoony|swoon|heart-pounding|chemistry|passion|desire|seduction|steamy|sizzling)\b/ },
    { mood: "suspenseful", pattern: /\b(suspense|suspenseful|tension|tense|mystery|twists|twist ending|plot twist|on the edge|shocking|jaw-dropping|unpredictable|cliffhanger|who can you trust)\b/ },
    { mood: "atmospheric", pattern: /\b(atmospheric|moody|evocative|immersive|lush|richly drawn|vivid|cinematic|beautifully written|lyrical|haunting beauty|ethereal)\b/ },
    { mood: "thought-provoking", pattern: /\b(philosophical|thought-provoking|thought provoking|literary|profound|challenging|introspective|contemplative|complex|nuanced|questions about|explores themes|makes you think)\b/ },
    { mood: "adventurous", pattern: /\b(adventure|adventurous|quest|journey|epic|explore|exploration|expedition|voyage|treasure|discover|dangerous mission|survival)\b/ },
    { mood: "heartwarming", pattern: /\b(heartwarming|uplifting|hopeful|inspiring|joyful|celebration|triumph|overcoming|resilience|hope|optimistic)\b/ },
    { mood: "spooky", pattern: /\b(spooky|creepy|eerie|ghostly|supernatural|paranormal|occult|séance|unexplained|things that go bump)\b/ },
  ];
  
  for (const rule of moodRules) {
    if (rule.pattern.test(text)) {
      moodTags.push(rule.mood);
    }
  }
  
  return moodTags;
}

export function deriveContentWarnings(categories: string[] | undefined, description: string | undefined): string[] {
  const warnings: string[] = [];
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  const warningRules: Array<{ warning: string; pattern: RegExp }> = [
    { warning: "violence", pattern: /\b(violence|violent|brutal|gore|gory|blood|bloodshed|murder|killing|slaughter|torture|fight to the death|graphic violence)\b/ },
    { warning: "death", pattern: /\b(death|dying|grief|mourning|funeral|dead body|corpse|killed|passes away|terminal)\b/ },
    { warning: "abuse", pattern: /\b(abuse|abusive|trauma|assault|domestic violence|child abuse|emotional abuse|physical abuse|sexual assault|molestation|exploitation|trafficking)\b/ },
    { warning: "war", pattern: /\b(war|warfare|battle|combat|military conflict|wartime|bombing|soldier|casualties|occupation|genocide)\b/ },
    { warning: "illness", pattern: /\b(illness|cancer|terminal illness|chronic illness|disease|hospitalized|diagnosis|chemotherapy|disability|chronic pain)\b/ },
    { warning: "infidelity", pattern: /\b(affair|cheating|infidelity|unfaithful|betrayal|adultery|other woman|other man)\b/ },
    { warning: "mental-health", pattern: /\b(depression|depressed|anxiety|mental illness|suicide|suicidal|self-harm|eating disorder|anorexia|bulimia|ptsd|panic attack|breakdown|addiction|alcoholism|drug abuse|overdose)\b/ },
    { warning: "sexual-content", pattern: /\b(explicit|explicit content|sexual content|graphic sex|erotica|erotic|sexually explicit|mature content|adult content)\b/ },
    { warning: "kidnapping", pattern: /\b(kidnap|kidnapping|abduction|abducted|captive|captivity|held hostage|hostage|imprisoned)\b/ },
    { warning: "racism", pattern: /\b(racism|racist|racial discrimination|prejudice|segregation|hate crime|bigotry|antisemitism|xenophobia)\b/ },
  ];
  
  for (const rule of warningRules) {
    if (rule.pattern.test(text)) {
      warnings.push(rule.warning);
    }
  }
  
  return warnings;
}

export function deriveRomanceLevel(categories: string[] | undefined, description: string | undefined, tags: string[]): "none" | "subplot" | "central" {
  const catStr = (categories || []).join(" ").toLowerCase();
  const descStr = (description || "").toLowerCase();
  const text = catStr + " " + descStr;
  
  if (categories?.some(c => c.toLowerCase().includes("romance"))) {
    return "central";
  }
  
  if (/\b(romance novel|romance fiction|romantic comedy|rom-com|romcom|enemies to lovers|friends to lovers|fake dating|second chance romance|forbidden love story|slow burn romance|steamy romance|spicy romance|swoon-worthy|swoony|romantic suspense|paranormal romance|contemporary romance|historical romance|dark romance|fantasy romance|romantasy)\b/.test(text)) {
    return "central";
  }
  
  const romanceSignals = [
    /\b(love story|falling in love|falls in love|fell in love)\b/,
    /\b(can't stop thinking about|can't get .{1,30} out of .{1,10} mind)\b/,
    /\b(heart of .{1,20}(man|woman|hero|heroine))\b/,
    /\b(passion|passionate|desire|sizzling|steamy|chemistry between)\b/,
    /\b(marriage of convenience|fake (relationship|dating|boyfriend|girlfriend|fiancé))\b/,
    /\b(love triangle|torn between .{1,20} and)\b/,
    /\b(irresistible|undeniable attraction|spark|sparks fly)\b/,
    /\b(happily ever after|HEA|happy ending)\b/,
    /\b(sexy|seductive|swoon|swoony|heart-pounding)\b/,
    /\b(cowboy|duke|lord|prince|billionaire|ceo).{0,30}(heart|love|romance|woman|her)\b/,
    /\b(her|his) (heart|love|desire|passion)\b/,
    /\b(we're still married|second chance|reunited|reunion)\b.*\b(love|heart|romance)\b/,
  ];
  
  let centralSignalCount = 0;
  for (const pattern of romanceSignals) {
    if (pattern.test(descStr)) centralSignalCount++;
  }
  
  if (centralSignalCount >= 2) return "central";
  
  if (tags.includes("romance") || tags.includes("romantasy") || tags.includes("urban-fantasy")) {
    if (centralSignalCount >= 1) return "central";
    return "subplot";
  }
  
  if (centralSignalCount >= 1) return "subplot";
  
  if (/\b(romantic subplot|love interest|budding romance|romantic tension|attraction|falling for|develops feelings|flirtation|kiss(es|ed)?|boyfriend|girlfriend|husband|wife|marry|married|wedding|relationship|dating)\b/.test(descStr)) {
    return "subplot";
  }
  
  return "none";
}

export function deriveSpiceLevel(categories: string[] | undefined, description: string | undefined, romanceLevel: string, tags: string[]): number {
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  if (/\b(erotica|erotic|sexually explicit|graphic sex|explicit sexual|smut|extremely steamy)\b/.test(text)) {
    return 5;
  }
  
  if (/\b(steamy|sizzling|scorching|burning desire|passionate nights?|between the sheets|explicit|sensual scenes?|heat level|spicy|red-hot|bedroom)\b/.test(text)) {
    return 4;
  }
  
  if (/\b(heated|passionate|desire|seduction|seductive|chemistry|tension-filled|intimate|intimacy|sparks fly|undeniable attraction|forbidden desire)\b/.test(text)) {
    if (romanceLevel === "central") return 3;
    return 2;
  }
  
  if (romanceLevel === "central") {
    if (tags.includes("new-adult") || tags.includes("dark") || tags.includes("mafia") || tags.includes("sports")) {
      return 3;
    }
    if (/\b(sweet romance|clean romance|wholesome romance|closed door|fade to black|clean and wholesome)\b/.test(text)) {
      return 1;
    }
    return 2;
  }
  
  if (romanceLevel === "subplot") return 1;
  
  return 1;
}

export function deriveDarknessLevel(categories: string[] | undefined, description: string | undefined, tone: string, contentWarnings: string[], tags: string[]): number {
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  let darkness = tone === "dark" ? 3 : tone === "light" ? 1 : 2;
  
  if (/\b(horror|disturbing|nightmare|gruesome|gore|grotesque|body horror|torture|serial killer|psychopath|sadistic)\b/.test(text)) {
    darkness = Math.max(darkness, 5);
  }
  
  if (/\b(dark fantasy|grimdark|dark romance|crime|murder|death|war|brutal|violent|trauma|abuse|noir|psychological thriller|captive|kidnap)\b/.test(text)) {
    darkness = Math.max(darkness, 4);
  }
  
  if (/\b(thriller|suspense|mystery|conflict|danger|sinister|morally grey|morally gray|complex villain|antihero|anti-hero|betrayal)\b/.test(text)) {
    darkness = Math.max(darkness, 3);
  }
  
  if (contentWarnings.length >= 3) {
    darkness = Math.max(darkness, 4);
  } else if (contentWarnings.length >= 2) {
    darkness = Math.max(darkness, 3);
  }
  
  if (tags.includes("cozy") || tags.includes("wholesome") || /\b(cozy|wholesome|feel-good|lighthearted|charming|sweet|gentle|comfort)\b/.test(text)) {
    darkness = Math.min(darkness, 1);
  }
  
  return Math.min(darkness, 5);
}

export function deriveTone(categories: string[] | undefined, description: string | undefined, moodTags: string[]): "light" | "medium" | "dark" {
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  if (moodTags.includes("dark")) return "dark";
  if (moodTags.includes("cozy") || moodTags.includes("funny") || moodTags.includes("heartwarming")) return "light";
  
  if (/\b(dark|gritty|horror|disturbing|violent|trauma|brutal|sinister|macabre|nightmare|terrifying|twisted|bleak|grimdark|noir|menacing)\b/.test(text)) {
    return "dark";
  }
  
  if (/\b(cozy|cosy|heartwarming|humor|humorous|comedy|comedic|lighthearted|feel-good|wholesome|charming|delightful|sweet|gentle|uplifting|joyful|fun)\b/.test(text)) {
    return "light";
  }
  
  return "medium";
}

export function deriveTropes(categories: string[] | undefined, description: string | undefined): string[] {
  const tropes: string[] = [];
  const text = ((categories || []).join(" ") + " " + (description || "")).toLowerCase();
  
  const tropeRules: Array<{ trope: string; pattern: RegExp }> = [
    { trope: "enemies-to-lovers", pattern: /\b(enemies to lovers|hate to love|rivals|nemesis|sworn enemies|loathe|despise each other|can't stand|mutual hatred)\b/ },
    { trope: "friends-to-lovers", pattern: /\b(friends to lovers|best friends|childhood friends?|lifelong friend|friendship turns|more than friends|always been there)\b/ },
    { trope: "found-family", pattern: /\b(found family|chosen family|unlikely allies|ragtag group|band of misfits|unlikely group|makeshift family|surrogate family)\b/ },
    { trope: "forced-proximity", pattern: /\b(forced proximity|stuck together|stranded|snowed in|one bed|sharing a room|trapped together|locked in|quarantine|cabin|snowstorm)\b/ },
    { trope: "second-chance", pattern: /\b(second chance|reunion|lost love|reconnect|ex-boyfriend|ex-girlfriend|first love returns|what could have been|unfinished business)\b/ },
    { trope: "forbidden-love", pattern: /\b(forbidden|star-crossed|taboo|shouldn't want|can't be together|wrong person|against the rules|off-limits|never supposed to)\b/ },
    { trope: "slow-burn", pattern: /\b(slow burn|slow-burn|slowly fall|gradually develop|takes time|building tension|simmering attraction|will they won't they)\b/ },
    { trope: "fake-dating", pattern: /\b(fake dating|fake relationship|pretend|marriage of convenience|arrangement|contract marriage|pretending to be|fake fiancé|fake boyfriend|fake girlfriend)\b/ },
    { trope: "grumpy-sunshine", pattern: /\b(grumpy|sunshine|opposites attract|brooding|cheerful|optimist|pessimist|light and dark|polar opposites|couldn't be more different)\b/ },
    { trope: "chosen-one", pattern: /\b(chosen one|prophecy|prophesied|destined|destiny|the one who|only she can|only he can|special power|unique ability|born to)\b/ },
    { trope: "redemption-arc", pattern: /\b(redemption|redeem|reformed|atone|atonement|make amends|seek forgiveness|turn over a new leaf|dark past)\b/ },
    { trope: "coming-of-age", pattern: /\b(coming of age|coming-of-age|growing up|bildungsroman|first time|navigate|identity|discovering who|self-discovery|rite of passage)\b/ },
    { trope: "heist", pattern: /\b(heist|theft|caper|steal|rob|con artist|grift|scheme|job|break into|vault|score)\b/ },
    { trope: "revenge", pattern: /\b(revenge|vengeance|retribution|avenge|payback|getting even|eye for an eye|score to settle)\b/ },
    { trope: "time-travel", pattern: /\b(time travel|time-travel|time loop|groundhog day|back in time|future self|past self|temporal|alternate timeline)\b/ },
    { trope: "small-town", pattern: /\b(small town|small-town|rural|countryside|village|close-knit community|everyone knows|quaint town)\b/ },
    { trope: "one-bed", pattern: /\b(one bed|only one bed|share a bed|single bed|sharing the bed|sleep together)\b/ },
    { trope: "morally-grey", pattern: /\b(morally grey|morally gray|anti-hero|antihero|dark hero|villain|villainous|morally ambiguous|questionable morals|dark side|ruthless)\b/ },
    { trope: "love-triangle", pattern: /\b(love triangle|torn between|choose between|two men|two women|complicated relationship|three-way|caught between)\b/ },
    { trope: "dual-timeline", pattern: /\b(dual timeline|two timelines|past and present|alternating|then and now|flashback|parallel stories|decades apart|years later)\b/ },
    { trope: "unreliable-narrator", pattern: /\b(unreliable narrator|can you trust|who is lying|truth and lies|nothing is as it seems|perception|what really happened|whose story)\b/ },
    { trope: "survival", pattern: /\b(survival|survive|stranded|wilderness|fight to survive|against all odds|endurance|last one standing)\b/ },
    { trope: "whodunnit", pattern: /\b(whodunit|whodunnit|who killed|suspect|murder mystery|detective|clue|investigation|body found|crime scene)\b/ },
    { trope: "age-gap", pattern: /\b(age gap|age difference|older man|older woman|younger|mentor|professor|student|boss|employee romance)\b/ },
    { trope: "workplace-romance", pattern: /\b(workplace|office romance|boss|coworker|colleague|work together|professional|ceo|corporate|business)\b/ },
    { trope: "secret-identity", pattern: /\b(secret identity|disguise|hidden identity|masquerade|double life|undercover|pretending to be someone|true identity)\b/ },
    { trope: "dark-romance", pattern: /\b(dark romance|dark love|possessive|obsessive|dangerous man|dangerous woman|captive romance|toxic love|twisted love)\b/ },
    { trope: "magical-realism", pattern: /\b(magical realism|magic in everyday|blurred line|fantastical elements|touches of magic|fairy tale|enchanted)\b/ },
    { trope: "amnesia", pattern: /\b(amnesia|lost memory|can't remember|forgotten past|memory loss|who am i|identity crisis)\b/ },
    { trope: "bodyguard", pattern: /\b(bodyguard|protector|protect her|protect him|sworn to protect|guardian|keeping.*safe)\b/ },
    { trope: "billionaire", pattern: /\b(billionaire|millionaire|wealthy|rich|affluent|tycoon|mogul|inheritance|fortune|estate)\b/ },
  ];
  
  for (const rule of tropeRules) {
    if (rule.pattern.test(text)) {
      tropes.push(rule.trope);
    }
  }
  
  return tropes;
}

function computeMetadataQuality(book: { title: string; authors: string[]; description: string | null; coverUrl: string | null; pageCount: number | null; categories: string[] | null }): number {
  let quality = 0;
  if (book.title) quality += 1;
  if (book.authors.length > 0) quality += 1;
  if (book.description && book.description.length > 50) quality += 2;
  if (book.description && book.description.length > 200) quality += 1;
  if (book.coverUrl) quality += 2;
  if (book.pageCount && book.pageCount > 50) quality += 1;
  if (book.categories && book.categories.length > 0) quality += 1;
  return quality;
}

// Simple delay helper for rate limiting
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function searchGoogleBooks(query: string, maxResults: number = 40): Promise<InsertCatalogBook[]> {
  try {
    // Check cache first
    const cacheKey = `${query}_${maxResults}`;
    const cached = getCachedSearch(cacheKey);
    if (cached) {
      console.log(`Cache hit for query: ${query}`);
      return cached.slice(0, maxResults);
    }
    
    const url = new URL(GOOGLE_BOOKS_API);
    url.searchParams.set("q", query);
    url.searchParams.set("maxResults", String(Math.min(maxResults, 40)));
    url.searchParams.set("printType", "books");
    url.searchParams.set("langRestrict", "en");
    
    // Add API key if available for higher quota
    // Supports both GOOGLE_API_KEY and GOOGLE_BOOKS_API_KEY
    const apiKey = process.env.GOOGLE_API_KEY || process.env.GOOGLE_BOOKS_API_KEY;
    if (apiKey && apiKey.trim().length > 10) {
      url.searchParams.set("key", apiKey.trim());
      console.log("Using Google Books API with authentication key");
    } else {
      console.log("Using Google Books API without authentication (limited quota)");
    }
    
    // Retry logic for rate limiting
    let response: Response | null = null;
    let retries = 0;
    const maxRetries = 3;
    
    while (retries < maxRetries) {
      response = await fetch(url.toString());
      
      if (response.status === 429) {
        // Rate limited - wait and retry with exponential backoff
        const waitTime = Math.pow(2, retries) * 1000; // 1s, 2s, 4s
        console.log(`Rate limited by Google Books API, waiting ${waitTime}ms before retry...`);
        await delay(waitTime);
        retries++;
        continue;
      }
      
      break;
    }
    
    if (!response || !response.ok) {
      const errorText = response ? await response.text() : 'no response';
      console.error(`Google Books API error: ${response?.status || 'no response'}, body: ${errorText}`);
      return [];
    }
    
    const data: GoogleBooksResponse = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    const books: InsertCatalogBook[] = [];
    
    for (const item of data.items) {
      const info = item.volumeInfo;
      
      // MINIMAL filter: only require title (authors preferred but not required)
      if (!info.title) {
        continue;
      }
      
      // Filter out academic textbooks, manuals, and study guides
      const titleLower = info.title.toLowerCase();
      const isTextbook = /\b(textbook|coursebook|handbook|manual|study guide|exam prep|workbook|lab manual|instructor|edition.*student|student edition)\b/i.test(info.title);
      const publisher = (info as any).publisher as string | undefined;
      const isAcademicPublisher = publisher && /\b(mcgraw|pearson|cengage|wiley|elsevier|springer|cambridge university press|oxford university press|routledge)\b/i.test(publisher);
      const looksAcademic = isTextbook || (isAcademicPublisher && (titleLower.includes("introduction to") || titleLower.includes("fundamentals of") || titleLower.includes("principles of")));
      if (looksAcademic) {
        continue;
      }
      
      // Extract ISBNs
      let isbn10: string | undefined;
      let isbn13: string | undefined;
      
      if (info.industryIdentifiers) {
        for (const id of info.industryIdentifiers) {
          if (id.type === "ISBN_10") isbn10 = id.identifier;
          if (id.type === "ISBN_13") isbn13 = id.identifier;
        }
      }
      
      // Get best cover URL (prefer larger images)
      let coverUrl: string | undefined;
      if (info.imageLinks) {
        coverUrl = info.imageLinks.large || 
                   info.imageLinks.medium || 
                   info.imageLinks.small || 
                   info.imageLinks.thumbnail ||
                   info.imageLinks.smallThumbnail;
        
        // Convert HTTP to HTTPS, remove curl effect, and request higher quality
        if (coverUrl) {
          coverUrl = coverUrl.replace("http://", "https://");
          coverUrl = coverUrl.replace("&edge=curl", "");
          coverUrl = coverUrl.replace("zoom=1", "zoom=2");
          if (!coverUrl.includes("zoom=")) {
            coverUrl += "&zoom=2";
          }
        }
      }

      // Fallback: try Open Library covers if no Google cover found
      if (!coverUrl && (isbn13 || isbn10)) {
        const isbnForCover = isbn13 || isbn10;
        coverUrl = `https://covers.openlibrary.org/b/isbn/${isbnForCover}-L.jpg?default=false`;
      }
      
      const tags = deriveTags(info.categories, info.description);
      const moodTags = deriveMoodTags(info.categories, info.description);
      const romanceLevel = deriveRomanceLevel(info.categories, info.description, tags);
      const tone = deriveTone(info.categories, info.description, moodTags);
      const contentWarnings = deriveContentWarnings(info.categories, info.description);
      const spiceLevel = deriveSpiceLevel(info.categories, info.description, romanceLevel, tags);
      const darknessLevel = deriveDarknessLevel(info.categories, info.description, tone, contentWarnings, tags);
      
      const book: InsertCatalogBook = {
        title: info.title,
        authors: info.authors || [],
        description: info.description || null,
        isbn10: isbn10 || null,
        isbn13: isbn13 || null,
        categories: info.categories || null,
        pageCount: info.pageCount || null,
        publishedDate: info.publishedDate || null,
        coverUrl: coverUrl || null,
        source: "google_books",
        sourceId: item.id,
        mood: deriveMoodFromCategories(info.categories, info.description),
        pace: derivePaceFromDescription(info.categories, info.description),
        length: deriveLength(info.pageCount),
        spiceLevel,
        darknessLevel,
        tropes: deriveTropes(info.categories, info.description),
        tags,
        moodTags,
        contentWarnings,
        romanceLevel,
        tone,
        hasEbook: item.saleInfo?.isEbook === true || item.accessInfo?.epub?.isAvailable === true || item.accessInfo?.pdf?.isAvailable === true,
        hasAudiobook: false,
        kindleUnlimited: false,
        libbyAvailable: false,
      };
      
      const quality = computeMetadataQuality(book);
      if (quality < 3) {
        continue;
      }
      
      books.push(book);
    }
    
    // Cache successful results
    if (books.length > 0) {
      setCachedSearch(cacheKey, books);
    }
    
    return books;
  } catch (error) {
    console.error("Error fetching from Google Books:", error);
    return [];
  }
}

export async function bulkImportBooks(
  queries: string[],
  storage: {
    getCatalogBookByIsbn13: (isbn: string) => Promise<any>;
    getCatalogBookByTitleAuthor: (title: string, author: string) => Promise<any>;
    createCatalogBook: (book: InsertCatalogBook) => Promise<any>;
    getCatalogBookCount: () => Promise<number>;
  }
): Promise<{ added: number; skipped: number; errors: string[] }> {
  let added = 0;
  let skipped = 0;
  const errors: string[] = [];
  
  for (const query of queries) {
    try {
      // Add delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const books = await searchGoogleBooks(query, 40);
      
      for (const book of books) {
        try {
          // Check for duplicates
          if (book.isbn13) {
            const existing = await storage.getCatalogBookByIsbn13(book.isbn13);
            if (existing) {
              skipped++;
              continue;
            }
          }
          
          // Fallback: check by title + first author
          const existingByTitle = await storage.getCatalogBookByTitleAuthor(
            book.title,
            book.authors[0]
          );
          if (existingByTitle) {
            skipped++;
            continue;
          }
          
          await storage.createCatalogBook(book);
          added++;
        } catch (err) {
          errors.push(`Error adding "${book.title}": ${err}`);
        }
      }
    } catch (err) {
      errors.push(`Query "${query}" failed: ${err}`);
    }
  }
  
  return { added, skipped, errors };
}
