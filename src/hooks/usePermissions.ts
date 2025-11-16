import { useAuth } from './useAuth';

export const usePermissions = () => {
  const { user, checkPermission } = useAuth();

  const canView = (permission: string): boolean => {
    return checkPermission(permission);
  };

  const canEdit = (permission: string): boolean => {
    return checkPermission(permission.replace('view_', 'edit_'));
  };

  const canCreate = (permission: string): boolean => {
    return checkPermission(permission.replace('view_', 'create_'));
  };

  const canDelete = (permission: string): boolean => {
    return checkPermission(permission.replace('view_', 'delete_'));
  };

  const canManage = (permission: string): boolean => {
    return checkPermission(permission.replace('view_', 'manage_'));
  };

  const hasRole = (role: string): boolean => {
    return user?.role === role;
  };

  const isAdmin = (): boolean => {
    return user?.role === 'admin';
  };

  const isFranchisee = (): boolean => {
    return user?.role === 'franchisee';
  };

  const isClient = (): boolean => {
    return user?.role === 'client';
  };

  const getUserData = () => {
    return {
      id: user?.id,
      name: user?.name,
      email: user?.email,
      role: user?.role,
      companyCnpj: user?.companyCnpj,
      franchiseeId: user?.franchiseeId
    };
  };

  return {
    canView,
    canEdit,
    canCreate,
    canDelete,
    canManage,
    hasRole,
    isAdmin,
    isFranchisee,
    isClient,
    getUserData,
    userRole: user?.role
  };
};