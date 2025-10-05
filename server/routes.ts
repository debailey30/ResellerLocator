import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertItemSchema, updateItemSchema, markSoldSchema, insertBinSchema, updateBinSchema } from "@shared/schema";
import { z } from "zod";
import multer from "multer";
import * as XLSX from 'xlsx';

// Column mapping configuration for intelligent import
const COLUMN_MAPPINGS = {
  description: {
    required: true,
    aliases: ['description', 'item', 'product', 'name', 'item_name', 'product_name', 'title', 'item_description']
  },
  binLocation: {
    required: true,
    aliases: ['bin_location', 'binlocation', 'bin location', 'bin', 'location', 'bin_name', 'storage', 'storage_location']
  },
  brand: {
    required: false,
    aliases: ['brand', 'manufacturer', 'make', 'company']
  },
  size: {
    required: false,
    aliases: ['size', 'sizing', 'dimensions', 'measurement']
  },
  color: {
    required: false,
    aliases: ['color', 'colour', 'shade', 'hue']
  },
  category: {
    required: false,
    aliases: ['category', 'type', 'group', 'classification', 'kind']
  },
  condition: {
    required: false,
    aliases: ['condition', 'quality', 'state', 'grade', 'status']
  },
  price: {
    required: false,
    aliases: ['price', 'cost', 'value', 'amount', 'retail', 'retail_price']
  },
  notes: {
    required: false,
    aliases: ['notes', 'comments', 'remarks', 'description_notes', 'additional_info', 'extra', 'details']
  }
};

// Function to normalize header names for comparison
function normalizeHeader(header: string): string {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
}

// Function to map headers from uploaded file to our schema
function mapHeaders(fileHeaders: string[]): { headerMap: Record<string, string>, unmapped: string[], missing: string[] } {
  const normalizedFileHeaders = fileHeaders.map(h => ({ 
    original: h, 
    normalized: normalizeHeader(h) 
  }));
  
  const headerMap: Record<string, string> = {};
  const unmapped: string[] = [];
  const missing: string[] = [];
  
  // Try to match each of our schema fields with file headers
  Object.entries(COLUMN_MAPPINGS).forEach(([schemaField, config]) => {
    let matched = false;
    
    // Try to find a match using aliases
    for (const alias of config.aliases) {
      const normalizedAlias = normalizeHeader(alias);
      const matchingHeader = normalizedFileHeaders.find(fh => fh.normalized === normalizedAlias);
      
      if (matchingHeader) {
        headerMap[schemaField] = matchingHeader.original;
        matched = true;
        break;
      }
    }
    
    if (!matched && config.required) {
      missing.push(schemaField);
    }
  });
  
  // Find unmapped headers (columns we'll ignore)
  const mappedOriginalHeaders = Object.values(headerMap);
  unmapped.push(...fileHeaders.filter(header => !mappedOriginalHeaders.includes(header)));
  
  return { headerMap, unmapped, missing };
}

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/vnd.oasis.opendocument.spreadsheet'];
    const allowedExtensions = ['.csv', '.xlsx', '.xls', '.odt'];
    
    if (allowedTypes.includes(file.mimetype) || allowedExtensions.some(ext => file.originalname.toLowerCase().endsWith(ext))) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV, Excel (.xlsx, .xls), and OpenDocument (.odt) files are allowed'));
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

