export type UserRole = 'viewer' | 'instructor' | 'admin';
export interface User { role: UserRole; }
export interface RolePermissions { canViewTests: boolean; canTakeTests: boolean; canManageTests: boolean; canManageQuestions: boolean; canViewResults: boolean; canAccessAdmin: boolean; }
export const ROLE_PERMISSIONS: Record<UserRole, RolePermissions> = {
  viewer: { canViewTests: true, canTakeTests: true, canManageTests: false, canManageQuestions: false, canViewResults: false, canAccessAdmin: false },
  instructor: { canViewTests: true, canTakeTests: true, canManageTests: true, canManageQuestions: true, canViewResults: true, canAccessAdmin: false },
  admin: { canViewTests: true, canTakeTests: true, canManageTests: true, canManageQuestions: true, canViewResults: true, canAccessAdmin: true },
};
