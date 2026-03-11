/**
 * QUERY BUILDER - Converts quiz answers into Google Books API search queries
 * 
 * DESIGN PHILOSOPHY:
 * - Multiple answers BROADEN results (OR logic), not narrow them
 * - Each genre/category generates its own query for maximum variety
 * - Mood and setting keywords are added as soft hints, not strict filters
 * - API pre-filters by subject, so we trust its results
 */

import type { QuizAnswers } from "@shared/schema";

// Maps quiz genre selections to Google Books subject: filters
// Each genre maps to multiple related subjects for broader matching
const GENRE_TO_SUBJECT: Record<string, string[]> = {
  "romance": ["Romance", "Love Stories", "Romantic Fiction"],
  "fantasy": ["Fantasy", "Epic Fantasy", "Urban Fantasy", "Magic"],
  "thriller": ["Thriller", "Suspense", "Action"],
  "mystery": ["Mystery", "Detective", "Crime Fiction"],
  "sci-fi": ["Science Fiction", "Sci-Fi", "Futuristic"],
  "horror": ["Horror", "Supernatural", "Gothic"],
  "young-adult": ["Young Adult", "Teen", "Coming of Age"],
  "literary-fiction": ["Literary Fiction", "Fiction", "Literary"],
  "historical-fiction": ["Historical Fiction", "History", "Historical"],
  "contemporary": ["Contemporary Fiction", "Modern Fiction", "Contemporary"],
  "nonfiction": ["Nonfiction"],
  "biography": ["Biography", "Memoir", "Autobiography"],
  "self-help": ["Self-Help", "Personal Development"],
};

// EXPANDED nonfiction categories for rich discovery
// Covers all major nonfiction topics users might explore
const NONFICTION_SUBJECTS: Record<string, string[]> = {
  "memoir": ["Memoir", "Autobiography", "Personal Narrative"],
  "biography": ["Biography", "Biographical", "Life Story"],
  "self-help": ["Self-Help", "Personal Development", "Self Improvement", "Motivation"],
  "history": ["History", "Historical", "World History", "American History"],
  "science": ["Popular Science", "Science", "Physics", "Biology", "Chemistry"],
  "psychology": ["Psychology", "Popular Psychology", "Behavioral Science", "Mental Health"],
  "health": ["Health", "Wellness", "Fitness", "Nutrition", "Medicine"],
  "business": ["Business", "Leadership", "Entrepreneurship", "Management", "Finance"],
  "true-crime": ["True Crime", "Crime", "Criminal Justice", "Murder"],
  "philosophy": ["Philosophy", "Ethics", "Metaphysics", "Existentialism"],
  "travel": ["Travel", "Adventure Travel", "Travel Writing", "Travelogue"],
  "nature": ["Nature", "Environment", "Natural History", "Wildlife", "Ecology"],
  "spirituality": ["Spirituality", "Religion", "Mindfulness", "Meditation"],
  "politics": ["Politics", "Political Science", "Government", "Current Events"],
  "economics": ["Economics", "Economy", "Financial", "Macroeconomics"],
  "sociology": ["Sociology", "Social Science", "Culture", "Society"],
  "art": ["Art", "Art History", "Fine Arts", "Photography"],
  "music": ["Music", "Music History", "Musicians", "Composers"],
  "food": ["Food", "Cooking", "Culinary", "Gastronomy", "Recipes"],
  "sports": ["Sports", "Athletics", "Sports Biography", "Fitness"],
  "technology": ["Technology", "Computers", "Digital", "Innovation"],
  "education": ["Education", "Teaching", "Learning", "Pedagogy"],
};

const MOOD_KEYWORDS: Record<string, string[]> = {
  "happy": ["uplifting", "feel-good", "heartwarming", "joyful", "light"],
  "emotional": ["moving", "emotional", "poignant", "tearjerker"],
  "adventurous": ["adventure", "action", "exciting", "thrilling"],
  "scary": ["dark", "creepy", "suspenseful", "chilling"],
  "thoughtful": ["literary", "philosophical", "profound", "introspective"],
};

const READING_GOAL_KEYWORDS: Record<string, string[]> = {
  "escape": ["immersive", "fantasy", "adventure"],
  "learn": ["educational", "informative", "enlightening"],
  "cry": ["emotional", "moving", "heartbreaking"],
  "laugh": ["funny", "humor", "comedy", "witty"],
  "think": ["thought-provoking", "philosophical", "literary"],
};

