interface AuthUser {
  name?: string;
  role?: 'admin' | 'franchisee' | 'client' | string;
  franchiseeId?: string;
  companyCnpj?: string;
}

export const useAuth = () => {
  return {
    user: {
      name: 'Usuário AI',
      role: 'admin',
    } as AuthUser,
  };
};
