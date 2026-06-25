import { getWebGmeApiBase } from './config';

export type WebGmeProject = {
  _id: string;
  name: string;
  owner: string;
  info?: { kind?: string };
};

export async function listProjects(): Promise<WebGmeProject[]> {
  const base = getWebGmeApiBase();
  const response = await fetch(`${base}/api/projects`, {
    credentials: 'include',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Failed to list projects (${response.status})`);
  }

  return response.json();
}

export async function createProject(name: string): Promise<WebGmeProject> {
  const base = getWebGmeApiBase();
  const response = await fetch(`${base}/api/projects`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ info: { kind: 'StateMachine' }, projectName: name })
  });

  if (!response.ok) {
    throw new Error(`Failed to create project (${response.status})`);
  }

  return response.json();
}

export function projectIdToPath(projectId: string): string {
  return encodeURIComponent(projectId);
}
