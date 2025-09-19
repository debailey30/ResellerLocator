import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertItemSchema, updateItemSchema, markSoldSchema, insertBinSchema, updateBinSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

function parseCSV(csvContent: string): Array<Record<string, string>> {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];
  
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = lines.slice(1);
  
  return rows.map(row => {
    const values = row.split(',').map(v => v.trim().replace(/"/g, ''));
    const item: Record<string, string> = {};
    headers.forEach((header, index) => {
      item[header] = values[index] || '';
    });
    return item;
  });
}

function generateCSV(items: any[]): string {
  if (items.length === 0) return '';
  
  const headers = Object.keys(items[0]);
  const csvHeaders = headers.join(',');
  
  const csvRows = items.map(item => 
    headers.map(header => {
      const value = item[header] || '';
      return `"${value.toString().replace(/"/g, '""')}"`;
    }).join(',')
  );
  
  return [csvHeaders, ...csvRows].join('\n');
}

function generateDefaultBinsData() {
  // 30 distinct, visually appealing colors for bins (duplicates removed)
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
    '#FF9F43', '#EE5A24', '#0ABDE3', '#00CEC9', '#6C5CE7',
    '#A29BFE', '#FD79A8', '#E17055', '#00B894', '#FDCB6E',
    '#E84393', '#74B9FF', '#81ECEC', '#FAB1A0', '#32CD32',
    '#FF7675', '#9B59B6', '#F39C12', '#E67E22', '#55A3FF'
  ];

  // Validate uniqueness
  const uniqueColors = [...new Set(colors)];
  if (uniqueColors.length !== colors.length) {
    throw new Error('Duplicate colors found in bins data');
  }

  return Array.from({ length: 30 }, (_, index) => ({
    name: `Bin-${index + 1}`,
    color: colors[index]
  }));
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all items
  app.get("/api/items", async (req, res) => {
    try {
      const items = await storage.getAllItems();
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items" });
    }
  });

  // Search items
  app.get("/api/items/search", async (req, res) => {
    try {
      const query = req.query.q as string || '';
      const items = await storage.searchItems(query);
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to search items" });
    }
  });

  // Get items by bin
  app.get("/api/items/bin/:binLocation", async (req, res) => {
    try {
      const { binLocation } = req.params;
      const items = await storage.getItemsByBin(decodeURIComponent(binLocation));
      res.json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch items for bin" });
    }
  });

  // Get bin stats (default - what frontend expects)
  app.get("/api/bins", async (req, res) => {
    try {
      const binStats = await storage.getBinStats();
      res.json(binStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bin stats" });
    }
  });

  // Get bin stats (alias for compatibility)
  app.get("/api/bins/stats", async (req, res) => {
    try {
      const binStats = await storage.getBinStats();
      res.json(binStats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bin stats" });
    }
  });

  // Get all bins (full Bin[] data)
  app.get("/api/bins/list", async (req, res) => {
    try {
      const bins = await storage.getAllBins();
      res.json(bins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bins" });
    }
  });

  // Get single bin
  app.get("/api/bins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const bin = await storage.getBinById(id);
      
      if (!bin) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      res.json(bin);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bin" });
    }
  });

  // Create bin
  app.post("/api/bins", async (req, res) => {
    try {
      const validatedData = insertBinSchema.parse(req.body);
      
      // Check if bin name already exists
      const existingBin = await storage.getBinByName(validatedData.name);
      if (existingBin) {
        return res.status(400).json({ message: "Bin name already exists" });
      }
      
      const bin = await storage.createBin(validatedData);
      res.status(201).json(bin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid bin data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create bin" });
    }
  });

  // Update bin
  app.patch("/api/bins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateBinSchema.parse(req.body);
      
      // Get current bin info
      const currentBin = await storage.getBinById(id);
      if (!currentBin) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      // If updating name, check constraints
      if (validatedData.name && validatedData.name !== currentBin.name) {
        // Check if new name already exists
        const existingBin = await storage.getBinByName(validatedData.name);
        if (existingBin && existingBin.id !== id) {
          return res.status(400).json({ message: "Bin name already exists" });
        }
        
        // Option A: Forbid renaming when items exist in the bin
        const itemsInBin = await storage.getItemsByBin(currentBin.name);
        if (itemsInBin.length > 0) {
          return res.status(400).json({ 
            message: "Cannot rename bin with existing items. Move items to another bin first.",
            itemCount: itemsInBin.length
          });
        }
      }
      
      const bin = await storage.updateBin(id, validatedData);
      
      if (!bin) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      res.json(bin);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid bin data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update bin" });
    }
  });

  // Delete bin
  app.delete("/api/bins/:id", async (req, res) => {
    try {
      const { id } = req.params;
      
      // Check if bin exists first
      const existingBin = await storage.getBinById(id);
      if (!existingBin) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      // Check if bin is in use
      const itemsInBin = await storage.getItemsByBin(existingBin.name);
      if (itemsInBin.length > 0) {
        return res.status(400).json({ 
          message: "Cannot delete bin with items. Move items to another bin first.",
          itemCount: itemsInBin.length
        });
      }
      
      const deleted = await storage.deleteBin(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Bin not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete bin" });
    }
  });

  // Get single item
  app.get("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const item = await storage.getItemById(id);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch item" });
    }
  });

  // Create item
  app.post("/api/items", async (req, res) => {
    try {
      const validatedData = insertItemSchema.parse(req.body);
      const item = await storage.createItem(validatedData);
      res.status(201).json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create item" });
    }
  });

  // Update item
  app.patch("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const validatedData = updateItemSchema.parse(req.body);
      
      const item = await storage.updateItem(id, validatedData);
      
      if (!item) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid item data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to update item" });
    }
  });

  // Delete item
  app.delete("/api/items/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const deleted = await storage.deleteItem(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete item" });
    }
  });

  // Mark item as sold
  app.patch("/api/items/:id/sold", async (req, res) => {
    try {
      const { id } = req.params;
      const soldData = markSoldSchema.parse(req.body);
      
      // Check if item exists and is not already sold
      const existingItem = await storage.getItemById(id);
      if (!existingItem) {
        return res.status(404).json({ message: "Item not found" });
      }
      
      if (existingItem.status === "sold") {
        return res.status(400).json({ message: "Item is already marked as sold" });
      }
      
      const item = await storage.markAsSold(id, soldData);
      
      res.json(item);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Invalid sold data", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to mark item as sold" });
    }
  });

  // Upload CSV
  app.post("/api/items/upload", upload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const csvContent = req.file.buffer.toString('utf-8');
      const parsedData = parseCSV(csvContent);
      
      if (parsedData.length === 0) {
        return res.status(400).json({ message: "CSV file is empty or invalid" });
      }

      const items = [];
      const errors = [];

      for (const [index, row] of parsedData.entries()) {
        try {
          // Map CSV columns to our schema
          const itemData = {
            description: row.description || row.Description || '',
            binLocation: row.bin_location || row.binLocation || row['Bin Location'] || '',
            brand: row.brand || row.Brand || '',
            size: row.size || row.Size || '',
            color: row.color || row.Color || '',
            category: row.category || row.Category || '',
            condition: row.condition || row.Condition || '',
            price: row.price || row.Price || '',
            notes: row.notes || row.Notes || ''
          };

          if (!itemData.description || !itemData.binLocation) {
            errors.push(`Row ${index + 2}: Missing required fields (description and bin_location)`);
            continue;
          }

          const validatedItem = insertItemSchema.parse(itemData);
          items.push(validatedItem);
        } catch (error) {
          errors.push(`Row ${index + 2}: Invalid data format`);
        }
      }

      const createdItems = await storage.createMultipleItems(items);

      res.json({
        success: true,
        created: createdItems.length,
        errors: errors.length,
        errorDetails: errors
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process CSV upload" });
    }
  });

  // Export data
  app.get("/api/export", async (req, res) => {
    try {
      const format = req.query.format as string || 'csv';
      const binLocation = req.query.bin as string;
      const category = req.query.category as string;
      
      let items = await storage.getAllItems();
      
      // Apply filters
      if (binLocation) {
        items = items.filter(item => item.binLocation === binLocation);
      }
      
      if (category) {
        items = items.filter(item => item.category === category);
      }

      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory.json"');
        res.json(items);
      } else {
        // Default to CSV
        const csvContent = generateCSV(items);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
        res.send(csvContent);
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to export data" });
    }
  });

  // Seed default bins
  app.post("/api/bins/seed", async (req, res) => {
    try {
      // Check if bins already exist
      const existingBins = await storage.getAllBins();
      if (existingBins.length > 0) {
        return res.status(400).json({ 
          message: "Bins already exist. Clear existing bins first or use individual bin creation.",
          existingCount: existingBins.length
        });
      }

      const defaultBinsData = generateDefaultBinsData();
      const createdBins = await storage.createMultipleBins(defaultBinsData);

      res.status(201).json({
        message: "Default bins created successfully",
        count: createdBins.length,
        bins: createdBins
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to seed default bins" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
