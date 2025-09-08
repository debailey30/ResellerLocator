import { useState, useRef } from "react";
import { Link } from "wouter";
import { useUploadCSV } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [dragActive, setDragActive] = useState(false);
  const [uploadResult, setUploadResult] = useState<{
    success: boolean;
    created: number;
    errors: number;
    errorDetails: string[];
  } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const uploadCSV = useUploadCSV();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      toast({
        title: "Error",
        description: "Please select a CSV file",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await uploadCSV.mutateAsync(file);
      setUploadResult(result);
      
      if (result.success) {
        toast({
          title: "Upload Complete",
          description: `Successfully imported ${result.created} items`,
        });
      }
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to process CSV file",
        variant: "destructive",
      });
    }
  };

  const downloadTemplate = () => {
    const csvContent = `description,bin_location,brand,size,color,category,condition,price,notes
"Nike Air Max 270 - Black/White","BIN-001","Nike","9","Black/White","shoes","new","129.99","Sample item"
"Vintage Levi's 501 Jeans","BIN-002","Levi's","32x34","Blue","clothing","good","45.00","Classic fit"`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'inventory_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-foreground">Upload Spreadsheet</h3>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-to-search">
                <i className="fas fa-arrow-left mr-2"></i>
                Back to Search
              </Button>
            </Link>
          </div>
          <p className="text-muted-foreground">Import multiple items from a CSV file</p>
        </div>

        {/* Upload Instructions */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <h4 className="font-medium text-foreground mb-2">CSV Format Requirements:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• <strong>Required columns:</strong> description, bin_location</li>
              <li>• <strong>Optional columns:</strong> brand, size, color, category, condition, price, notes</li>
              <li>• Use comma-separated values (.csv format)</li>
              <li>• Include headers in the first row</li>
            </ul>
          </CardContent>
        </Card>

        {/* Sample Template */}
        <div className="mb-6">
          <Button
            variant="link"
            onClick={downloadTemplate}
            className="text-primary hover:text-primary/80 text-sm font-medium p-0"
            data-testid="button-download-template"
          >
            <i className="fas fa-download mr-2"></i>
            Download CSV Template
          </Button>
        </div>

        {/* Upload Area */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              data-testid="upload-dropzone"
            >
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <i className="fas fa-cloud-upload-alt text-primary text-xl"></i>
              </div>
              <h4 className="text-lg font-medium text-foreground mb-2">Drop your CSV file here</h4>
              <p className="text-muted-foreground mb-4">or click to browse files</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileSelect}
                className="hidden"
                data-testid="input-csv-upload"
              />
              <Button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadCSV.isPending}
                data-testid="button-select-file"
              >
                {uploadCSV.isPending ? "Processing..." : "Select File"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Progress */}
        {uploadCSV.isPending && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-foreground">Processing CSV...</span>
              </div>
              <Progress value={50} className="w-full" />
            </CardContent>
          </Card>
        )}

        {/* Upload Results */}
        {uploadResult && (
          <Card data-testid="upload-results">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3 mb-4">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  uploadResult.success ? "bg-green-100" : "bg-red-100"
                }`}>
                  <i className={`fas ${
                    uploadResult.success ? "fa-check text-green-600" : "fa-times text-red-600"
                  } text-sm`}></i>
                </div>
                <div>
                  <h4 className="font-medium text-foreground">
                    {uploadResult.success ? "Upload Complete" : "Upload Failed"}
                  </h4>
                  <p className="text-sm text-muted-foreground" data-testid="upload-summary">
                    Successfully imported {uploadResult.created} items
                    {uploadResult.errors > 0 && ` (${uploadResult.errors} errors)`}
                  </p>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-green-600" data-testid="items-created">
                    {uploadResult.created}
                  </div>
                  <div className="text-xs text-muted-foreground">Items Added</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-yellow-600">0</div>
                  <div className="text-xs text-muted-foreground">Warnings</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-red-600" data-testid="items-errors">
                    {uploadResult.errors}
                  </div>
                  <div className="text-xs text-muted-foreground">Errors</div>
                </div>
              </div>

              {/* Error Details */}
              {uploadResult.errorDetails && uploadResult.errorDetails.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border">
                  <h5 className="font-medium text-foreground mb-2">Error Details:</h5>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {uploadResult.errorDetails.map((error, index) => (
                      <li key={index} className="text-destructive">• {error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