const SETTING_KEYWORDS: Record<string, string[]> = {
  "contemporary": ["contemporary", "modern"],
  "historical": ["historical", "period"],
  "fantasy-world": ["fantasy world", "magical realm"],
  "space": ["space", "sci-fi", "futuristic"],
  "small-town": ["small town", "rural"],
};

export interface GeneratedQuery {
  query: string;
  subject?: string;
  keywords: string[];
  isFiction: boolean;
}

/**
 * buildSearchQueries - Main function to generate Google Books API queries
 * 
 * HOW IT WORKS:
 * 1. Each selected genre generates its OWN query (broadens results)
 * 2. Each nonfiction category generates its OWN query
 * 3. Mood/setting keywords are added as hints, not strict filters
 * 4. Returns array of queries - caller runs ALL of them for variety
 * 
 * EXAMPLE: User selects Fantasy + Mystery + mood:adventurous
 * Result: 2 queries - "subject:Fantasy adventure" and "subject:Mystery exciting"
 */
export function buildSearchQueries(answers: QuizAnswers): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const isFiction = answers.fictionType !== "nonfiction";
  const isNonfiction = answers.fictionType === "nonfiction" || answers.fictionType === "both";
  const isChildrens = answers.ageGroup === "children";
  const isMiddleGrade = answers.ageGroup === "middle-grade";
  
  const selectedGenres = answers.genres || [];
  const nonfictionCategories = answers.nonfictionCategory || [];
  
  if (isChildrens || isMiddleGrade) {
    return buildChildrensQueries(answers, isChildrens);
  }
  
  // NONFICTION: Generate query for EACH selected category (more = broader)
  if (nonfictionCategories.length > 0) {
    for (const category of nonfictionCategories) {
      queries.push(buildNonfictionQuery(answers, category));
    }
  }
  
  // DEFAULT QUERIES when no specific selections made
  if (selectedGenres.length === 0 && nonfictionCategories.length === 0) {
    if (isNonfiction) {
      queries.push(buildNonfictionQuery(answers, "memoir"));
      queries.push(buildNonfictionQuery(answers, "self-help"));
      queries.push(buildNonfictionQuery(answers, "psychology"));
      queries.push(buildNonfictionQuery(answers, "biography"));
    }
    if (isFiction) {
      queries.push(buildFictionQuery(answers, "literary-fiction"));
      queries.push(buildFictionQuery(answers, "contemporary"));
      queries.push(buildFictionQuery(answers, "fantasy"));
    }
    return queries;
  }
  
  // FICTION GENRES: Generate query for EACH selected genre
  for (const genre of selectedGenres) {
    const isNonfictionGenre = ["nonfiction", "biography", "self-help"].includes(genre);
    
    if (isNonfictionGenre) {
      if (nonfictionCategories.length === 0) {
        queries.push(buildNonfictionQuery(answers, genre));
        if (genre === "nonfiction") {
          queries.push(buildNonfictionQuery(answers, "memoir"));
          queries.push(buildNonfictionQuery(answers, "history"));
        }
      }
    } else {
      queries.push(buildFictionQuery(answers, genre));
    }
  }
  
  // CROSS-GENRE QUERIES: Generate combined queries for common genre combos
  const genreSet = new Set(selectedGenres);
  if (genreSet.has("romance") && genreSet.has("fantasy")) {
    queries.push({
      query: "subject:\"Fantasy Romance\" romantasy",
      subject: "Fantasy Romance",
      keywords: ["romantasy"],
      isFiction: true,
    });
  }
  if (genreSet.has("romance") && genreSet.has("thriller")) {
    queries.push({
      query: "subject:\"Romantic Suspense\"",
      subject: "Romantic Suspense",
      keywords: [],
      isFiction: true,
    });
  }
  if (genreSet.has("mystery") && genreSet.has("romance")) {
    queries.push({
      query: "cozy mystery romance",
      subject: "Cozy Mystery",
      keywords: ["romance"],
      isFiction: true,
    });
  }
  
  // TROPE-SPECIFIC QUERIES: Add targeted search for popular tropes
  if (answers.tropes && answers.tropes.length > 0) {
    const tropeQuery = answers.tropes.slice(0, 3).map(t => `"${t.replace(/-/g, " ")}"`).join(" ");
    const genre = selectedGenres[0] || "fiction";
    const subject = GENRE_TO_SUBJECT[genre]?.[0] || "Fiction";
    queries.push({
      query: `subject:${subject} ${tropeQuery}`,
      subject,
      keywords: answers.tropes.slice(0, 3),
      isFiction: true,
    });
  }
  
  return queries;
}

