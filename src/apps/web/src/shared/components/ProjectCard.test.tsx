import { renderWithProviders, screen } from '@/tests/utils';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProjectCard } from './ProjectCard';

const mockProject = {
  id: 1,
  name: 'Test Project',
  description: 'Test project description',
  userId: 1,
  defaultProviderId: null,
  defaultPromptId: null,
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
    global.confirm = vi.fn(() => true);

    renderWithProviders(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalledWith(expect.stringContaining('Delete project'));
    expect(onDelete).toHaveBeenCalledWith(1);
  });

  it('should not call onDelete when confirmation is cancelled', async () => {
    const user = userEvent.setup();
    const onDelete = vi.fn();
    global.confirm = vi.fn(() => false);

    renderWithProviders(<ProjectCard project={mockProject} onDelete={onDelete} />);

    const deleteButton = screen.getByRole('button', { name: /delete/i });
    await user.click(deleteButton);

    expect(global.confirm).toHaveBeenCalled();
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
