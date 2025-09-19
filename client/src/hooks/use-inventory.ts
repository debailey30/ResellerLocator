import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Item, InsertItem, UpdateItem, MarkSoldData } from "@shared/schema";

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
