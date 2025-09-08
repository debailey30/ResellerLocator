import { useState } from "react";
import { useBins, useItemsByBin } from "@/hooks/use-inventory";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import type { Item } from "@shared/schema";

export default function Bins() {
  const [selectedBin, setSelectedBin] = useState<string | null>(null);
  const { data: bins = [], isLoading } = useBins();
  const { data: binItems = [], isLoading: isLoadingItems } = useItemsByBin(selectedBin || "");

  const handleBinClick = (binLocation: string) => {
    setSelectedBin(binLocation);
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
            {bins.map((bin) => (
              <Card
                key={bin.binLocation}
                className="hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => handleBinClick(bin.binLocation)}
                data-testid={`card-bin-${bin.binLocation}`}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-foreground" data-testid={`text-bin-name-${bin.binLocation}`}>
                      {bin.binLocation}
                    </h4>
                    <span 
                      className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-full"
                      data-testid={`text-bin-count-${bin.binLocation}`}
                    >
                      {bin.itemCount} items
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground" data-testid={`text-bin-updated-${bin.binLocation}`}>
                    Last updated: {formatLastUpdated(bin.lastUpdated.toString())}
                  </div>
                </CardContent>
              </Card>
            ))}

            {bins.length === 0 && (
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
                    <h4 className="font-medium text-foreground mb-2" data-testid={`bin-item-description-${item.id}`}>
                      {item.description}
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                      {item.brand && (
                        <div><strong>Brand:</strong> <span data-testid={`bin-item-brand-${item.id}`}>{item.brand}</span></div>
                      )}
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
    </div>
  );
}
