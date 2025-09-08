import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useInventory } from "@/hooks/use-inventory";

const navigation = [
  { name: "Search Items", href: "/", icon: "fas fa-search" },
  { name: "Add Item", href: "/add-item", icon: "fas fa-plus" },
  { name: "Upload Spreadsheet", href: "/upload", icon: "fas fa-upload" },
  { name: "Browse Bins", href: "/bins", icon: "fas fa-archive" },
  { name: "Export Data", href: "/export", icon: "fas fa-download" },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  const [location] = useLocation();
  const { data: items = [] } = useInventory();

  const totalItems = items.length;
  const uniqueBins = new Set(items.map(item => item.binLocation)).size;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-50 w-64 bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <i className="fas fa-boxes text-primary-foreground text-sm"></i>
              </div>
              <h1 className="text-lg font-semibold text-foreground">Inventory Tracker</h1>
            </div>
            <button 
              onClick={onClose}
              className="lg:hidden text-muted-foreground hover:text-foreground"
              data-testid="button-close-mobile-nav"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          {/* Navigation Menu */}
          <nav className="flex-1 p-4 space-y-2">
            {navigation.map((item) => {
              const isActive = location === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "flex items-center space-x-3 px-3 py-2 rounded-md transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                  data-testid={`nav-${item.href === "/" ? "search" : item.href.slice(1)}`}
                >
                  <i className={`${item.icon} w-5`}></i>
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>

          {/* Footer Stats */}
          <div className="p-4 border-t border-border">
            <div className="bg-muted rounded-lg p-3">
              <div className="text-sm text-muted-foreground mb-1">Total Items</div>
              <div className="text-2xl font-semibold text-foreground" data-testid="text-total-items">
                {totalItems.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground" data-testid="text-total-bins">
                Across {uniqueBins} bins
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
