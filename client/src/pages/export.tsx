import { useState } from "react";
import { useInventory } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function Export() {
  const [format, setFormat] = useState("csv");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [specificBins, setSpecificBins] = useState("");
  const [category, setCategory] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  const { data: items = [] } = useInventory();
  const { toast } = useToast();

  // Filter items based on current filters
  const filteredItems = items.filter(item => {
    // Date filter
    if (dateFrom) {
      const itemDate = new Date(item.createdAt);
      const fromDate = new Date(dateFrom);
      if (itemDate < fromDate) return false;
    }
    
    if (dateTo) {
      const itemDate = new Date(item.createdAt);
      const toDate = new Date(dateTo);
      if (itemDate > toDate) return false;
    }

    // Bin filter
    if (specificBins.trim()) {
      const binList = specificBins.split(',').map(b => b.trim().toLowerCase());
      if (!binList.includes(item.binLocation.toLowerCase())) return false;
    }

    // Category filter
    if (category && item.category !== category) return false;

    return true;
  });

  const handleExport = async () => {
    setIsExporting(true);
    
    try {
      const params = new URLSearchParams({
        format,
        ...(specificBins.trim() && { bin: specificBins }),
        ...(category && { category }),
      });

      const response = await fetch(`/api/export?${params}`);
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'json' ? 'inventory.json' : 'inventory.csv';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export Complete",
        description: `Successfully exported ${filteredItems.length} items`,
      });
    } catch (error) {
      toast({
        title: "Export Failed",
        description: "Failed to export data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h3 className="text-lg font-medium text-foreground mb-2">Export Inventory Data</h3>
          <p className="text-muted-foreground">Download your inventory data in various formats</p>
        </div>

        {/* Export Options */}
        <div className="space-y-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-foreground mb-3">Export Format</h4>
              <RadioGroup value={format} onValueChange={setFormat} data-testid="radio-export-format">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="csv" id="csv" />
                  <Label htmlFor="csv" className="flex-1">
                    <div>
                      <div className="font-medium text-foreground">CSV (Comma Separated Values)</div>
                      <div className="text-sm text-muted-foreground">Compatible with Excel and Google Sheets</div>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="json" id="json" />
                  <Label htmlFor="json" className="flex-1">
                    <div>
                      <div className="font-medium text-foreground">JSON</div>
                      <div className="text-sm text-muted-foreground">For developers and data processing</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <h4 className="font-medium text-foreground mb-3">Filter Options</h4>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Date Range</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      data-testid="input-date-from"
                    />
                    <Input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      data-testid="input-date-to"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="specific-bins" className="text-sm font-medium text-foreground mb-2 block">
                    Specific Bins
                  </Label>
                  <Input
                    id="specific-bins"
                    placeholder="Leave empty for all bins, or enter specific bin numbers (comma separated)"
                    value={specificBins}
                    onChange={(e) => setSpecificBins(e.target.value)}
                    data-testid="input-specific-bins"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground mb-2 block">Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger data-testid="select-export-category">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Categories</SelectItem>
                      <SelectItem value="clothing">Clothing</SelectItem>
                      <SelectItem value="shoes">Shoes</SelectItem>
                      <SelectItem value="accessories">Accessories</SelectItem>
                      <SelectItem value="bags">Bags</SelectItem>
                      <SelectItem value="jewelry">Jewelry</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Export Summary */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Export Summary</div>
                <div className="text-sm text-muted-foreground">Based on current filters</div>
              </div>
              <div className="text-right">
                <div className="text-2xl font-semibold text-foreground" data-testid="export-count">
                  {filteredItems.length.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">items to export</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Export Button */}
        <Button
          onClick={handleExport}
          disabled={isExporting || filteredItems.length === 0}
          className="w-full"
          data-testid="button-export"
        >
          <i className="fas fa-download mr-2"></i>
          {isExporting ? "Preparing Export..." : "Download Export"}
        </Button>
      </div>
    </div>
  );
}
