import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Company {
  id: string;
  name: string;
  cnpj: string;
  franchiseeId?: string;
  status: 'active' | 'inactive';
}

interface CompanyFilterState {
  selectedCompany: Company | null;
  viewMode: 'single' | 'grouped';
  availableCompanies: Company[];
  setSelectedCompany: (company: Company | null) => void;
  setViewMode: (mode: 'single' | 'grouped') => void;
  setAvailableCompanies: (companies: Company[]) => void;
  clearSelection: () => void;
}

// Mock companies data
const mockCompanies: Company[] = [
  {
    id: '1',
    name: 'Empresa ABC Ltda',
    cnpj: '12.345.678/0001-90',
    franchiseeId: 'F001',
    status: 'active'
  },
  {
    id: '2',
    name: 'XYZ Comércio S.A.',
    cnpj: '98.765.432/0001-10',
    franchiseeId: 'F001',
    status: 'active'
  },
  {
    id: '3',
    name: 'Mega Industrias ME',
    cnpj: '11.223.344/0001-55',
    franchiseeId: 'F002',
    status: 'active'
  },
  {
    id: '4',
    name: 'Super Serviços EIRELI',
    cnpj: '44.332.211/0001-77',
    franchiseeId: 'F002',
    status: 'inactive'
  },
  {
    id: '5',
    name: 'Global Tech Solutions',
    cnpj: '55.667.788/0001-33',
    franchiseeId: 'F003',
    status: 'active'
  }
];

export const useCompanyFilter = create<CompanyFilterState>()(
  persist(
    (set, get) => ({
      selectedCompany: null,
      viewMode: 'grouped',
      availableCompanies: mockCompanies,
      
      setSelectedCompany: (company) => {
        set({ selectedCompany: company });
      },
      
      setViewMode: (mode) => {
        set({ viewMode: mode });
        if (mode === 'grouped') {
          set({ selectedCompany: null });
        }
      },
      
      setAvailableCompanies: (companies) => {
        set({ availableCompanies: companies });
      },
      
      clearSelection: () => {
        set({ selectedCompany: null, viewMode: 'grouped' });
      }
    }),
    {
      name: 'company-filter-storage',
      partialize: (state) => ({
        selectedCompany: state.selectedCompany,
        viewMode: state.viewMode
      })
    }
  )
);