import type { GmeProjectRecord } from '@/lib/gme-projects';

export type ProjectSeedTemplate = {
  id: string;
  title: string;
  description: string;
  seedName: string;
  defaultName: string;
  accent: string;
};

export const STATE_MACHINE_SEED: ProjectSeedTemplate = {
  id: 'state-machine',
  title: 'State Machine',
  description: 'Create a state machine project from the StaMS base seed.',
  seedName: 'StateMachine',
  defaultName: 'turnstile',
  accent: '#3d8fd1'
};

export function projectStudioPath(project: GmeProjectRecord): string {
  return `/studio/${encodeURIComponent(project._id)}`;
}

/**
 * WebGME project ids are owner-qualified (`<owner>+<name>`). The studio has no
 * notion of users, so display only the name portion.
 */
export function projectDisplayName(projectId: string): string {
  const separator = projectId.indexOf('+');
  return separator === -1 ? projectId : projectId.slice(separator + 1);
}
