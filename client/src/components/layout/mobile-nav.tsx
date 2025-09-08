interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  return (
    <button 
      onClick={onMenuClick}
      className="lg:hidden text-muted-foreground hover:text-foreground"
      data-testid="button-mobile-menu"
    >
      <i className="fas fa-bars"></i>
    </button>
  );
}
