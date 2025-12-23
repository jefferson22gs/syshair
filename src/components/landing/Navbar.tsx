import { useState } from "react";
import { Link } from "react-router-dom";
import { Logo } from "@/components/icons/Logo";
import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";

const navLinks = [
  { label: "Funcionalidades", href: "#features" },
  { label: "Preços", href: "#pricing" },
  { label: "Sobre", href: "#about" },
  { label: "Contato", href: "#contact" },
];

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
      <div className="container px-4">
        <div className="flex items-center justify-between h-16 md:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <Logo size="sm" />
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button variant="gold">Começar grátis</Button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden p-2 text-foreground"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-background border-b border-border">
          <div className="container px-4 py-6 space-y-4">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="block text-lg font-medium text-foreground py-2"
                onClick={() => setIsOpen(false)}
              >
                {link.label}
              </a>
            ))}
            <div className="pt-4 space-y-3">
              <Link to="/login" className="block">
                <Button variant="outline" className="w-full">Entrar</Button>
              </Link>
              <Link to="/register" className="block">
                <Button variant="gold" className="w-full">Começar grátis</Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};
