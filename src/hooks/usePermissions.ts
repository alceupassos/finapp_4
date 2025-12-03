export const usePermissions = () => {
  return {
    canView: (_permission?: string) => true,
    isAdmin: () => true,
    isFranchisee: () => false,
  };
};
