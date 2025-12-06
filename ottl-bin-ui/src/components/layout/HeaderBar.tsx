import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Link,
  Button,
} from '@heroui/react';
import { Github, BookOpen, Download } from 'lucide-react';

interface HeaderBarProps {
  onExport?: () => void;
  showExport?: boolean;
}

/**
 * HeaderBar - Top navigation bar
 * Contains logo, export button, and documentation links
 */
export function HeaderBar({ onExport, showExport = false }: HeaderBarProps) {

  return (
    <Navbar
      maxWidth="full"
      className="bg-surface/95 backdrop-blur border-b border-border/70 text-text-primary shadow-lg/20"
      height="64px"
    >
      <NavbarBrand>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-primary/15 border border-primary/40 rounded-xl flex items-center justify-center">
            <span className="text-primary font-bold text-lg drop-shadow-sm">O</span>
          </div>
          <div>
            <p className="font-semibold text-lg leading-none">OTTL.bin</p>
            <p className="text-xs text-text-secondary/80">Observability Transformation Studio</p>
          </div>
        </div>
      </NavbarBrand>

      <NavbarContent justify="end" className="gap-2 sm:gap-4 text-sm">
        {/* Export Button */}
        {showExport && onExport && (
          <NavbarItem>
            <Button
              size="sm"
              color="primary"
              startContent={<Download size={16} />}
              onPress={onExport}
              className="font-medium"
            >
              <span className="hidden sm:inline">Export OTTL</span>
              <span className="sm:hidden">Export</span>
            </Button>
          </NavbarItem>
        )}
        <NavbarItem>
          <Link
            href="https://opentelemetry.io/docs/collector/transforming-telemetry/"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <BookOpen size={18} />
            <span className="hidden sm:inline">OTTL Docs</span>
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link
            href="https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors"
          >
            <Github size={18} />
            <span className="hidden sm:inline">GitHub</span>
          </Link>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
