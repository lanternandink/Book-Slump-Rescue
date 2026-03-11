import { users, type User, type UpsertUser } from "@shared/models/auth";
import { db } from "../../db";
import { eq } from "drizzle-orm";

// Interface for auth storage operations
// (IMPORTANT) These user operations are mandatory for Replit Auth.
export interface IAuthStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateDisplayName(id: string, displayName: string): Promise<User>;
}

class AuthStorage implements IAuthStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            ...userData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (err: any) {
      if (err.code === '23505' && err.constraint === 'users_email_unique') {
        const { email, ...rest } = userData;
        const [user] = await db
          .insert(users)
          .values({ ...rest, email: null })
          .onConflictDoUpdate({
            target: users.id,
            set: {
              ...rest,
              email: null,
              updatedAt: new Date(),
            },
          })
          .returning();
        return user;
      }
      throw err;
    }
  }

  async updateDisplayName(id: string, displayName: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ displayName, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return user;
  }
}

export const authStorage = new AuthStorage();
