import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const OWNER_USER_ID = "53888547";

export function isOwner(userId: string): boolean {
  if (userId === OWNER_USER_ID) return true;
  const replOwner = process.env.REPL_OWNER;
  if (!replOwner) return false;
  return userId === replOwner;
}

export function registerAuthRoutes(app: Express): void {
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await authStorage.getUser(userId);
      res.json({ ...user, isOwner: isOwner(userId) });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.patch("/api/auth/user/display-name", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { displayName } = req.body;
      if (!displayName || typeof displayName !== "string" || displayName.trim().length === 0) {
        return res.status(400).json({ message: "Display name is required" });
      }
      const user = await authStorage.updateDisplayName(userId, displayName.trim());
      res.json(user);
    } catch (error) {
      console.error("Error updating display name:", error);
      res.status(500).json({ message: "Failed to update display name" });
    }
  });
}
