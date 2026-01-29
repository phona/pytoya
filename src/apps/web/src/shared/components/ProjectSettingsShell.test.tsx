import { act, renderWithProviders, screen } from '@/tests/utils';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '@/tests/mocks/server';
import { ProjectSettingsShell } from './ProjectSettingsShell';

describe('ProjectSettingsShell', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' });
  });

  afterEach(() => {
    server.resetHandlers();
  });

  afterAll(() => {
    server.close();
  });

  it('disables Rules tab when schema has no fields', async () => {
    server.use(
      http.get('/api/projects/1', () => HttpResponse.json({ id: 1, name: 'Project' })),
      http.get('/api/schemas/project/1', () => HttpResponse.json([{
        id: 1,
        name: 'Empty Schema',
        jsonSchema: { type: 'object', properties: {}, required: [] },
        requiredFields: [],
        projectId: 1,
        description: null,
        systemPromptTemplate: null,
        validationSettings: null,
        createdAt: '2025-01-13T00:00:00.000Z',
        updatedAt: '2025-01-13T00:00:00.000Z',
      }])),
    );

    await act(async () => {
      renderWithProviders(
        <ProjectSettingsShell projectId={1} activeTab="basic">
          <div>Child</div>
        </ProjectSettingsShell>,
        { route: '/projects/1/settings/basic' },
      );
    });

    const rulesTab = await screen.findByRole('tab', { name: 'Rules' });
    expect(rulesTab).toBeDisabled();
  });
});