function parseSpreadsheet(buffer: Buffer, filename: string): Array<Record<string, string>> {
  try {
    // Use XLSX library to parse Excel and ODF files
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    
    // Get the first worksheet (or find "Master Inventory" sheet)
    let worksheetName = workbook.SheetNames[0];
    if (workbook.SheetNames.includes('Master Inventory')) {
      worksheetName = 'Master Inventory';
    }
    
    const worksheet = workbook.Sheets[worksheetName];
    if (!worksheet) {
      throw new Error(`Worksheet ${worksheetName} not found`);
    }
    
    // Convert to JSON with header row as keys
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    if (jsonData.length === 0) return [];
    
    // Find the header row (skip title rows)
    let headerRowIndex = 0;
    let headers: string[] = [];
    
    // Look through first few rows to find the actual header row
    for (let i = 0; i < Math.min(5, jsonData.length); i++) {
      const potentialHeaders = jsonData[i].map((h: any) => String(h || '').trim());
      
      // Check if this looks like a header row (multiple non-empty values)
      const nonEmptyHeaders = potentialHeaders.filter(h => h && h !== 'Master Inventory');
      if (nonEmptyHeaders.length >= 2) {
        headerRowIndex = i;
        headers = potentialHeaders;
        break;
      }
    }
    
    if (headers.length === 0) {
      headers = jsonData[0].map((h: any) => String(h || '').trim());
    }
    
    const dataRows = jsonData.slice(headerRowIndex + 1).filter(row => 
      row && row.length > 0 && row.some(cell => String(cell || '').trim())
    );
    
    return dataRows.map(row => {
      const item: Record<string, string> = {};
      headers.forEach((header, colIndex) => {
        if (header) {
          item[header] = String(row[colIndex] || '').trim();
        }
      });
      return item;
    });
  } catch (error) {
    console.error('Error parsing spreadsheet:', error);
    throw new Error(`Failed to parse spreadsheet file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
  // 31 distinct, visually appealing colors for bins (including Bin-0)
  const colors = [
    '#808080', // Gray for Bin-0 (uncategorized items)
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#FF9FF3', '#54A0FF', '#5F27CD', '#00D2D3',
    '#FF9F43', '#EE5A24', '#0ABDE3', '#00CEC9', '#6C5CE7',
    '#A29BFE', '#FD79A8', '#E17055', '#00B894', '#FDCB6E',
    '#E84393', '#74B9FF', '#81ECEC', '#FAB1A0', '#32CD32',
    '#FF7675', '#9B59B6', '#F39C12', '#E67E22', '#55A3FF'
  ];

  // Validate uniqueness
  const uniqueColors = Array.from(new Set(colors));
  if (uniqueColors.length !== colors.length) {
    throw new Error('Duplicate colors found in bins data');
  }

  // Generate Bin-0 through Bin-30 (31 bins total)
  return Array.from({ length: 31 }, (_, index) => ({
    name: `Bin-${index}`,
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

  // Bulk import items directly (JSON)
  app.post("/api/items/bulk", async (req, res) => {
    try {
      const { items } = req.body;
      
      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ message: "Items array is required" });
      }

      const validatedItems = [];
      const errors = [];

      for (let index = 0; index < items.length; index++) {
        const item = items[index];
        try {
          const validatedItem = insertItemSchema.parse(item);
          validatedItems.push(validatedItem);
        } catch (error) {
          errors.push(`Item ${index + 1}: Invalid data format`);
        }
      }

      const createdItems = await storage.createMultipleItems(validatedItems);

      res.json({
        success: true,
        created: createdItems.length,
        errors: errors.length,
        errorDetails: errors
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process bulk import" });
    }
  });

  // Upload spreadsheet (CSV, Excel, ODF)
  app.post("/api/items/upload", upload.single('csv'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      let parsedData: Array<Record<string, string>>;
      
      // Determine file type and parse accordingly
      if (req.file.originalname.toLowerCase().endsWith('.csv')) {
        const csvContent = req.file.buffer.toString('utf-8');
        parsedData = parseCSV(csvContent);
      } else {
        // Handle Excel (.xlsx, .xls) and OpenDocument (.odt) files
        parsedData = parseSpreadsheet(req.file.buffer, req.file.originalname);
      }
      
      if (parsedData.length === 0) {
        return res.status(400).json({ message: "File is empty or invalid" });
      }

      const items = [];
      const errors = [];

      // Get headers from the first row of data
      const fileHeaders = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
      const { headerMap, unmapped, missing } = mapHeaders(fileHeaders);
      
      
      // Check if we're missing required fields
      if (missing.length > 0) {
        return res.status(400).json({
          message: `Missing required columns: ${missing.join(', ')}`,
          details: {
            missing,
            unmapped: unmapped.length > 0 ? `Ignored columns: ${unmapped.join(', ')}` : null,
            availableHeaders: fileHeaders
          }
        });
      }

      for (let index = 0; index < parsedData.length; index++) {
        const row = parsedData[index];
        try {
          // Map columns using intelligent mapping
          const itemData = {
            description: headerMap.description ? (row[headerMap.description] || '') : '',
            binLocation: headerMap.binLocation ? (row[headerMap.binLocation] || '') : '',
            brand: headerMap.brand ? (row[headerMap.brand] || '') : '',
            size: headerMap.size ? (row[headerMap.size] || '') : '',
            color: headerMap.color ? (row[headerMap.color] || '') : '',
            category: headerMap.category ? (row[headerMap.category] || '') : '',
            condition: headerMap.condition ? (row[headerMap.condition] || '') : '',
            price: headerMap.price ? (row[headerMap.price] || undefined) : undefined,
            notes: headerMap.notes ? (row[headerMap.notes] || '') : ''
          };

          if (!itemData.description || !itemData.binLocation) {
            errors.push(`Row ${index + 2}: Missing required fields (description and bin_location)`);
            continue;
          }

          const validatedItem = insertItemSchema.parse(itemData);
          items.push(validatedItem);
        } catch (error) {
          errors.push(`Row ${index + 2}: Invalid data format - ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      console.error("Upload error:", error);
      res.status(500).json({ 
        message: "Failed to process CSV upload",
        error: error instanceof Error ? error.message : 'Unknown error'
      });
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