const CHILDRENS_GENRE_SUBJECTS: Record<string, string> = {
  "fantasy": "Juvenile Fiction / Fantasy & Magic",
  "mystery": "Juvenile Fiction / Mysteries & Detective Stories",
  "sci-fi": "Juvenile Fiction / Science Fiction",
  "horror": "Juvenile Fiction / Horror",
  "historical-fiction": "Juvenile Fiction / Historical",
  "contemporary": "Juvenile Fiction / Social Themes",
  "literary-fiction": "Juvenile Fiction",
  "thriller": "Juvenile Fiction / Action & Adventure",
};

const MIDDLE_GRADE_GENRE_SUBJECTS: Record<string, string> = {
  "fantasy": "Juvenile Fiction / Fantasy & Magic",
  "mystery": "Juvenile Fiction / Mysteries & Detective Stories",
  "sci-fi": "Juvenile Fiction / Science Fiction",
  "horror": "Juvenile Fiction / Horror",
  "historical-fiction": "Juvenile Fiction / Historical",
  "contemporary": "Juvenile Fiction / Social Themes",
  "literary-fiction": "Juvenile Fiction",
  "thriller": "Juvenile Fiction / Action & Adventure",
};

function buildChildrensQueries(answers: QuizAnswers, isChildrens: boolean): GeneratedQuery[] {
  const queries: GeneratedQuery[] = [];
  const selectedGenres = answers.genres || [];
  const subjectPrefix = "Juvenile Fiction";
  const ageLabel = isChildrens ? "children's" : "middle grade";
  
  const moodKeywords: string[] = [];
  addMoodKeywords(answers, moodKeywords, 1);
  
  if (selectedGenres.length === 0) {
    queries.push({
      query: `subject:"${subjectPrefix}" ${ageLabel} books ${moodKeywords.join(" ")}`.trim(),
      subject: subjectPrefix,
      keywords: [ageLabel, ...moodKeywords],
      isFiction: true,
    });
    queries.push({
      query: `subject:"Juvenile Fiction / Fantasy & Magic" ${ageLabel}`,
      subject: "Juvenile Fiction / Fantasy & Magic",
      keywords: [ageLabel],
      isFiction: true,
    });
    queries.push({
      query: `subject:"Juvenile Fiction / Action & Adventure" ${ageLabel}`,
      subject: "Juvenile Fiction / Action & Adventure",
      keywords: [ageLabel],
      isFiction: true,
    });
    if (!isChildrens) {
      queries.push({
        query: `subject:"Juvenile Fiction" middle grade`,
        subject: subjectPrefix,
        keywords: ["middle grade"],
        isFiction: true,
      });
    }
    return queries;
  }
  
  const genreMap = isChildrens ? CHILDRENS_GENRE_SUBJECTS : MIDDLE_GRADE_GENRE_SUBJECTS;
  
  for (const genre of selectedGenres) {
    const subject = genreMap[genre] || subjectPrefix;
    queries.push({
      query: `subject:"${subject}" ${ageLabel} ${moodKeywords.join(" ")}`.trim(),
      subject,
      keywords: [ageLabel, ...moodKeywords],
      isFiction: true,
    });
  }
  
  if (queries.length < 2) {
    queries.push({
      query: `subject:"${subjectPrefix}" ${ageLabel} books`,
      subject: subjectPrefix,
      keywords: [ageLabel],
      isFiction: true,
    });
  }
  
  return queries;
}

const AGE_GROUP_KEYWORDS: Record<string, string[]> = {
  "children": ["juvenile fiction", "children's"],
  "middle-grade": ["juvenile fiction", "middle grade"],
  "young-adult": ["young adult fiction", "YA"],
  "new-adult": ["new adult", "fiction"],
  "adult": [],
};

