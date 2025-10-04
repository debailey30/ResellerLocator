import { useState, useEffect } from "react";
import { Link } from "wouter";
import { useSearchItems, useItemsByBin, useDeleteItem, useUpdateItem, useMarkAsSold, useBinsWithColors, getBinColorByName } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateItemSchema, type UpdateItem, type Item } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { z } from "zod";

const updateFormSchema = updateItemSchema.extend({
  price: z.string().optional(),
});

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState("");
  const [binSearch, setBinSearch] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [showSoldItems, setShowSoldItems] = useState(true);
  
  const { toast } = useToast();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const markAsSold = useMarkAsSold();
  const { data: binsWithColors = [] } = useBinsWithColors();

  // Helper function to get contrasting text color
  const getContrastingColor = (hexColor: string): string => {
    // Convert hex to RGB
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    
    // Calculate luminance
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    
    // Return white for dark colors, black for light colors
    return luminance > 0.5 ? '#000000' : '#ffffff';
  };

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearchLoading } = useSearchItems(debouncedQuery);
  const { data: binResults = [], isLoading: isBinLoading } = useItemsByBin(binSearch);

  // Filter sold items based on toggle
  const filteredSearchResults = showSoldItems ? searchResults : searchResults.filter(item => item.status !== "sold");
  const filteredBinResults = showSoldItems ? binResults : binResults.filter(item => item.status !== "sold");

  const displayResults = binSearch ? filteredBinResults : filteredSearchResults;
  const isLoading = binSearch ? isBinLoading : isSearchLoading;

  const form = useForm<z.infer<typeof updateFormSchema>>({
    resolver: zodResolver(updateFormSchema),
    defaultValues: {
      description: "",
      binLocation: "",
      brand: "",
      size: "",
      color: "",
      category: "",
      condition: "",
      price: "",
      notes: "",
    },
  });

  const handleDelete = async (id: string, description: string) => {
    if (window.confirm(`Are you sure you want to delete "${description}"?`)) {
      try {
        await deleteItem.mutateAsync(id);
        toast({
          title: "Success",
          description: "Item deleted successfully",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete item",
          variant: "destructive",
        });
      }
    }
  };

  const handleEdit = (item: Item) => {
    setEditingItem(item);
    form.reset({
      description: item.description,
      binLocation: item.binLocation,
      brand: item.brand || "",
      size: item.size || "",
      color: item.color || "",
      category: item.category || "",
      condition: item.condition || "",
      price: item.price || "",
      notes: item.notes || "",
    });
  };

  const onSubmit = async (data: z.infer<typeof updateFormSchema>) => {
    if (!editingItem) return;

    try {
      const updateData: UpdateItem = {
        ...data,
        price: data.price ? data.price : undefined,
      };
      
      await updateItem.mutateAsync({
        id: editingItem.id,
        data: updateData,
      });
      
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
      
      setEditingItem(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsSold = async (id: string, description: string) => {
    const soldPrice = prompt(`Enter the sold price for "${description}" (optional):`);
    if (soldPrice !== null) { // User clicked OK (even if empty)
      try {
        await markAsSold.mutateAsync({
          id,
          soldData: {
            soldPrice: soldPrice || undefined,
            soldDate: new Date().toISOString(),
          },
        });
        
        toast({
          title: "Success",
          description: `"${description}" marked as sold`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to mark item as sold",
          variant: "destructive",
        });
      }
    }
  };

  const handleBinSearch = () => {
    if (binSearch.trim()) {
      setSearchQuery("");
    }
  };

  return (
    <div className="p-4 sm:p-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 mb-2">
          <h3 className="text-lg font-medium text-foreground">Find Your Items</h3>
          <Link href="/add-item">
            <Button 
              className="bg-primary hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
              data-testid="button-add-item-header"
            >
              <i className="fas fa-plus mr-2"></i>
              Add Item
            </Button>
          </Link>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">Search by description, brand, size, color, or any other details</p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <i className="fas fa-search text-muted-foreground"></i>
            </div>
            <Input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setBinSearch("");
              }}
              className="pl-10 min-h-[44px]"
              data-testid="input-search"
            />
          </div>
          <Button 
            variant="secondary"
            onClick={() => setSearchQuery("")}
            disabled={!searchQuery}
            className="min-h-[44px] w-full sm:w-auto"
            data-testid="button-clear-search"
          >
            <i className="fas fa-times"></i>
            <span className="ml-2">Clear</span>
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Search happens automatically as you type
        </p>
      </div>

      {/* Quick Bin Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Or search by bin number:</label>
        <div className="flex flex-col sm:flex-row gap-2 sm:space-x-2">
          <Input
            type="text"
            placeholder="Enter bin number (e.g., Bin-1)"
            value={binSearch}
            onChange={(e) => setBinSearch(e.target.value)}
            className="flex-1 min-h-[44px]"
            data-testid="input-bin-search"
          />
          <Button 
            variant="secondary" 
            onClick={handleBinSearch}
            className="min-h-[44px] w-full sm:w-auto"
            data-testid="button-bin-search"
          >
            <i className="fas fa-search mr-2 sm:mr-0"></i>
            <span className="sm:hidden">Search Bin</span>
          </Button>
        </div>
      </div>

      {/* Filter Toggle */}
      <div className="mb-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:space-x-2">
          <Button
            variant={showSoldItems ? "default" : "outline"}
            size="sm"
            onClick={() => setShowSoldItems(!showSoldItems)}
            className="min-h-[44px] w-full sm:w-auto"
            data-testid="button-toggle-sold-items"
          >
            <i className={`fas ${showSoldItems ? "fa-eye" : "fa-eye-slash"} mr-2`}></i>
            {showSoldItems ? "Hide Sold Items" : "Show Sold Items"}
          </Button>
          <span className="text-sm text-muted-foreground text-center sm:text-left">
            {displayResults.filter(item => item.status === "sold").length} sold items
          </span>
        </div>
      </div>

      {/* Search Results */}
      <div className="space-y-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/4 mb-4" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {Array.from({ length: 6 }).map((_, j) => (
                    <Skeleton key={j} className="h-4 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : displayResults.length > 0 ? (
          displayResults.map((item) => (
            <Card key={item.id} className={`hover:shadow-md transition-shadow ${item.status === "sold" ? "opacity-60 bg-gray-50 dark:bg-gray-800" : ""}`}>
              <CardContent className="pt-4 sm:pt-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex flex-col space-y-2 mb-3">
                      {/* Brand shown first at the top */}
                      {item.brand && (
                        <div className="text-lg font-semibold text-primary" data-testid={`text-item-brand-top-${item.id}`}>
                          {item.brand}
                        </div>
                      )}
                      <div className="flex items-start justify-between">
                        <h4 className={`font-medium leading-tight ${item.status === "sold" ? "line-through text-muted-foreground" : "text-foreground"}`} data-testid={`text-item-description-${item.id}`}>
                          {item.description}
                        </h4>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span 
                          className="px-2 py-1 text-xs rounded-full flex items-center"
                          style={{
                            backgroundColor: getBinColorByName(binsWithColors, item.binLocation) || '#6B7280',
                            color: getContrastingColor(getBinColorByName(binsWithColors, item.binLocation) || '#6B7280')
                          }}
                        >
                          <i className="fas fa-map-marker-alt mr-1"></i>
                          <span data-testid={`text-item-bin-${item.id}`}>{item.binLocation}</span>
                        </span>
                        {item.status === "sold" && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full font-medium">
                            <i className="fas fa-check mr-1"></i>
                            SOLD
                            {item.soldPrice && ` - $${item.soldPrice}`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      {item.size && (
                        <div><strong>Size:</strong> <span data-testid={`text-item-size-${item.id}`}>{item.size}</span></div>
                      )}
                      {item.condition && (
                        <div><strong>Condition:</strong> <span data-testid={`text-item-condition-${item.id}`}>{item.condition}</span></div>
                      )}
                      {item.color && (
                        <div><strong>Color:</strong> <span data-testid={`text-item-color-${item.id}`}>{item.color}</span></div>
                      )}
                      {item.category && (
                        <div><strong>Category:</strong> <span data-testid={`text-item-category-${item.id}`}>{item.category}</span></div>
                      )}
                      <div><strong>Added:</strong> <span data-testid={`text-item-date-${item.id}`}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </span></div>
                    </div>
                    {item.notes && (
                      <div className="mt-2 text-sm text-muted-foreground">
                        <strong>Notes:</strong> <span data-testid={`text-item-notes-${item.id}`}>{item.notes}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 justify-end sm:ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center"
                          data-testid={`button-edit-${item.id}`}
                          title="Edit item"
                          aria-label={`Edit ${item.description}`}
                        >
                          <i className="fas fa-edit"></i>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>Edit Item</DialogTitle>
                        </DialogHeader>
                        <Form {...form}>
                          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                              control={form.control}
                              name="description"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Description *</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} data-testid="input-edit-description" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            
                            <FormField
                              control={form.control}
                              name="binLocation"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Bin Location *</FormLabel>
                                  <FormControl>
                                    <Input {...field} data-testid="input-edit-bin" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="grid grid-cols-2 gap-4">
                              <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Brand</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} data-testid="input-edit-brand" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="size"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Size</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} data-testid="input-edit-size" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="color"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Color</FormLabel>
                                    <FormControl>
                                      <Input {...field} value={field.value || ""} data-testid="input-edit-color" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-category">
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="">Select category</SelectItem>
                                        <SelectItem value="clothing">Clothing</SelectItem>
                                        <SelectItem value="shoes">Shoes</SelectItem>
                                        <SelectItem value="accessories">Accessories</SelectItem>
                                        <SelectItem value="bags">Bags</SelectItem>
                                        <SelectItem value="jewelry">Jewelry</SelectItem>
                                        <SelectItem value="other">Other</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="condition"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Condition</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                      <FormControl>
                                        <SelectTrigger data-testid="select-edit-condition">
                                          <SelectValue placeholder="Select condition" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="">Select condition</SelectItem>
                                        <SelectItem value="new">New with Tags</SelectItem>
                                        <SelectItem value="like-new">Like New</SelectItem>
                                        <SelectItem value="good">Good</SelectItem>
                                        <SelectItem value="fair">Fair</SelectItem>
                                        <SelectItem value="poor">Poor</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="price"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Price</FormLabel>
                                    <FormControl>
                                      <Input {...field} type="number" step="0.01" data-testid="input-edit-price" />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>

                            <FormField
                              control={form.control}
                              name="notes"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Notes</FormLabel>
                                  <FormControl>
                                    <Textarea {...field} value={field.value || ""} data-testid="input-edit-notes" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-end space-x-2">
                              <Button 
                                type="submit" 
                                disabled={updateItem.isPending}
                                data-testid="button-save-edit"
                              >
                                {updateItem.isPending ? "Saving..." : "Save Changes"}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      </DialogContent>
                    </Dialog>
                    
                    {item.status !== "sold" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleMarkAsSold(item.id, item.description)}
                        className="text-green-600 hover:bg-green-50 dark:text-green-400 dark:hover:bg-green-900/20 min-h-[44px] min-w-[44px] flex items-center justify-center"
                        disabled={markAsSold.isPending}
                        data-testid={`button-mark-sold-${item.id}`}
                        title="Mark as sold"
                        aria-label={`Mark ${item.description} as sold`}
                      >
                        <i className="fas fa-dollar-sign"></i>
                      </Button>
                    )}
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(item.id, item.description)}
                      className="text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      disabled={deleteItem.isPending}
                      data-testid={`button-delete-${item.id}`}
                      title="Delete item"
                      aria-label={`Delete ${item.description}`}
                    >
                      <i className="fas fa-trash"></i>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          // No results state
          <div className="text-center py-12" data-testid="no-results">
            <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-medium text-foreground mb-2">No items found</h3>
            <p className="text-muted-foreground">
              {searchQuery || binSearch 
                ? "Try adjusting your search terms or check the spelling"
                : "Start by searching for items or adding new inventory"
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
