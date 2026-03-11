import { storage } from "./storage";

const SEED_DISCUSSIONS = [
  {
    title: "What book pulled you out of a reading slump?",
    content: "We all hit those moments where nothing seems appealing. What was the book that finally broke through and got you reading again? We'd love to hear your stories and maybe add some of these to our recommendation engine!",
    category: "recommendations",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: true,
  },
  {
    title: "Best comfort reads for tough days",
    content: "Sometimes you just need a book that feels like a warm blanket. What are your go-to comfort reads? Could be cozy mysteries, feel-good romance, gentle fantasy - anything that makes everything feel a little better.",
    category: "favorites",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: true,
  },
  {
    title: "Tips for getting back into reading",
    content: "If you're struggling to pick up a book, here are some things that have worked for our team:\n\n- Start with something short (under 250 pages)\n- Try audiobooks or graphic novels as a bridge\n- Re-read an old favorite\n- Set a tiny daily goal (even 5 pages counts!)\n- Remove the pressure of \"finishing\" - it's okay to set books aside\n\nWhat strategies have worked for you?",
    category: "reading-tips",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: true,
  },
  {
    title: "Hidden gems you discovered this year",
    content: "Tell us about a book you loved that doesn't get enough attention. Those under-the-radar picks that surprised you and deserve more readers. Bonus points if it's from a debut author!",
    category: "recommendations",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: false,
  },
  {
    title: "What genre do you reach for when stuck?",
    content: "When you're in a reading rut, do you stick with your usual genre or branch out to something completely different? Curious to hear what works for different readers - do you go back to comfort or try something new?",
    category: "general",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: false,
  },
  {
    title: "Book recommendations for someone who hasn't read in months?",
    content: "Asking for the community's help here - if someone hasn't picked up a book in 3+ months, what would you recommend as a re-entry point? Looking for page-turners that are easy to get into but still satisfying.",
    category: "help",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
    isPinned: false,
  },
];

const SEED_COMMENTS = [
  {
    discussionIndex: 0,
    content: "\"Project Hail Mary\" by Andy Weir absolutely broke my 6-month slump. It's impossible to put down once you start. The audiobook is also incredible if you prefer listening!",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
  },
  {
    discussionIndex: 1,
    content: "For us it's always \"The House in the Cerulean Sea\" by TJ Klune. It's like a literary hug. Also love recommending \"Legends & Lattes\" by Travis Baldree for cozy fantasy vibes.",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
  },
  {
    discussionIndex: 2,
    content: "One thing we always suggest: change your reading format. If physical books aren't working, try an ebook or audiobook. Sometimes a different medium is all you need to reignite the habit.",
    authorName: "Book Slump Rescue Team",
    authorRole: "staff",
  },
];

export async function seedDiscussions() {
  try {
    const existing = await storage.getDiscussions();
    if (existing.length > 0) {
      return;
    }

    console.log("Seeding community discussions...");

    const createdDiscussions = [];
    for (const disc of SEED_DISCUSSIONS) {
      const created = await storage.createDiscussion(disc);
      createdDiscussions.push(created);
    }

    for (const comment of SEED_COMMENTS) {
      const discussion = createdDiscussions[comment.discussionIndex];
      if (discussion) {
        await storage.createDiscussionComment({
          discussionId: discussion.id,
          content: comment.content,
          authorName: comment.authorName,
          authorRole: comment.authorRole,
        });
      }
    }

    console.log(`Seeded ${SEED_DISCUSSIONS.length} discussions and ${SEED_COMMENTS.length} starter comments`);
  } catch (err) {
    console.error("Failed to seed discussions:", err);
  }
}
