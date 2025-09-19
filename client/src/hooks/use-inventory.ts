import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Item, InsertItem, UpdateItem, MarkSoldData, Bin, InsertBin, UpdateBin } from "@shared/schema";

export function useInventory() {
  return useQuery<Item[]>({
    queryKey: ["/api/items"],
  });
}

export function useSearchItems(query: string) {
  return useQuery<Item[]>({
    queryKey: ["/api/items/search", query],
    queryFn: async () => {
      const response = await fetch(`/api/items/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      return response.json();
    },
    enabled: query.trim().length >= 0,
  });
}

export function useItemsByBin(binLocation: string) {
  return useQuery<Item[]>({
    queryKey: ["/api/items/bin", binLocation],
    enabled: !!binLocation,
  });
}

export function useBins() {
  return useQuery<Array<{ binLocation: string; itemCount: number; lastUpdated: string }>>({
    queryKey: ["/api/bins"],
  });
}

export function useCreateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (item: InsertItem) => {
      const response = await apiRequest("POST", "/api/items", item);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
    },
  });
}

export function useUpdateItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateItem }) => {
      const response = await apiRequest("PATCH", `/api/items/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/items/search" || query.queryKey[0] === "/api/items/bin"
      });
    },
  });
}

export function useDeleteItem() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/items/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/items/search" || query.queryKey[0] === "/api/items/bin"
      });
    },
  });
}

export function useMarkAsSold() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, soldData }: { id: string; soldData: MarkSoldData }) => {
      const response = await apiRequest("PATCH", `/api/items/${id}/sold`, soldData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/items/search" || query.queryKey[0] === "/api/items/bin"
      });
    },
  });
}

export function useUploadCSV() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('csv', file);
      
      const response = await fetch('/api/items/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        throw new Error('Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
    },
  });
}

// Bin management hooks
export function useBinsWithColors() {
  return useQuery<Bin[]>({
    queryKey: ["/api/bins/list"],
  });
}

export function useBinByName(name: string) {
  return useQuery<Bin | undefined>({
    queryKey: ["/api/bins/list", "by-name", name],
    queryFn: async () => {
      const response = await fetch("/api/bins/list");
      if (!response.ok) throw new Error('Failed to fetch bins');
      const bins: Bin[] = await response.json();
      return bins.find(bin => bin.name === name);
    },
    enabled: !!name,
  });
}

export function useCreateBin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (bin: InsertBin) => {
      const response = await apiRequest("POST", "/api/bins", bin);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bins/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
    },
  });
}

export function useUpdateBin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBin }) => {
      const response = await apiRequest("PATCH", `/api/bins/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bins/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
      // Also invalidate by-name queries since bin names might change
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/bins/list" && query.queryKey[1] === "by-name"
      });
    },
  });
}

export function useDeleteBin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/bins/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bins/list"] });
      queryClient.invalidateQueries({ queryKey: ["/api/bins"] });
      // Invalidate by-name queries since bins might be deleted
      queryClient.invalidateQueries({ predicate: (query) => 
        query.queryKey[0] === "/api/bins/list" && query.queryKey[1] === "by-name"
      });
    },
  });
}

// Utility function to get bin color by name
export function getBinColorByName(bins: Bin[], name: string): string | undefined {
  const bin = bins.find(bin => bin.name === name);
  return bin?.color;
}
