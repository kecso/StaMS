import type { GmeProjectRecord } from '@/lib/gme-projects';

export type ProjectSeedTemplate = {
  id: string;
  title: string;
  description: string;
  seedName: string;
  defaultName: string;
  accent: string;
};

export const PROJECT_SEED_TEMPLATES: ProjectSeedTemplate[] = [
  {
    id: 'empty',
    title: 'Empty Project',
    description: 'Start from WebGME EmptyProject, then run BuildMetaModel to create the StaMS meta-model.',
    seedName: 'EmptyProject',
    defaultName: 'my_state_machine',
    accent: '#1f4b7a'
  },
  {
    id: 'state-machine',
    title: 'State Machine Seed',
    description: 'Project seeded with the StaMS meta-model (once StateMachine.webgmex is exported).',
    seedName: 'StateMachine',
    defaultName: 'turnstile_studio',
    accent: '#3d8fd1'
  }
];

export function projectStudioPath(project: GmeProjectRecord): string {
  return `/studio/${encodeURIComponent(project._id)}`;
}
