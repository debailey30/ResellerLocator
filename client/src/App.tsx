import { useState } from "react";
import { Switch, Route, useLocation, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import Sidebar from "@/components/layout/sidebar";
import MobileNav from "@/components/layout/mobile-nav";
import Dashboard from "@/pages/dashboard";
import AddItem from "@/pages/add-item";
import Upload from "@/pages/upload";
import Bins from "@/pages/bins";
import Export from "@/pages/export";
import NotFound from "@/pages/not-found";

const pageTitles: Record<string, string> = {
  "/": "Search Items",
  "/add-item": "Add New Item",
  "/upload": "Upload Spreadsheet",
  "/bins": "Browse Bins",
  "/export": "Export Data",
};

function AppContent() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();
  
  const pageTitle = pageTitles[location] || "Inventory Tracker";

  const closeSidebar = () => setSidebarOpen(false);
  const openSidebar = () => setSidebarOpen(true);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={closeSidebar} />
      
      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <header className="bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <MobileNav onMenuClick={openSidebar} />
            <h2 className="text-xl font-semibold text-foreground" data-testid="page-title">
              {pageTitle}
            </h2>
          </div>
          <div className="flex items-center space-x-4">
            {/* Quick Add Button - only show on non-add-item pages */}
            {location !== "/add-item" && (
              <Link href="/add-item">
                <Button 
                  className="flex items-center space-x-2"
                  data-testid="button-quick-add"
                >
                  <i className="fas fa-plus text-sm"></i>
                  <span className="hidden sm:inline">Quick Add</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/add-item" component={AddItem} />
            <Route path="/upload" component={Upload} />
            <Route path="/bins" component={Bins} />
            <Route path="/export" component={Export} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AppContent />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
