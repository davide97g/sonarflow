import { Button } from "@/components/ui/button";
import { Github, Linkedin, Menu, Plug, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "./ThemeToggle";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { name: "Home", path: "/" },
    { name: "Get Started", path: "/get-started" },
    { name: "Docs", path: "/docs" },
    { name: "Contribute", path: "/contribute" },
    { name: "FAQ", path: "/faq" },
    { name: "Contact", path: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link to="/" className="flex items-center space-x-2">
          <img
            src="/logo.svg"
            alt="Sonarflow"
            className="h-8 w-8"
            aria-label="Sonarflow logo"
          />
          <span className="text-xl font-bold">Sonarflow</span>
        </Link>

        <div className="hidden md:flex items-center space-x-1">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path}>
              <Button
                variant={isActive(item.path) ? "secondary" : "ghost"}
                size="sm"
                className="text-sm"
              >
                {item.name}
              </Button>
            </Link>
          ))}
          <Link to="/mcp">
            <Button
              variant={isActive("/mcp") ? "secondary" : "default"}
              size="sm"
              className="text-sm gap-1.5"
            >
              <Plug className="h-4 w-4" aria-hidden />
              MCP
            </Button>
          </Link>
          <a
            href="https://github.com/davide97g/sonarflow"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="GitHub repository"
          >
            <Button variant="ghost" size="sm">
              <Github className="h-4 w-4" />
            </Button>
          </a>
          <a
            href="https://www.linkedin.com/in/davide-ghiotto/"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="LinkedIn profile"
          >
            <Button variant="ghost" size="sm">
              <Linkedin className="h-4 w-4" />
            </Button>
          </a>
          <ThemeToggle />
        </div>

        <button
          type="button"
          className="md:hidden p-2"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isOpen && (
        <div className="md:hidden border-t border-border/40 bg-background">
          <div className="container py-4 space-y-2 px-4">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                onClick={() => setIsOpen(false)}
              >
                <Button
                  variant={isActive(item.path) ? "secondary" : "ghost"}
                  size="sm"
                  className="w-full justify-start"
                >
                  {item.name}
                </Button>
              </Link>
            ))}
            <Link to="/mcp" onClick={() => setIsOpen(false)}>
              <Button
                variant={isActive("/mcp") ? "secondary" : "default"}
                size="sm"
                className="w-full justify-start gap-2"
              >
                <Plug className="h-4 w-4" aria-hidden />
                MCP
              </Button>
            </Link>
            <a
              href="https://github.com/davide97g/sonarflow"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Github className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </a>
            <a
              href="https://www.linkedin.com/in/davide-ghiotto/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start"
              >
                <Linkedin className="h-4 w-4 mr-2" />
                LinkedIn
              </Button>
            </a>
            <div className="flex justify-start pt-2">
              <ThemeToggle />
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