function addMoodKeywords(answers: QuizAnswers, keywords: string[], maxKeywords: number = 2) {
  if (answers.mood && answers.mood.length > 0) {
    for (const m of answers.mood.slice(0, 2)) {
      if (MOOD_KEYWORDS[m]) {
        keywords.push(...MOOD_KEYWORDS[m].slice(0, maxKeywords));
      }
    }
  }
}

function addReadingGoalKeywords(answers: QuizAnswers, keywords: string[]) {
  if (answers.readingGoal && answers.readingGoal.length > 0) {
    for (const goal of answers.readingGoal.slice(0, 2)) {
      if (READING_GOAL_KEYWORDS[goal]) {
        keywords.push(READING_GOAL_KEYWORDS[goal][0]);
      }
    }
  }
}

function addAgeGroupFilter(answers: QuizAnswers, parts: string[], keywords: string[]) {
  if (answers.ageGroup && AGE_GROUP_KEYWORDS[answers.ageGroup]) {
    const ageKeywords = AGE_GROUP_KEYWORDS[answers.ageGroup];
    if (ageKeywords.length > 0) {
      keywords.push(ageKeywords[0]);
    }
  }
}

function buildFictionQuery(answers: QuizAnswers, genre: string): GeneratedQuery {
  const keywords: string[] = [];
  const parts: string[] = [];
  
  const subjects = GENRE_TO_SUBJECT[genre] || [genre];
  const primarySubject = subjects[0];
  
  parts.push(`subject:${primarySubject}`);
  
  addAgeGroupFilter(answers, parts, keywords);
  addMoodKeywords(answers, keywords);
  addReadingGoalKeywords(answers, keywords);
  
  if (answers.settings && answers.settings.length > 0) {
    const firstSetting = answers.settings[0];
    if (SETTING_KEYWORDS[firstSetting]) {
      keywords.push(SETTING_KEYWORDS[firstSetting][0]);
    }
  }
  
  if (answers.tropes && answers.tropes.length > 0) {
    const tropeKeywords = answers.tropes.slice(0, 2).map(t => t.replace(/-/g, " "));
    keywords.push(...tropeKeywords);
  }
  
  if (answers.romanceTropes && answers.romanceTropes.length > 0 && genre === "romance") {
    const romanceTropeKeywords = answers.romanceTropes.slice(0, 2).map(t => t.replace(/-/g, " "));
    keywords.push(...romanceTropeKeywords);
  }
  
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 3);
  
  if (uniqueKeywords.length > 0) {
    parts.push(uniqueKeywords.join(" "));
  }
  
  return {
    query: parts.join(" "),
    subject: primarySubject,
    keywords: uniqueKeywords,
    isFiction: true,
  };
}

function buildNonfictionQuery(answers: QuizAnswers, category: string): GeneratedQuery {
  const keywords: string[] = [];
  const parts: string[] = [];
  
  let subjects: string[];
  if (category === "nonfiction") {
    subjects = NONFICTION_SUBJECTS["memoir"];
  } else if (NONFICTION_SUBJECTS[category]) {
    subjects = NONFICTION_SUBJECTS[category];
  } else {
    subjects = GENRE_TO_SUBJECT[category] || ["Nonfiction"];
  }
  
  const primarySubject = subjects[0];
  parts.push(`subject:${primarySubject}`);
  
  addAgeGroupFilter(answers, parts, keywords);
  addMoodKeywords(answers, keywords, 1);
  addReadingGoalKeywords(answers, keywords);
  
  const uniqueKeywords = Array.from(new Set(keywords)).slice(0, 2);
  
  if (uniqueKeywords.length > 0) {
    parts.push(uniqueKeywords.join(" "));
  }
  
  return {
    query: parts.join(" "),
    subject: primarySubject,
    keywords: uniqueKeywords,
    isFiction: false,
  };
}

export function buildSimilarBookQuery(title: string, author?: string): string {
  const parts: string[] = [];
  
  if (author) {
    parts.push(`inauthor:${author}`);
  }
  
  const titleWords = title.split(" ").filter(w => w.length > 3).slice(0, 3);
  if (titleWords.length > 0) {
    parts.push(titleWords.join(" "));
  }
  
  return parts.join(" ") || title;
}

export const NONFICTION_CATEGORIES = Object.keys(NONFICTION_SUBJECTS).map(key => ({
  value: key,
  label: key.split("-").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
}));
