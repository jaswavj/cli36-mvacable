export type ExpandedMenuId = string | string[] | null | undefined;

export function isExpandedMenu(expanded: ExpandedMenuId, id: string): boolean {
  return Array.isArray(expanded) ? expanded.includes(id) : expanded === id;
}

export function toggleExpandedMenus(ids: string[], id: string): string[] {
  return ids.includes(id) ? [] : [id];
}
