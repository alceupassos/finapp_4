import React from 'react';
import { Select, SelectItem, Card, Title, Text, Badge } from '@tremor/react';
import { Building2, Users, Eye, BarChart3 } from 'lucide-react';
import { useCompanyFilter } from '../hooks/useCompanyFilter';
import { useAuth } from '../hooks/useAuth';
import { motion } from 'framer-motion';

export const CompanyFilter: React.FC = () => {
  const { user } = useAuth();
  const { selectedCompany, viewMode, availableCompanies, setSelectedCompany, setViewMode } = useCompanyFilter();

  // Filtrar empresas baseado no role do usuário
  const getFilteredCompanies = () => {
    if (user?.role === 'admin') {
      return availableCompanies;
    } else if (user?.role === 'franchisee') {
      return availableCompanies.filter(company => company.franchiseeId === user.franchiseeId);
    } else if (user?.role === 'client') {
      return availableCompanies.filter(company => company.cnpj === user.companyCnpj);
    }
    return [];
  };

  const filteredCompanies = getFilteredCompanies();
  const activeCompanies = filteredCompanies.filter(company => company.status === 'active');

  const handleCompanyChange = (value: string) => {
    if (value === 'all') {
      setViewMode('grouped');
      setSelectedCompany(null);
    } else {
      const company = filteredCompanies.find(c => c.id === value);
      if (company) {
        setSelectedCompany(company);
        setViewMode('single');
      }
    }
  };

  const handleViewModeChange = (mode: 'single' | 'grouped') => {
    setViewMode(mode);
    if (mode === 'grouped') {
      setSelectedCompany(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Building2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Title className="text-lg">Filtro de Empresas</Title>
              <Text className="text-sm text-gray-600 dark:text-gray-400">
                Selecione uma empresa específica ou visualize todas
              </Text>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* View Mode Toggle */}
            <div className="flex bg-white dark:bg-gray-800 rounded-lg p-1 border border-gray-200 dark:border-gray-600">
              <button
                onClick={() => handleViewModeChange('grouped')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'grouped'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Agrupado
              </button>
              <button
                onClick={() => handleViewModeChange('single')}
                className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'single'
                    ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Eye className="h-4 w-4" />
                Individual
              </button>
            </div>

            {/* Company Select */}
            <Select
              value={selectedCompany?.id || 'all'}
              onValueChange={handleCompanyChange}
              disabled={viewMode === 'grouped'}
              className="min-w-64"
            >
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>Todas as Empresas</span>
                  <Badge color="blue" size="xs">{activeCompanies.length}</Badge>
                </div>
              </SelectItem>
              {filteredCompanies.map((company) => (
                <SelectItem key={company.id} value={company.id}>
                  <div className="flex items-center justify-between w-full">
                    <div className="flex flex-col">
                      <span className="font-medium">{company.name}</span>
                      <span className="text-xs text-gray-500">{company.cnpj}</span>
                    </div>
                    <Badge 
                      color={company.status === 'active' ? 'green' : 'gray'} 
                      size="xs"
                    >
                      {company.status === 'active' ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </div>
                </SelectItem>
              ))}
            </Select>
          </div>
        </div>

        {/* Status Bar */}
        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <Text className="text-gray-600 dark:text-gray-400">
                  {activeCompanies.length} Empresas Ativas
                </Text>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                <Text className="text-gray-600 dark:text-gray-400">
                  Modo: {viewMode === 'grouped' ? 'Agrupado' : 'Individual'}
                </Text>
              </div>
            </div>
            {selectedCompany && (
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-500" />
                <Text className="font-medium text-blue-600 dark:text-blue-400">
                  Visualizando: {selectedCompany.name}
                </Text>
              </div>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};