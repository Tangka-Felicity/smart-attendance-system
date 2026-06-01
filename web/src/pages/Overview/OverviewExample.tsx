import React, { useState } from 'react';
import {
  Layout,
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  Badge,
  Table,
  Modal,
  StatCard,
  ProgressBar,
} from '../../components';
import { Search, Plus, Edit2, Trash2 } from 'lucide-react';

/**
 * Example Overview Page
 * This demonstrates a real-world usage of the dashboard components
 */

export const OverviewPage: React.FC = () => {
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([
    { id: '1', name: 'Alice Johnson', role: 'Lecturer', status: 'active', attendance: '95%' },
    { id: '2', name: 'Bob Smith', role: 'Student', status: 'active', attendance: '87%' },
    { id: '3', name: 'Carol White', role: 'Lecturer', status: 'inactive', attendance: '72%' },
    { id: '4', name: 'David Brown', role: 'Student', status: 'active', attendance: '91%' },
  ]);

  const handleAddUser = () => {
    if (newUserName.trim()) {
      setFilteredUsers([
        ...filteredUsers,
        {
          id: String(filteredUsers.length + 1),
          name: newUserName,
          role: 'Student',
          status: 'active',
          attendance: '0%',
        },
      ]);
      setNewUserName('');
      setIsAddUserModalOpen(false);
    }
  };

  const tableColumns = [
    { key: 'name', label: 'Name', width: 'w-48' },
    { key: 'role', label: 'Role', width: 'w-32' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => (
        <Badge variant={value === 'active' ? 'good' : 'neutral'}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </Badge>
      ),
    },
    {
      key: 'attendance',
      label: 'Attendance',
      render: (value: string) => (
        <div className="w-32">
          <ProgressBar percentage={parseInt(value)} showLabel={false} height={6} />
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      render: () => (
        <div className="flex gap-2">
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Edit2 size={16} className="text-blue-600" />
          </button>
          <button className="p-1 hover:bg-gray-100 rounded transition-colors">
            <Trash2 size={16} className="text-red-600" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Layout
      user={{ name: 'Sarah Admin', role: 'SUPER_ADMIN' }}
      unreadNotifications={2}
      onLogout={() => console.log('Logged out')}
    >
      <div className="space-y-6">
        {/* Statistics Section */}
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-4">Dashboard Statistics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              value="1,247"
              label="Total Students"
              icon="👥"
              status="good"
              trend={{ value: 8, isPositive: true }}
            />
            <StatCard
              value="42"
              label="Active Sessions"
              icon="📅"
              status="good"
              trend={{ value: 3, isPositive: true }}
            />
            <StatCard
              value="91.2%"
              label="Avg Attendance"
              icon="📊"
              status="warning"
              trend={{ value: 2, isPositive: false }}
            />
            <StatCard
              value="8"
              label="Anomalies Detected"
              icon="⚠️"
              status="critical"
              trend={{ value: 15, isPositive: false }}
            />
          </div>
        </div>

        {/* Users Management Section */}
        <Card shadow>
          <CardHeader
            action={
              <Button size="sm" onClick={() => setIsAddUserModalOpen(true)}>
                <Plus size={16} />
                Add User
              </Button>
            }
          >
            <h3 className="text-lg font-bold">User Management</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <Table columns={tableColumns} data={filteredUsers} />
          </CardBody>
        </Card>

        {/* Course Performance Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Course Attendance Performance</h3>
          </CardHeader>
          <CardBody className="space-y-6">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Advanced Mathematics</span>
                <Badge variant="good">On Track</Badge>
              </div>
              <ProgressBar percentage={85} showLabel={true} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Physics 101</span>
                <Badge variant="warning">At Risk</Badge>
              </div>
              <ProgressBar percentage={62} showLabel={true} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Chemistry Lab</span>
                <Badge variant="atRisk">Monitor</Badge>
              </div>
              <ProgressBar percentage={48} showLabel={true} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Biology Basics</span>
                <Badge variant="critical">Critical</Badge>
              </div>
              <ProgressBar percentage={28} showLabel={true} />
            </div>
          </CardBody>
        </Card>

        {/* Quick Actions Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Quick Actions</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Button className="w-full" variant="outline">
                View Anomalies Report
              </Button>
              <Button className="w-full" variant="outline">
                Generate Audit Trail
              </Button>
              <Button className="w-full" variant="outline">
                Export Attendance Data
              </Button>
              <Button className="w-full" variant="outline">
                Configure Sessions
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddUserModalOpen}
        onClose={() => setIsAddUserModalOpen(false)}
        title="Add New User"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddUserModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddUser}>Add User</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Full Name"
            placeholder="John Doe"
            value={newUserName}
            onChange={(e) => setNewUserName(e.target.value)}
            leftIcon={<span>👤</span>}
          />
          <Input
            label="Email Address"
            placeholder="john@example.com"
            type="email"
            leftIcon={<span>✉️</span>}
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">User Role</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600">
              <option>Student</option>
              <option>Lecturer</option>
              <option>Admin</option>
            </select>
          </div>
        </div>
      </Modal>
    </Layout>
  );
};

export default OverviewPage;
