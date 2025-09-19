interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  return (
    <button 
      onClick={onMenuClick}
      className="lg:hidden text-foreground hover:text-primary p-3 rounded-lg bg-background border border-border hover:bg-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
      data-testid="button-mobile-menu"
      title="Open navigation menu"
    >
      <i className="fas fa-bars text-xl"></i>
      <span className="sr-only">Open navigation menu</span>
    </button>
  );
}
