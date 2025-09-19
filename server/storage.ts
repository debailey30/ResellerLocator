import { type Item, type InsertItem, type UpdateItem, type MarkSoldData, type Bin, type InsertBin, type UpdateBin } from "@shared/schema";
import { randomUUID } from "crypto";

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

export class MemStorage implements IStorage {
  private items: Map<string, Item>;
  private bins: Map<string, Bin>;

  constructor() {
    this.items = new Map();
    this.bins = new Map();
  }

  async getAllItems(): Promise<Item[]> {
    return Array.from(this.items.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getItemById(id: string): Promise<Item | undefined> {
    return this.items.get(id);
  }

  async createItem(insertItem: InsertItem): Promise<Item> {
    const id = randomUUID();
    const now = new Date();
    const item: Item = { 
      ...insertItem, 
      id,
      status: "active",
      soldDate: null,
      soldPrice: null,
      createdAt: now,
      updatedAt: now
    };
    this.items.set(id, item);
    return item;
  }

  async updateItem(id: string, updates: UpdateItem): Promise<Item | undefined> {
    const existingItem = this.items.get(id);
    if (!existingItem) {
      return undefined;
    }

    const updatedItem: Item = {
      ...existingItem,
      ...updates,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async deleteItem(id: string): Promise<boolean> {
    return this.items.delete(id);
  }

  async markAsSold(id: string, soldData: MarkSoldData): Promise<Item | undefined> {
    const existingItem = this.items.get(id);
    if (!existingItem) {
      return undefined;
    }

    const updatedItem: Item = {
      ...existingItem,
      status: "sold",
      soldDate: soldData.soldDate ? new Date(soldData.soldDate) : new Date(),
      soldPrice: soldData.soldPrice || null,
      updatedAt: new Date()
    };
    
    this.items.set(id, updatedItem);
    return updatedItem;
  }

  async searchItems(query: string): Promise<Item[]> {
    if (!query.trim()) {
      return this.getAllItems();
    }

    const searchTerm = query.toLowerCase();
    const allItems = Array.from(this.items.values());
    
    return allItems.filter(item => {
      const searchableFields = [
        item.description,
        item.brand,
        item.size,
        item.color,
        item.category,
        item.condition,
        item.notes,
        item.binLocation
      ].filter(Boolean);
      
      return searchableFields.some(field => 
        field!.toLowerCase().includes(searchTerm)
      );
    }).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getItemsByBin(binLocation: string): Promise<Item[]> {
    const allItems = Array.from(this.items.values());
    return allItems.filter(item => 
      item.binLocation.toLowerCase() === binLocation.toLowerCase()
    ).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getAllBins(): Promise<Bin[]> {
    return Array.from(this.bins.values()).sort((a, b) => {
      // Custom sorting to handle numerical order (Bin-1, Bin-2, ..., Bin-10)
      const aMatch = a.name.match(/Bin-(\d+)/);
      const bMatch = b.name.match(/Bin-(\d+)/);
      
      if (aMatch && bMatch) {
        const aNum = parseInt(aMatch[1]);
        const bNum = parseInt(bMatch[1]);
        return aNum - bNum;
      }
      
      // Fallback to lexicographic for non-standard names
      return a.name.localeCompare(b.name);
    });
  }

  async getBinById(id: string): Promise<Bin | undefined> {
    return this.bins.get(id);
  }

  async createBin(insertBin: InsertBin): Promise<Bin> {
    const id = randomUUID();
    const now = new Date();
    const bin: Bin = { 
      ...insertBin, 
      id,
      createdAt: now,
      updatedAt: now
    };
    this.bins.set(id, bin);
    return bin;
  }

  async updateBin(id: string, updates: UpdateBin): Promise<Bin | undefined> {
    const existingBin = this.bins.get(id);
    if (!existingBin) {
      return undefined;
    }

    const updatedBin: Bin = {
      ...existingBin,
      ...updates,
      updatedAt: new Date()
    };
    
    this.bins.set(id, updatedBin);
    return updatedBin;
  }

  async deleteBin(id: string): Promise<boolean> {
    return this.bins.delete(id);
  }

  async getBinByName(name: string): Promise<Bin | undefined> {
    const allBins = Array.from(this.bins.values());
    return allBins.find(bin => bin.name.toLowerCase() === name.toLowerCase());
  }

  async getBinStats(): Promise<Array<{ binLocation: string; itemCount: number; lastUpdated: Date }>> {
    const allItems = Array.from(this.items.values());
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

  async createMultipleItems(items: InsertItem[]): Promise<Item[]> {
    const createdItems: Item[] = [];
    
    for (const item of items) {
      const created = await this.createItem(item);
      createdItems.push(created);
    }
    
    return createdItems;
  }

  async createMultipleBins(bins: InsertBin[]): Promise<Bin[]> {
    const createdBins: Bin[] = [];
    
    for (const bin of bins) {
      const created = await this.createBin(bin);
      createdBins.push(created);
    }
    
    return createdBins;
  }
}

export const storage = new MemStorage();
