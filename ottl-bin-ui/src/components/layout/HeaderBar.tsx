import { Fragment } from 'react';
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
import { FolderOutput, Layout, Network } from 'lucide-react';

interface HeaderBarProps {
  onTemplateClick?: () => void;
  onWorkspaceExport?: () => void;
  userName?: string;
  userAvatar?: string;
  connections?: ConnectionGroup[];
  onConnectMicroservice?: (serviceId: string) => void;
}

export interface ConnectionGroup {
  team: string;
  microservices: {
    id: string;
    name: string;
    environment: string;
    summary?: string;
  }[];
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
  connections,
  onConnectMicroservice,
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
          <Dropdown placement="bottom-end">
            <DropdownTrigger>
              <Button
                variant="bordered"
                startContent={<Network size={18} />}
                className="border border-primary/40 bg-primary/15 text-text-primary"
              >
                Connect
              </Button>
            </DropdownTrigger>
            <DropdownMenu
              aria-label="Connect to a microservice"
              className="bg-surface-soft/95 text-text-primary border border-border/60 min-w-[260px]"
              selectionMode="single"
              onAction={(key) => {
                const value = key.toString();
                if (value.startsWith('service:')) {
                  onConnectMicroservice?.(value.replace('service:', ''));
                }
              }}
            >
              {connections && connections.length > 0 ? (
                connections.map((group, index) => (
                  <Fragment key={group.team}>
                    <DropdownItem
                      key={`header:${group.team}`}
                      isReadOnly
                      className="pointer-events-none text-[11px] uppercase tracking-wide text-text-secondary/70"
                    >
                      {group.team}
                    </DropdownItem>
                    {group.microservices.map((service) => (
                      <DropdownItem
                        key={`service:${service.id}`}
                        className="py-3"
                        description={
                          [service.environment, service.summary]
                            .filter(Boolean)
                            .join(' • ')
                        }
                      >
                        {service.name}
                      </DropdownItem>
                    ))}
                    {index < connections.length - 1 && (
                      <DropdownItem
                        key={`divider:${group.team}`}
                        isReadOnly
                        className="pointer-events-none h-px my-1 bg-border/60"
                      />
                    )}
                  </Fragment>
                ))
              ) : (
                <DropdownItem key="placeholder" isReadOnly className="pointer-events-none text-text-secondary">
                  No microservices configured yet
                </DropdownItem>
              )}
            </DropdownMenu>
          </Dropdown>
        </NavbarItem>
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
