import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

describe('Tabs', () => {
  it('switches visible content when a tab is selected', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="first">
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First content</TabsContent>
        <TabsContent value="second">Second content</TabsContent>
      </Tabs>,
    );

    expect(screen.getByText('First content')).toBeVisible();

    await act(async () => {
      await user.click(screen.getByRole('tab', { name: 'Second' }));
    });

    expect(screen.getByText('Second content')).toBeVisible();
  });

  it('supports arrow key navigation between tabs', async () => {
    const user = userEvent.setup();

    render(
      <Tabs defaultValue="first">
        <TabsList>
          <TabsTrigger value="first">First</TabsTrigger>
          <TabsTrigger value="second">Second</TabsTrigger>
        </TabsList>
        <TabsContent value="first">First content</TabsContent>
        <TabsContent value="second">Second content</TabsContent>
      </Tabs>,
    );

    const firstTab = screen.getByRole('tab', { name: 'First' });
    firstTab.focus();
    expect(firstTab).toHaveFocus();

    await act(async () => {
      await user.keyboard('{ArrowRight}');
    });

    const secondTab = screen.getByRole('tab', { name: 'Second' });
    expect(secondTab).toHaveAttribute('data-state', 'active');
    expect(screen.getByText('Second content')).toBeVisible();
  });
});




