import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';

describe('UI primitive mock contracts', () => {
  let errorSpy: { mockRestore: () => void };

  beforeEach(() => {
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    errorSpy.mockRestore();
  });

  describe('tooltip', () => {
    it('throws when Tooltip is used without TooltipProvider', () => {
      expect(() =>
        render(
          <Tooltip>
            <TooltipTrigger>trigger</TooltipTrigger>
            <TooltipContent>content</TooltipContent>
          </Tooltip>,
        ),
      ).toThrow('`Tooltip` must be used within `TooltipProvider`');
    });

    it('renders when wrapped in TooltipProvider', () => {
      render(
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>trigger</TooltipTrigger>
            <TooltipContent>content</TooltipContent>
          </Tooltip>
        </TooltipProvider>,
      );
      expect(screen.getByText('trigger')).toBeInTheDocument();
      expect(screen.getByText('content')).toBeInTheDocument();
    });
  });

  describe('dropdown-menu', () => {
    it('throws when DropdownMenuTrigger is used without DropdownMenu', () => {
      expect(() => render(<DropdownMenuTrigger>trigger</DropdownMenuTrigger>)).toThrow(
        '`DropdownMenuTrigger` must be used within `DropdownMenu`',
      );
    });

    it('throws when DropdownMenuContent is used without DropdownMenu', () => {
      expect(() => render(<DropdownMenuContent>content</DropdownMenuContent>)).toThrow(
        '`DropdownMenuContent` must be used within `DropdownMenu`',
      );
    });

    it('throws when DropdownMenuItem is used outside DropdownMenuContent', () => {
      expect(() =>
        render(
          <DropdownMenu>
            <DropdownMenuItem>item</DropdownMenuItem>
          </DropdownMenu>,
        ),
      ).toThrow('`DropdownMenuItem` must be used within `DropdownMenuContent`');
    });

    it('throws when DropdownMenuRadioItem is used outside DropdownMenuRadioGroup', () => {
      expect(() =>
        render(
          <DropdownMenu>
            <DropdownMenuContent>
              <DropdownMenuRadioItem value="a">option</DropdownMenuRadioItem>
            </DropdownMenuContent>
          </DropdownMenu>,
        ),
      ).toThrow('`DropdownMenuRadioItem` must be used within `DropdownMenuRadioGroup`');
    });

    it('renders a correctly composed menu and preserves interaction semantics', () => {
      const onSelect = vi.fn();
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>open</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={onSelect}>action</DropdownMenuItem>
            <DropdownMenuItem onClick={onSelect} disabled>
              blocked
            </DropdownMenuItem>
            <DropdownMenuRadioGroup>
              <DropdownMenuRadioItem value="a">option</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>,
      );

      expect(screen.getByRole('menu')).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'action' })).toBeInTheDocument();

      fireEvent.click(screen.getByRole('menuitem', { name: 'action' }));
      expect(onSelect).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByRole('menuitem', { name: 'blocked' }));
      expect(onSelect).toHaveBeenCalledTimes(1);
    });
  });
});
