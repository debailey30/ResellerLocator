interface MobileNavProps {
  onMenuClick: () => void;
}

export default function MobileNav({ onMenuClick }: MobileNavProps) {
  return (
    <button 
      onClick={onMenuClick}
      className="lg:hidden text-black hover:text-primary p-3 rounded-lg bg-background border border-border hover:bg-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      data-testid="button-mobile-menu"
      title="Open navigation menu"
      aria-label="Open navigation menu"
    >
      <i className="fas fa-bars text-xl text-black"></i>
      <span className="sr-only">Open navigation menu</span>
    </button>
  );
}
