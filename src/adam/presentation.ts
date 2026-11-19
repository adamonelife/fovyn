export type Presentation = { forest: boolean; social: boolean; ai: false };
export const adamPresentation: Presentation = Object.freeze({ forest: false, social: false, ai: false });
export const legacyPresentation: Presentation = Object.freeze({ forest: true, social: true, ai: false });
export const workspaces = ['Today', 'My Plan', 'Health', 'Money', 'Projects', 'Life', 'Review', 'Settings'] as const;
export type Workspace = typeof workspaces[number];
// Presentation choices never delete records, toggle database jobs or change RLS.
export function availableWorkspaces(config: Presentation) {
  return [...workspaces, ...(config.forest ? ['Forest'] : []), ...(config.social ? ['Social'] : [])];
}
