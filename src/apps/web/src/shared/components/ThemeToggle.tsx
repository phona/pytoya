import { Moon, Sun } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useTheme } from '@/shared/providers/ThemeProvider';

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="w-full justify-start gap-2"
      onClick={toggleTheme}
      aria-label="Toggle theme"
    >
      {isDark ? <Moon /> : <Sun />}
      <span>{isDark ? 'Theme: Dark' : 'Theme: Light'}</span>
    </Button>
  );
}
