import { useState, useEffect } from 'react'
import { Users, Plus, Edit2, Trash2, Key, Building2, Eye, EyeOff, Search, Save, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { SupabaseRest } from '../services/supabaseRest'

interface User {
  id: string
  name: string
  email: string
  role: 'admin' | 'franqueado' | 'cliente' | 'personalizado'
  active: boolean
  created_at: string
  allowed_companies: string[] // CNPJs permitidos
  password?: string // apenas para criação/edição
}

interface Company {
  cnpj: string
  cliente_nome: string
  grupo_empresarial: string
}

export function UserManagementTab() {
  const [users, setUsers] = useState<User[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      // Carregar empresas
      const companiesData = await SupabaseRest.getCompanies()
      setCompanies(companiesData)

      // Carregar usuários (simulado - implementar endpoint real)
      const usersData = await loadUsers()
      setUsers(usersData)
    } catch (error) {
      console.error('Erro ao carregar dados:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadUsers = async (): Promise<User[]> => {
    // TODO: Implementar endpoint real no Supabase
    // Por enquanto, retorna dados mockados
    return [
      {
        id: '1',
        name: 'Admin Sistema',
        email: 'admin@volpe.com.br',
        role: 'admin',
        active: true,
        created_at: '2025-01-01T00:00:00Z',
        allowed_companies: []
      },
      {
        id: '2',
        name: 'João Silva',
        email: 'joao@volpe.com.br',
        role: 'franqueado',
        active: true,
        created_at: '2025-02-15T00:00:00Z',
        allowed_companies: ['26888098000159', '26888098000240']
      },
      {
        id: '3',
        name: 'Maria Santos',
        email: 'maria@cliente.com.br',
        role: 'cliente',
        active: true,
        created_at: '2025-03-20T00:00:00Z',
        allowed_companies: ['26888098000159']
      }
    ]
  }

  const handleCreateUser = () => {
    setEditingUser({
      id: '',
      name: '',
      email: '',
      role: 'cliente',
      active: true,
      created_at: new Date().toISOString(),
      allowed_companies: [],
      password: ''
    })
    setIsCreating(true)
  }

  const handleSaveUser = async () => {
    if (!editingUser) return

    try {
      if (isCreating) {
        // TODO: Implementar criação no Supabase
        const newUser = { ...editingUser, id: Date.now().toString() }
        setUsers([...users, newUser])
      } else {
        // TODO: Implementar atualização no Supabase
        setUsers(users.map(u => u.id === editingUser.id ? editingUser : u))
      }
      setEditingUser(null)
      setIsCreating(false)
    } catch (error) {
      console.error('Erro ao salvar usuário:', error)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja excluir este usuário?')) return

    try {
      // TODO: Implementar exclusão no Supabase
      setUsers(users.filter(u => u.id !== userId))
    } catch (error) {
      console.error('Erro ao excluir usuário:', error)
    }
  }

  const handleToggleActive = async (userId: string) => {
    try {
      // TODO: Implementar toggle no Supabase
      setUsers(users.map(u => 
        u.id === userId ? { ...u, active: !u.active } : u
      ))
    } catch (error) {
      console.error('Erro ao alterar status:', error)
    }
  }

  const handleToggleCompany = (cnpj: string) => {
    if (!editingUser) return

    const allowed = editingUser.allowed_companies.includes(cnpj)
      ? editingUser.allowed_companies.filter(c => c !== cnpj)
      : [...editingUser.allowed_companies, cnpj]

    setEditingUser({ ...editingUser, allowed_companies: allowed })
  }

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const styles = {
      admin: 'bg-red-500/20 text-red-400 border-red-500/30',
      franqueado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      cliente: 'bg-green-500/20 text-green-400 border-green-500/30',
      personalizado: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    }
    return styles[role as keyof typeof styles] || styles.cliente
  }

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      franqueado: 'Franqueado',
      cliente: 'Cliente',
      personalizado: 'Personalizado'
    }
    return labels[role as keyof typeof labels] || role
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-sm text-muted-foreground">Carregando usuários...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-blue-500/20 border border-blue-500/30">
            <Users className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h4 className="text-sm font-semibold">Gerenciamento de Usuários</h4>
            <p className="text-xs text-muted-foreground">
              Crie, edite e gerencie usuários e suas permissões
            </p>
          </div>
        </div>
        <button
          onClick={handleCreateUser}
          className="flex items-center gap-2 px-4 py-2 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Usuário
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome ou email..."
          className="w-full pl-10 pr-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
        />
      </div>

      {/* Users Table */}
      <div className="card-premium overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-graphite-900/50 border-b border-graphite-800">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Nome</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Email</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Perfil</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Empresas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-graphite-800">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-graphite-900/30 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium">{user.name}</td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium border ${getRoleBadge(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {user.role === 'admin' ? (
                      <span className="text-gold-400">Todas</span>
                    ) : (
                      <span>{user.allowed_companies.length} empresa(s)</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleToggleActive(user.id)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                        user.active 
                          ? 'bg-green-500/20 text-green-400 hover:bg-green-500/30' 
                          : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                      }`}
                    >
                      {user.active ? 'Ativo' : 'Inativo'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => {
                          setEditingUser(user)
                          setIsCreating(false)
                        }}
                        className="p-1.5 hover:bg-graphite-800 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 className="w-4 h-4 text-blue-400" />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-1.5 hover:bg-graphite-800 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit/Create Modal */}
      <AnimatePresence>
        {editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={() => {
              setEditingUser(null)
              setIsCreating(false)
            }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl shadow-soft-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="sticky top-0 bg-card border-b border-border p-5 flex items-center justify-between">
                <h3 className="text-sm font-semibold">
                  {isCreating ? 'Novo Usuário' : 'Editar Usuário'}
                </h3>
                <button
                  onClick={() => {
                    setEditingUser(null)
                    setIsCreating(false)
                  }}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Nome Completo *
                  </label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                    placeholder="Ex: João da Silva"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                    placeholder="email@exemplo.com"
                  />
                </div>

                {/* Senha */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    {isCreating ? 'Senha *' : 'Nova Senha (deixe em branco para manter)'}
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={editingUser.password || ''}
                      onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })}
                      className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Perfil */}
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-2">
                    Perfil de Acesso *
                  </label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-graphite-900 border border-graphite-800 rounded-xl text-sm focus:outline-none focus:border-gold-500 focus:ring-2 focus:ring-gold-500/20"
                  >
                    <option value="cliente">Cliente</option>
                    <option value="franqueado">Franqueado</option>
                    <option value="admin">Administrador</option>
                    <option value="personalizado">Personalizado</option>
                  </select>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {editingUser.role === 'admin' && 'Acesso total a todas as empresas e configurações'}
                    {editingUser.role === 'franqueado' && 'Acesso a múltiplas empresas selecionadas'}
                    {editingUser.role === 'cliente' && 'Acesso restrito às empresas selecionadas'}
                    {editingUser.role === 'personalizado' && 'Permissões customizadas'}
                  </p>
                </div>

                {/* Empresas Permitidas */}
                {editingUser.role !== 'admin' && (
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-3">
                      <Building2 className="w-4 h-4 inline mr-1" />
                      Empresas Permitidas
                    </label>
                    <div className="space-y-2 max-h-60 overflow-y-auto bg-graphite-900/50 rounded-xl p-3 border border-graphite-800">
                      {companies.map((company) => (
                        <label
                          key={company.cnpj}
                          className="flex items-start gap-3 p-2 hover:bg-graphite-800/50 rounded-lg cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={editingUser.allowed_companies.includes(company.cnpj)}
                            onChange={() => handleToggleCompany(company.cnpj)}
                            className="mt-0.5 w-4 h-4 rounded border-graphite-700 text-gold-500 focus:ring-gold-500 focus:ring-offset-0"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{company.cliente_nome}</p>
                            <p className="text-xs text-muted-foreground">
                              CNPJ: {company.cnpj} • {company.grupo_empresarial}
                            </p>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações */}
                <div className="flex items-center gap-3 pt-4">
                  <button
                    onClick={handleSaveUser}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-graphite-900 rounded-xl text-sm font-medium transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    {isCreating ? 'Criar Usuário' : 'Salvar Alterações'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingUser(null)
                      setIsCreating(false)
                    }}
                    className="px-4 py-2.5 bg-graphite-800 hover:bg-graphite-700 text-foreground rounded-xl text-sm font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
