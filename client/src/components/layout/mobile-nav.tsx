interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  return (
    <button 
      onClick={onMenuClick}
      className="lg:hidden text-muted-foreground hover:text-foreground p-2 rounded-md bg-accent/50"
      data-testid="button-mobile-menu"
      title="Open menu"
    >
      <i className="fas fa-bars text-lg"></i>
      <span className="sr-only">Open menu</span>
    </button>
  );
}
