import type { GmeClient, GmeProjectRecord } from '@/types/gme-global';

export type { GmeProjectRecord };

export function listProjects(client: GmeClient): Promise<GmeProjectRecord[]> {
  return new Promise((resolve, reject) => {
    client.getProjects({ info: true, rights: true }, (err, projects) => {
      if (err) {
        reject(err);
        return;
      }
      resolve(projects ?? []);
    });
  });
}

export function createProjectFromSeed(
  client: GmeClient,
  projectName: string,
  seedName: string
): Promise<string> {
  return new Promise((resolve, reject) => {
    client.seedProject(
      {
        // WebGME defaults the seed type to 'db' (copy an existing project). Our
        // seeds (EmptyProject, StateMachine) are file seeds registered via
        // config.seedProjects.basePaths, so 'file' must be set explicitly —
        // otherwise it tries to read a DB project named `seedName` and fails
        // with "Not authorized to read project [...]".
        type: 'file',
        projectName,
        seedName,
        seedBranch: 'master'
      },
      (err, result) => {
        if (err) {
          reject(err);
          return;
        }
        resolve(result.projectId);
      }
    );
  });
}

export function selectProject(
  client: GmeClient,
  projectId: string,
  branchName = 'master'
): Promise<void> {
  return new Promise((resolve, reject) => {
    client.selectProject(projectId, branchName, (err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

export function closeProject(client: GmeClient): Promise<void> {
  return new Promise((resolve, reject) => {
    client.closeProject((err) => {
      if (err) {
        reject(err);
        return;
      }
      resolve();
    });
  });
}

/** StaMS projects are tagged with info.kind = StateMachine (or legacy untagged). */
export function filterStaMsProjects(projects: GmeProjectRecord[]): GmeProjectRecord[] {
  return projects.filter(
    (project) =>
      !project.info?.kind ||
      project.info.kind === 'StateMachine' ||
      project.info.kind.startsWith('StaMS')
  );
}

export function sortProjectsByModified(projects: GmeProjectRecord[]): GmeProjectRecord[] {
  return [...projects].sort((left, right) => {
    const leftTime = Date.parse(left.info?.modifiedAt ?? '') || 0;
    const rightTime = Date.parse(right.info?.modifiedAt ?? '') || 0;
    return rightTime - leftTime;
  });
}
