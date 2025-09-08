import { useState, useEffect } from "react";
import { useSearchItems, useItemsByBin, useDeleteItem, useUpdateItem } from "@/hooks/use-inventory";
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
  
  const { toast } = useToast();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isLoading: isSearchLoading } = useSearchItems(debouncedQuery);
  const { data: binResults = [], isLoading: isBinLoading } = useItemsByBin(binSearch);

  const displayResults = binSearch ? binResults : searchResults;
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

  const handleBinSearch = () => {
    if (binSearch.trim()) {
      setSearchQuery("");
    }
  };

  return (
    <div className="p-6">
      {/* Search Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-foreground">Find Your Items</h3>
          <Button 
            onClick={() => window.location.href = "/add-item"}
            className="bg-primary hover:bg-primary/90"
            data-testid="button-add-item-header"
          >
            <i className="fas fa-plus mr-2"></i>
            Add Item
          </Button>
        </div>
        <p className="text-muted-foreground">Search by description, brand, size, color, or any other details</p>
      </div>

      {/* Search Bar */}
      <div className="relative mb-6">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <i className="fas fa-search text-muted-foreground"></i>
        </div>
        <Input
          type="text"
          placeholder="Search items... (e.g., 'red nike shoes size 9', 'vintage denim jacket')"
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setBinSearch("");
          }}
          className="pl-10"
          data-testid="input-search"
        />
      </div>

      {/* Quick Bin Search */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-foreground mb-2">Or search by bin number:</label>
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter bin number (e.g., BIN-001)"
            value={binSearch}
            onChange={(e) => setBinSearch(e.target.value)}
            className="flex-1"
            data-testid="input-bin-search"
          />
          <Button 
            variant="secondary" 
            onClick={handleBinSearch}
            data-testid="button-bin-search"
          >
            <i className="fas fa-search"></i>
          </Button>
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
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="font-medium text-foreground" data-testid={`text-item-description-${item.id}`}>
                        {item.description}
                      </h4>
                      <span className="px-2 py-1 bg-primary text-primary-foreground text-xs rounded-full">
                        <i className="fas fa-map-marker-alt mr-1"></i>
                        <span data-testid={`text-item-bin-${item.id}`}>{item.binLocation}</span>
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      {item.brand && (
                        <div><strong>Brand:</strong> <span data-testid={`text-item-brand-${item.id}`}>{item.brand}</span></div>
                      )}
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
                  <div className="flex space-x-2 ml-4">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleEdit(item)}
                          data-testid={`button-edit-${item.id}`}
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
                                      <Input {...field} data-testid="input-edit-brand" />
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
                                      <Input {...field} data-testid="input-edit-size" />
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
                                      <Input {...field} data-testid="input-edit-color" />
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                                    <Textarea {...field} data-testid="input-edit-notes" />
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
                    
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleDelete(item.id, item.description)}
                      className="text-destructive hover:bg-destructive/10"
                      disabled={deleteItem.isPending}
                      data-testid={`button-delete-${item.id}`}
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
