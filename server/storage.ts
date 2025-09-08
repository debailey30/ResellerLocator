import { type Item, type InsertItem, type UpdateItem } from "@shared/schema";
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
  
  // Bin operations
  getAllBins(): Promise<Array<{ binLocation: string; itemCount: number; lastUpdated: Date }>>;
  
  // Bulk operations
  createMultipleItems(items: InsertItem[]): Promise<Item[]>;
}

export class MemStorage implements IStorage {
  private items: Map<string, Item>;

  constructor() {
    this.items = new Map();
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

  async getAllBins(): Promise<Array<{ binLocation: string; itemCount: number; lastUpdated: Date }>> {
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
    })).sort((a, b) => a.binLocation.localeCompare(b.binLocation));
  }

  async createMultipleItems(items: InsertItem[]): Promise<Item[]> {
    const createdItems: Item[] = [];
    
    for (const item of items) {
      const created = await this.createItem(item);
      createdItems.push(created);
    }
    
    return createdItems;
  }
}

export const storage = new MemStorage();
