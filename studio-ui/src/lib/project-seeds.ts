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
