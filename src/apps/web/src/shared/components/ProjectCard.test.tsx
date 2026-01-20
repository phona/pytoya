import { renderWithProviders, screen, waitFor, within } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProjectCard } from './ProjectCard';

const mockProject = {
  id: 1,
  name: 'Test Project',
  description: 'Test project description',
  ownerId: 1,
  userId: 1,
  textExtractorId: 'extractor-1',
  llmModelId: 'llm-1',
  defaultSchemaId: null,
  createdAt: '2025-01-13T00:00:00.000Z',
  updatedAt: '2025-01-13T00:00:00.000Z',
  _count: {
    groups: 2,
    manifests: 5,
  },
};

describe('ProjectCard', () => {
  it('should render project information', () => {
    renderWithProviders(<ProjectCard project={mockProject} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    expect(screen.getByText('Test project description')).toBeInTheDocument();
    expect(screen.getByText(/2 groups/i)).toBeInTheDocument();
    expect(screen.getByText(/5 manifests/i)).toBeInTheDocument();
  });

  it('should not show edit button when onEdit is not provided', () => {
    renderWithProviders(<ProjectCard project={mockProject} />);

    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
  });

  it('should not show delete button when onDelete is not provided', () => {
    renderWithProviders(<ProjectCard project={mockProject} />);

    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument();
  });

  it('should call onEdit when edit button is clicked', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();

    renderWithProviders(<ProjectCard project={mockProject} onEdit={onEdit} />);

    const editButton = screen.getByRole('button', { name: /edit/i });
    await user.click(editButton);

    expect(onEdit).toHaveBeenCalledWith(mockProject);
  });

  it('should call onDelete after confirmation', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    renderWithProviders(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Delete$/i }));

    await waitFor(() => {
      expect(onDelete).toHaveBeenCalledWith(1);
    });
  });

  it('should not call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();

    renderWithProviders(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    const dialog = await screen.findByRole('dialog');
    await user.click(within(dialog).getByRole('button', { name: /^Cancel$/i }));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('should handle project without description', () => {
    const projectWithoutDescription = { ...mockProject, description: null };

    renderWithProviders(<ProjectCard project={projectWithoutDescription} />);

    expect(screen.getByText('Test Project')).toBeInTheDocument();
    // Description should not be shown
    expect(screen.queryByText('Test project description')).not.toBeInTheDocument();
  });
});




