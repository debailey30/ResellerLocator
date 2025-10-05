import { type Item, type InsertItem, type UpdateItem, type MarkSoldData, type Bin, type InsertBin, type UpdateBin, items, bins } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, ilike, or, desc, asc } from "drizzle-orm";

export interface IStorage {
  // Item operations
  getAllItems(): Promise<Item[]>;
  getItemById(id: string): Promise<Item | undefined>;
  createItem(item: InsertItem): Promise<Item>;
  updateItem(id: string, updates: UpdateItem): Promise<Item | undefined>;
  deleteItem(id: string): Promise<boolean>;
  searchItems(query: string): Promise<Item[]>;
  getItemsByBin(binLocation: string): Promise<Item[]>;
  markAsSold(id: string, soldData: MarkSoldData): Promise<Item | undefined>;
  
  // Bin operations
  getAllBins(): Promise<Bin[]>;
  getBinById(id: string): Promise<Bin | undefined>;
  createBin(bin: InsertBin): Promise<Bin>;
  updateBin(id: string, updates: UpdateBin): Promise<Bin | undefined>;
  deleteBin(id: string): Promise<boolean>;
  getBinByName(name: string): Promise<Bin | undefined>;
  getBinStats(): Promise<Array<{ binLocation: string; itemCount: number; lastUpdated: Date }>>;
  
  // Bulk operations
  createMultipleItems(items: InsertItem[]): Promise<Item[]>;
  createMultipleBins(bins: InsertBin[]): Promise<Bin[]>;
}


export class DatabaseStorage implements IStorage {
  async getAllItems(): Promise<Item[]> {
    return await db.select().from(items).orderBy(desc(items.createdAt));
  }

  async getItemById(id: string): Promise<Item | undefined> {
    const [item] = await db.select().from(items).where(eq(items.id, id));
    return item || undefined;
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const [item] = await db.insert(items).values(insertItem).returning();
    return item;
  }

  async updateItem(id: string, updates: UpdateItem): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(items.id, id))
      .returning();
    return item || undefined;
  }

  async deleteItem(id: string): Promise<boolean> {
    const result = await db.delete(items).where(eq(items.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async markAsSold(id: string, soldData: MarkSoldData): Promise<Item | undefined> {
    const [item] = await db
      .update(items)
      .set({
        status: "sold",
        soldDate: soldData.soldDate ? new Date(soldData.soldDate) : new Date(),
        soldPrice: soldData.soldPrice || null,
        updatedAt: new Date()
      })
      .where(eq(items.id, id))
      .returning();
    return item || undefined;
  }

  async searchItems(query: string): Promise<Item[]> {
    if (!query.trim()) {
      return this.getAllItems();
    }

    const searchTerm = `%${query.toLowerCase()}%`;
    return await db
      .select()
      .from(items)
      .where(
        or(
          ilike(items.description, searchTerm),
          ilike(items.brand, searchTerm),
          ilike(items.size, searchTerm),
          ilike(items.color, searchTerm),
          ilike(items.category, searchTerm),
          ilike(items.condition, searchTerm),
          ilike(items.notes, searchTerm),
          ilike(items.binLocation, searchTerm)
        )
      )
      .orderBy(desc(items.createdAt));
  }

  async getItemsByBin(binLocation: string): Promise<Item[]> {
    return await db
      .select()
      .from(items)
      .where(ilike(items.binLocation, binLocation))
      .orderBy(desc(items.createdAt));
  }

  async getAllBins(): Promise<Bin[]> {
    const allBins = await db.select().from(bins);
    // Sort bins numerically (Bin-0, Bin-1, Bin-2, ..., Bin-30)
    return allBins.sort((a, b) => {
      const numA = parseInt(a.name.replace('Bin-', '')) || 0;
      const numB = parseInt(b.name.replace('Bin-', '')) || 0;
      return numA - numB;
    });
  }

  async getBinById(id: string): Promise<Bin | undefined> {
    const [bin] = await db.select().from(bins).where(eq(bins.id, id));
    return bin || undefined;
  }

  async createBin(insertBin: InsertBin): Promise<Bin> {
    const [bin] = await db.insert(bins).values(insertBin).returning();
    return bin;
  }

  async updateBin(id: string, updates: UpdateBin): Promise<Bin | undefined> {
    const [bin] = await db
      .update(bins)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(bins.id, id))
      .returning();
    return bin || undefined;
  }

  async deleteBin(id: string): Promise<boolean> {
    const result = await db.delete(bins).where(eq(bins.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getBinByName(name: string): Promise<Bin | undefined> {
    const [bin] = await db.select().from(bins).where(ilike(bins.name, name));
    return bin || undefined;
  }

  async getBinStats(): Promise<Array<{ binLocation: string; itemCount: number; lastUpdated: Date }>> {
    // Note: This would be more efficient with a proper SQL query, but keeping it simple for now
    const allItems = await this.getAllItems();
    const binMap = new Map<string, { count: number; lastUpdated: Date }>();
    
    allItems.forEach(item => {
      const binLocation = item.binLocation;
      const existing = binMap.get(binLocation);
      
      if (existing) {
        existing.count += 1;
        if (item.updatedAt > existing.lastUpdated) {
          existing.lastUpdated = item.updatedAt;
        }
      } else {
        binMap.set(binLocation, {
          count: 1,
          lastUpdated: item.updatedAt
        });
      }
    });

    return Array.from(binMap.entries()).map(([binLocation, data]) => ({
      binLocation,
      itemCount: data.count,
      lastUpdated: data.lastUpdated
    })).sort((a, b) => {
      // Custom sorting to handle numerical order (Bin-1, Bin-2, ..., Bin-10)
      const aMatch = a.binLocation.match(/Bin-(\d+)/);
      const bMatch = b.binLocation.match(/Bin-(\d+)/);
      
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        return aNum - bNum;
      }
      
      // Fallback to lexicographic for non-standard names
      return a.binLocation.localeCompare(b.binLocation);
    });
  }

  async createMultipleItems(itemList: InsertItem[]): Promise<Item[]> {
    if (itemList.length === 0) return [];
    const createdItems = await db.insert(items).values(itemList).returning();
    return createdItems;
  }

  async createMultipleBins(binList: InsertBin[]): Promise<Bin[]> {
    if (binList.length === 0) return [];
    const createdBins = await db.insert(bins).values(binList).returning();
    return createdBins;
  }
}

export const storage = new DatabaseStorage();
