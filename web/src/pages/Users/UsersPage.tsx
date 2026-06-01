import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Button, Card, CardBody, Badge, Table, Modal } from '../../components/ui';
import { Search, Plus, Edit2, Lock, Unlock } from 'lucide-react';
import { useTranslation } from '../../context/LanguageContext';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'SUPER_ADMIN' | 'LECTURER' | 'COORDINATOR' | 'STUDENT' | 'ADMIN';
  status: 'ACTIVE' | 'SUSPENDED';
  created_at: string;
}

interface CreateUserInput {
  full_name: string;
  email: string;
  password?: string;
  role: string;
  student_number?: string;
}

interface EditUserInput {
  id: string;
  name: string;
  email: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

// Mock API calls
const fetchUsers = async (): Promise<User[]> => {
  return [
    { id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'SUPER_ADMIN', status: 'ACTIVE', created_at: '2024-01-01' },
    { id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'LECTURER', status: 'ACTIVE', created_at: '2024-01-05' },
    { id: '3', name: 'Carol White', email: 'carol@example.com', role: 'COORDINATOR', status: 'ACTIVE', created_at: '2024-01-10' },
    { id: '4', name: 'David Brown', email: 'david@example.com', role: 'STUDENT', status: 'ACTIVE', created_at: '2024-01-15' },
    { id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'STUDENT', status: 'SUSPENDED', created_at: '2024-01-20' },
    { id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'LECTURER', status: 'ACTIVE', created_at: '2024-02-01' },
    { id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'STUDENT', status: 'ACTIVE', created_at: '2024-02-05' },
    { id: '8', name: 'Henry Wilson', email: 'henry@example.com', role: 'ADMIN', status: 'ACTIVE', created_at: '2024-02-10' },
  ];
};

const createUser = async (input: CreateUserInput): Promise<User> => {
  return {
    id: String(Math.random()),
    name: input.full_name,
    email: input.email,
    role: input.role as any,
    status: 'ACTIVE',
    created_at: new Date().toISOString().split('T')[0],
  };
};

const updateUser = async (input: EditUserInput): Promise<User> => {
  return {
    id: input.id,
    name: input.name,
    email: input.email,
    role: 'STUDENT',
    status: input.status,
    created_at: '2024-01-01',
  };
};

const ITEMS_PER_PAGE = 5;

export const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddLecturerOpen, setIsAddLecturerOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'STUDENT',
    student_number: '',
  });

  const [editFormData, setEditFormData] = useState({
    name: '',
    email: '',
    status: 'ACTIVE' as User['status'],
  });

  // Fetch users
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers,
  });

  // Create user mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddModalOpen(false);
      setFormData({ full_name: '', email: '', password: '', role: 'STUDENT', student_number: '' });
      toast.success(t('userCreatedSuccess'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    },
  });

  // Update user mutation
  const updateMutation = useMutation({
    mutationFn: updateUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsEditModalOpen(false);
      setSelectedUser(null);
      toast.success(t('userUpdatedSuccess'));
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      toast.error(message);
    },
  });

  // Filter users
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      const matchesSearch = user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'All' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'All' || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleAddUser = () => {
    if (!formData.full_name || !formData.email || !formData.password) {
      toast.error(t('fillRequiredFields'));
      return;
    }
    createMutation.mutate(formData);
  };

  const handleEditUser = () => {
    if (!editFormData.name || !editFormData.email) {
      toast.error(t('fillRequiredFields'));
      return;
    }
    updateMutation.mutate({
      id: selectedUser?.id || '',
      ...editFormData,
    });
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      status: user.status,
    });
    setIsEditModalOpen(true);
  };

  const handleToggleSuspend = (user: User) => {
    setSelectedUser(user);
    updateMutation.mutate({
      id: user.id,
      name: user.name,
      email: user.email,
      status: user.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
    });
  };

  const tableColumns = [
    { key: 'name', label: t('name'), width: 'w-40' },
    { key: 'email', label: t('email'), width: 'w-48' },
    {
      key: 'role',
      label: t('role'),
      render: (value: string) => {
        const roleColors: Record<string, any> = {
          SUPER_ADMIN: 'primary',
          ADMIN: 'primary',
          LECTURER: 'neutral',
          COORDINATOR: 'neutral',
          STUDENT: 'neutral',
        };
        return <Badge variant={roleColors[value] || 'neutral'}>{value.replace('_', ' ')}</Badge>;
      },
    },
    {
      key: 'status',
      label: t('status'),
      render: (value: string) => (
        <Badge variant={value === 'ACTIVE' ? 'good' : 'warning'}>
          {value === 'ACTIVE' ? t('active') : t('suspended')}
        </Badge>
      ),
    },
    { key: 'created_at', label: t('createdDate'), width: 'w-32' },
    {
      key: 'actions',
      label: t('actions'),
      render: (_value: unknown, user: User) => (
        <div className="flex gap-2">
          <button
            onClick={() => handleViewUser(user)}
            className="p-1 hover:bg-[var(--table-hover)] rounded transition-colors"
            title={t('viewEdit')}
          >
            <Edit2 size={16} style={{ color: 'var(--primary)' }} />
          </button>
          <button
            onClick={() => handleToggleSuspend(user)}
            className="p-1 hover:bg-[var(--table-hover)] rounded transition-colors"
            title={user.status === 'ACTIVE' ? t('suspend') : t('activate')}
          >
            {user.status === 'ACTIVE' ? (
              <Lock size={16} style={{ color: 'var(--at-risk)' }} />
            ) : (
              <Unlock size={16} style={{ color: 'var(--success)' }} />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary">{t('users')}</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={() => setIsImportOpen(true)} variant="outline">{t('importStudents')}</Button>
          <Button onClick={() => setIsAddLecturerOpen(true)}>
            <Plus size={16} />
            {t('addLecturer')}
          </Button>
          <Button onClick={() => setIsAddModalOpen(true)}>
            <Plus size={16} />
            {t('addUser')}
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('search')}</label>
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted" />
                <input
                  type="text"
                  placeholder={t('nameOrEmail')}
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
                />
              </div>
            </div>

            {/* Role Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('role')}</label>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
              >
                <option value="All">{t('all')}</option>
                <option>SUPER_ADMIN</option>
                <option>ADMIN</option>
                <option>LECTURER</option>
                <option>COORDINATOR</option>
                <option>STUDENT</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('status')}</label>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
              >
                <option value="All">{t('all')}</option>
                <option value="ACTIVE">{t('active')}</option>
                <option value="SUSPENDED">{t('suspended')}</option>
              </select>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Users Table */}
      <Card shadow>
        <CardBody>
          <Table
            columns={tableColumns}
            data={paginatedUsers}
            isLoading={isLoading}
            emptyState={<p className="text-center text-secondary">{t('noUsersFound')}</p>}
          />
        </CardBody>
      </Card>

      {/* Pagination */}
      {filteredUsers.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-secondary">
            {t('showing')} {(currentPage - 1) * ITEMS_PER_PAGE + 1} {t('to')}{' '}
            {Math.min(currentPage * ITEMS_PER_PAGE, filteredUsers.length)} {t('of')} {filteredUsers.length} {t('users')}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
            >
              {t('previous')}
            </Button>
            <div className="flex items-center gap-2 px-4 py-2">
              <span className="text-sm text-secondary">
                {t('page')} {currentPage} {t('of')} {totalPages}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
            >
              {t('next')}
            </Button>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={t('addNewUser')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleAddUser} isLoading={createMutation.isPending}>
              {t('addUser')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('fullName')}</label>
            <input
              type="text"
              placeholder="John Doe"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('email')}</label>
            <input
              type="email"
              placeholder="john@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('password')}</label>
            <input
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('role')}</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="STUDENT">{t('student')}</option>
              <option value="LECTURER">{t('lecturer')}</option>
              <option value="COORDINATOR">{t('coordinator')}</option>
              <option value="ADMIN">{t('admin')}</option>
              <option value="SUPER_ADMIN">{t('superAdmin')}</option>
            </select>
          </div>

          {formData.role === 'STUDENT' && (
            <div>
              <label className="block text-sm font-medium text-secondary mb-2">{t('studentNumber')}</label>
              <input
                type="text"
                placeholder="STU-2024-001"
                value={formData.student_number}
                onChange={(e) => setFormData({ ...formData, student_number: e.target.value })}
                className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={t('editUser')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsEditModalOpen(false)}>
              {t('cancel')}
            </Button>
            <Button onClick={handleEditUser} isLoading={updateMutation.isPending}>
              {t('saveChanges')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('fullName')}</label>
            <input
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('email')}</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('status')}</label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value as 'ACTIVE' | 'SUSPENDED' })}
              className="w-full px-4 py-2 border border-default rounded-lg focus:outline-none focus:ring-2"
            >
              <option value="ACTIVE">{t('active')}</option>
              <option value="SUSPENDED">{t('suspended')}</option>
            </select>
          </div>

          {selectedUser && (
            <div className="bg-card p-3 rounded-lg text-sm text-secondary">
              <p>
                <span className="font-medium">{t('userRole')}:</span> {selectedUser.role.replace('_', ' ')}
              </p>
              <p>
                <span className="font-medium">{t('created')}:</span> {selectedUser.created_at}
              </p>
            </div>
          )}
        </div>
      </Modal>

      {/* Add Lecturer Modal */}
      <Modal
        isOpen={isAddLecturerOpen}
        onClose={() => setIsAddLecturerOpen(false)}
        title={t('addLecturer')}
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddLecturerOpen(false)}>{t('cancel')}</Button>
            <Button onClick={() => {
              // simple create lecturer placeholder
              createMutation.mutate({ full_name: formData.full_name, email: formData.email, password: formData.password || undefined, role: 'LECTURER' });
            }} isLoading={createMutation.isPending}>{t('createAccount')}</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('fullName')}</label>
            <input type="text" value={formData.full_name} onChange={(e) => setFormData({ ...formData, full_name: e.target.value })} className="w-full px-4 py-2 border border-default rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('staffId')}</label>
            <input type="text" value={formData.student_number} onChange={(e) => setFormData({ ...formData, student_number: e.target.value })} className="w-full px-4 py-2 border border-default rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('department')}</label>
            <input type="text" value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value })} className="w-full px-4 py-2 border border-default rounded-lg" />
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('email')}</label>
            <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="w-full px-4 py-2 border border-default rounded-lg" />
          </div>
          <div>
            <label className="inline-flex items-center gap-2">
              <input type="checkbox" checked={true} readOnly /> <span className="text-sm text-secondary">{t('autoGeneratePassword')}</span>
            </label>
          </div>
        </div>
      </Modal>

      {/* Import Students Modal (CSV) */}
      <Modal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} title={t('importStudents')} size="md" footer={<><Button variant="ghost" onClick={() => setIsImportOpen(false)}>{t('cancel')}</Button><Button>{t('import')}</Button></>}>
        <div className="space-y-4">
          <div>
            <p className="text-sm text-secondary">{t('downloadTemplate')}</p>
            <Button variant="outline" onClick={() => { /* download template */ }}>{t('downloadTemplateFile')}</Button>
          </div>
          <div>
            <label className="block text-sm font-medium text-secondary mb-2">{t('uploadCSV')}</label>
            <input type="file" accept="text/csv" />
          </div>
          <div>
            <p className="text-sm text-secondary">{t('previewFirstRows')}</p>
            <div className="p-3 rounded" style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)' }}>{t('previewWillAppearHere')}</div>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UsersPage;
