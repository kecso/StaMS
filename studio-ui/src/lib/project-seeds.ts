export type ProjectSeedTemplate = {
  id: string;
  title: string;
  description: string;
  seedName: string;
  defaultName: string;
  accent: string;
};

export const WORKSPACE_SEED: ProjectSeedTemplate = {
  id: 'workspace',
  title: 'State Machine',
  description: 'In-memory StaMS workspace (StateMachine seed with full meta-model).',
  seedName: 'StateMachine',
  defaultName: 'machine',
  accent: '#3d8fd1'
};

/** @deprecated Use WORKSPACE_SEED */
export const STATE_MACHINE_SEED = WORKSPACE_SEED;
