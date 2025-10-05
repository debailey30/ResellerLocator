import { useState } from "react";
import { useBins, useBinsWithColors, useItemsByBin, useDeleteBin, useUpdateBin, useDeleteItem, useUpdateItem, useMarkAsSold, getBinColorByName } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateItemSchema, type UpdateItem } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Pencil, DollarSign, MapPin } from "lucide-react";
import { z } from "zod";
import type { Item, Bin } from "@shared/schema";

const updateFormSchema = updateItemSchema.extend({
  price: z.string().optional(),
});

export default function Bins() {
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const [editingBin, setEditingBin] = useState<{ id: string; name: string; color: string } | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const { data: binStats = [], isLoading: isLoadingStats } = useBins();
  const { data: binsWithColors = [], isLoading: isLoadingColors } = useBinsWithColors();
  const { data: binItems = [], isLoading: isLoadingItems } = useItemsByBin(selectedBin || "");
  const deleteBin = useDeleteBin();
  const updateBin = useUpdateBin();
  const deleteItem = useDeleteItem();
  const updateItem = useUpdateItem();
  const markAsSold = useMarkAsSold();
  const { toast } = useToast();

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

  // Combine bin stats with color data and sort numerically
  const combinedBins = binStats.map(stat => {
    const binWithColor = binsWithColors.find(bin => bin.name === stat.binLocation);
    return {
      ...stat,
      color: binWithColor?.color || '#6B7280', // Default gray color if no color found
      binId: binWithColor?.id || '' // Store bin ID for deletion
    };
  }).sort((a, b) => {
    // Sort bins numerically (Bin-0, Bin-1, Bin-2, ..., Bin-30)
    const numA = parseInt(a.binLocation.replace(/\D/g, '')) || 0;
    const numB = parseInt(b.binLocation.replace(/\D/g, '')) || 0;
    return numA - numB;
  });

  const isLoading = isLoadingStats || isLoadingColors;

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

  const handleBinClick = (binLocation: string) => {
    setSelectedBin(binLocation);
  };

  const handleEditBin = (e: React.MouseEvent, binId: string, binName: string, binColor: string) => {
    e.stopPropagation(); // Prevent opening the bin dialog
    setEditingBin({ id: binId, name: binName, color: binColor });
  };

  const handleSaveBinEdit = async () => {
    if (!editingBin) return;
    
    try {
      await updateBin.mutateAsync({
        id: editingBin.id,
        data: {
          name: editingBin.name,
          color: editingBin.color,
        },
      });
      toast({
        title: "Success",
        description: `Bin updated successfully`,
      });
      setEditingBin(null);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update bin",
        variant: "destructive",
      });
    }
  };

  const handleDeleteBin = async (e: React.MouseEvent, binId: string, binName: string, itemCount: number) => {
    e.stopPropagation(); // Prevent opening the bin dialog
    
    if (itemCount > 0) {
      toast({
        title: "Cannot delete bin",
        description: `${binName} contains ${itemCount} item(s). Please move or delete all items first.`,
        variant: "destructive",
      });
      return;
    }
    
    if (window.confirm(`Are you sure you want to delete ${binName}? This action cannot be undone.`)) {
      try {
        await deleteBin.mutateAsync(binId);
        toast({
          title: "Success",
          description: `${binName} has been deleted`,
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete bin",
          variant: "destructive",
        });
      }
    }
  };

  const handleEditItem = (item: Item) => {
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

  const handleDeleteItem = async (id: string, description: string) => {
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

  const handleMarkAsSold = async (id: string, description: string) => {
    const soldPrice = prompt(`Enter the sold price for "${description}":`);
    if (soldPrice !== null) {
      try {
        await markAsSold.mutateAsync({
          id,
          soldData: { soldPrice },
        });
        toast({
          title: "Success",
          description: "Item marked as sold",
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
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    }
  };

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "1 day ago";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h3 className="text-lg font-medium text-foreground mb-2">Browse by Bins</h3>
        <p className="text-muted-foreground">View all items organized by their bin locations</p>
      </div>

      {/* Bin Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {isLoading ? (
          // Loading skeletons
          Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-4 w-16 mb-3" />
                <Skeleton className="h-3 w-full mb-2" />
                <Skeleton className="h-3 w-24" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            {combinedBins.map((bin) => (
              <Card
                key={bin.binLocation}
                className="hover:shadow-md transition-all duration-200 cursor-pointer relative overflow-hidden"
                onClick={() => handleBinClick(bin.binLocation)}
                data-testid={`card-bin-${bin.binLocation}`}
                style={{ borderLeftColor: bin.color, borderLeftWidth: '4px' }}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: bin.color }}
                        data-testid={`color-indicator-${bin.binLocation}`}
                      />
                      <h4 className="font-medium text-foreground" data-testid={`text-bin-name-${bin.binLocation}`}>
                        {bin.binLocation}
                      </h4>
                    </div>
                    <div className="flex items-center gap-2">
                      <span 
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                        data-testid={`text-bin-count-${bin.binLocation}`}
                      >
                        {bin.itemCount} items
                      </span>
                      {bin.binId && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleEditBin(e, bin.binId, bin.binLocation, bin.color)}
                            className="h-8 w-8 p-0 hover:bg-accent"
                            data-testid={`button-edit-bin-${bin.binLocation}`}
                            title={`Edit ${bin.binLocation}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleDeleteBin(e, bin.binId, bin.binLocation, bin.itemCount)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                            data-testid={`button-delete-bin-${bin.binLocation}`}
                            title={bin.itemCount > 0 ? `Cannot delete - contains ${bin.itemCount} items` : `Delete ${bin.binLocation}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`text-bin-updated-${bin.binLocation}`}>
                    Last updated: {formatLastUpdated(bin.lastUpdated.toString())}
                  </div>
                </CardContent>
              </Card>
            ))}

            {combinedBins.length === 0 && (
              <div className="col-span-full text-center py-12" data-testid="no-bins">
                <i className="fas fa-archive text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-medium text-foreground mb-2">No bins found</h3>
                <p className="text-muted-foreground">Add some items to see bins appear here</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bin Items Dialog */}
      <Dialog open={!!selectedBin} onOpenChange={() => setSelectedBin(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="dialog-bin-title">
              Items in {selectedBin}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            {isLoadingItems ? (
              // Loading skeletons for items
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="pt-4">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <div className="grid grid-cols-3 gap-2">
                      {Array.from({ length: 6 }).map((_, j) => (
                        <Skeleton key={j} className="h-3 w-full" />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : binItems.length > 0 ? (
              binItems.map((item: Item) => (
                <Card key={item.id}>
                  <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                      <div className="flex-1">
                        {item.brand && (
                          <div className="text-lg font-semibold text-foreground mb-1" data-testid={`bin-item-brand-${item.id}`}>
                            {item.brand}
                          </div>
                        )}
                        <div className="flex items-center space-x-3 mb-2">
                          <h4 className="font-medium text-foreground" data-testid={`bin-item-description-${item.id}`}>
                            {item.description}
                          </h4>
                          <span 
                            className="px-2 py-1 text-xs rounded-full flex items-center"
                            style={{
                              backgroundColor: getBinColorByName(binsWithColors, item.binLocation) || '#6B7280',
                              color: getContrastingColor(getBinColorByName(binsWithColors, item.binLocation) || '#6B7280')
                            }}
                          >
                            <MapPin className="w-3 h-3 mr-1" />
                            <span data-testid={`bin-item-bin-${item.id}`}>{item.binLocation}</span>
                          </span>
                          {item.status === "sold" && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-xs rounded-full font-medium">
                              SOLD
                              {item.soldPrice && ` - $${item.soldPrice}`}
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                          {item.size && (
                            <div><strong>Size:</strong> <span data-testid={`bin-item-size-${item.id}`}>{item.size}</span></div>
                          )}
                          {item.condition && (
                            <div><strong>Condition:</strong> <span data-testid={`bin-item-condition-${item.id}`}>{item.condition}</span></div>
                          )}
                          {item.color && (
                            <div><strong>Color:</strong> <span data-testid={`bin-item-color-${item.id}`}>{item.color}</span></div>
                          )}
                          {item.category && (
                            <div><strong>Category:</strong> <span data-testid={`bin-item-category-${item.id}`}>{item.category}</span></div>
                          )}
                          <div><strong>Added:</strong> <span data-testid={`bin-item-date-${item.id}`}>
                            {new Date(item.createdAt).toLocaleDateString()}
                          </span></div>
                        </div>
                        {item.notes && (
                          <div className="mt-2 text-sm text-muted-foreground">
                            <strong>Notes:</strong> <span data-testid={`bin-item-notes-${item.id}`}>{item.notes}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-row sm:flex-col space-x-2 sm:space-x-0 sm:space-y-2 justify-end">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => handleEditItem(item)}
                              className="min-h-[44px] min-w-[44px] flex items-center justify-center"
                              data-testid={`button-edit-item-${item.id}`}
                              title="Edit item"
                            >
                              <Pencil className="w-5 h-5" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                                        <Textarea {...field} />
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
                                        <Input {...field} />
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
                                          <Input {...field} value={field.value || ""} />
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
                                          <Input {...field} value={field.value || ""} />
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
                                          <Input {...field} value={field.value || ""} />
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
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select category" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
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
                                            <SelectTrigger>
                                              <SelectValue placeholder="Select condition" />
                                            </SelectTrigger>
                                          </FormControl>
                                          <SelectContent>
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
                                          <Input {...field} type="number" step="0.01" />
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
                                        <Textarea {...field} value={field.value || ""} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />

                                <div className="flex justify-end space-x-2">
                                  <Button 
                                    type="submit" 
                                    disabled={updateItem.isPending}
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
                            variant="outline" 
                            size="sm"
                            onClick={() => handleMarkAsSold(item.id, item.description)}
                            className="text-green-600 border-green-600 hover:bg-green-50 dark:text-green-400 dark:border-green-400 dark:hover:bg-green-900/20 min-h-[44px] gap-2"
                            disabled={markAsSold.isPending}
                            data-testid={`button-mark-sold-item-${item.id}`}
                            title="Mark as sold"
                          >
                            <DollarSign className="w-4 h-4" />
                            <span className="hidden sm:inline">Sold</span>
                          </Button>
                        )}
                        
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => handleDeleteItem(item.id, item.description)}
                          className="text-destructive hover:bg-destructive/10 min-h-[44px] min-w-[44px] flex items-center justify-center"
                          disabled={deleteItem.isPending}
                          data-testid={`button-delete-item-${item.id}`}
                          title="Delete item"
                        >
                          <Trash2 className="w-5 h-5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-8" data-testid="bin-no-items">
                <i className="fas fa-box-open text-3xl text-muted-foreground mb-3"></i>
                <p className="text-muted-foreground">No items found in this bin</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Bin Dialog */}
      <Dialog open={!!editingBin} onOpenChange={() => setEditingBin(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Bin</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="bin-name">Bin Name</Label>
              <Input
                id="bin-name"
                value={editingBin?.name || ''}
                onChange={(e) => setEditingBin(prev => prev ? { ...prev, name: e.target.value } : null)}
                placeholder="e.g., Bin-1"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bin-color">Color</Label>
              <div className="flex gap-2">
                <Input
                  id="bin-color"
                  type="color"
                  value={editingBin?.color || '#808080'}
                  onChange={(e) => setEditingBin(prev => prev ? { ...prev, color: e.target.value } : null)}
                  className="h-12 w-20 cursor-pointer"
                />
                <Input
                  value={editingBin?.color || '#808080'}
                  onChange={(e) => setEditingBin(prev => prev ? { ...prev, color: e.target.value } : null)}
                  placeholder="#808080"
                  className="flex-1"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Choose a color that helps you identify this bin
              </p>
            </div>

            <div 
              className="h-20 rounded-md border-2"
              style={{ backgroundColor: editingBin?.color || '#808080' }}
            >
              <div className="h-full flex items-center justify-center">
                <span 
                  className="text-lg font-semibold px-4 py-2 rounded"
                  style={{ 
                    color: getContrastingColor(editingBin?.color || '#808080'),
                    backgroundColor: 'rgba(0,0,0,0.1)'
                  }}
                >
                  {editingBin?.name}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditingBin(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveBinEdit} disabled={updateBin.isPending}>
              {updateBin.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
