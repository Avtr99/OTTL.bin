import {
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
  Button,
  Dropdown,
  DropdownTrigger,
  DropdownMenu,
  DropdownItem,
  Avatar,
} from '@heroui/react';
import { FolderOutput, Layout } from 'lucide-react';

interface HeaderBarProps {
  onTemplateClick?: () => void;
  onWorkspaceExport?: () => void;
  userName?: string;
  userAvatar?: string;
}

/**
 * HeaderBar - Top navigation bar
 * Contains logo, templates, export, and user menu
 */
export function HeaderBar({
  onTemplateClick,
  onWorkspaceExport,
  userName = 'User',
  userAvatar,
}: HeaderBarProps) {
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

      <NavbarContent justify="end" className="gap-3 text-sm">
        <NavbarItem>
          <Button
            color="primary"
            variant="flat"
            startContent={<Layout size={18} />}
            onPress={onTemplateClick}
            className="bg-primary/20 border border-primary/40 text-text-primary"
          >
            Templates
          </Button>
        </NavbarItem>
        
        <NavbarItem>
          <Button
            color="secondary"
            variant="flat"
            startContent={<FolderOutput size={18} />}
            onPress={onWorkspaceExport}
            className="bg-secondary/20 border border-secondary/40 text-text-primary"
          >
            Export Workspace
          </Button>
        </NavbarItem>

        <NavbarItem>
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Avatar
                as="button"
                size="sm"
                src={userAvatar}
                name={userName}
                className="cursor-pointer border border-border/70"
              />
            </DropdownTrigger>
            <DropdownMenu aria-label="User menu" className="bg-surface-soft/95 text-text-primary border border-border/60">
              <DropdownItem key="profile" className="text-text-primary">
                Profile
              </DropdownItem>
              <DropdownItem key="settings" className="text-text-primary">
                Settings
              </DropdownItem>
              <DropdownItem key="help" className="text-text-primary">
                Help & Documentation
              </DropdownItem>
              <DropdownItem key="logout" color="danger">
                Logout
              </DropdownItem>
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}
