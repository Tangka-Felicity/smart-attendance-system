import React, { useState } from 'react';
import type { ChangeEvent } from 'react';
import {
  Layout,
  Button,
  Input,
  Card,
  CardHeader,
  CardBody,
  CardFooter,
  Badge,
  Table,
  Modal,
  StatCard,
  ProgressBar,
} from '.';
import { Search } from 'lucide-react';

/**
 * ComponentShowcase - Demo component showing all UI components and how to use them
 * This file demonstrates the usage of all created components
 */

const ComponentShowcase: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  // Sample table data
  const tableColumns = [
    { key: 'id', label: 'ID' },
    { key: 'name', label: 'Name' },
    {
      key: 'status',
      label: 'Status',
      render: (value: string) => <Badge variant={value === 'active' ? 'good' : 'neutral'}>{value}</Badge>,
    },
    { key: 'attendance', label: 'Attendance %' },
  ];

  const tableData = [
    { id: '1', name: 'John Doe', status: 'active', attendance: '95%' },
    { id: '2', name: 'Jane Smith', status: 'inactive', attendance: '78%' },
    { id: '3', name: 'Bob Johnson', status: 'active', attendance: '88%' },
  ];

  return (
    <Layout
      user={{ name: 'Admin User', role: 'SUPER_ADMIN' }}
      onLogout={() => console.log('Logging out...')}
    >
      <div className="space-y-8">
        {/* Buttons Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Button Variants</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Primary</p>
                <div className="space-y-2">
                  <Button size="sm">Small</Button>
                  <Button size="md">Medium</Button>
                  <Button size="lg">Large</Button>
                  <Button isLoading>Loading</Button>
                  <Button disabled>Disabled</Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Outline</p>
                <div className="space-y-2">
                  <Button variant="outline" size="sm">
                    Small
                  </Button>
                  <Button variant="outline" size="md">
                    Medium
                  </Button>
                  <Button variant="outline" size="lg">
                    Large
                  </Button>
                  <Button variant="outline" disabled>
                    Disabled
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Ghost</p>
                <div className="space-y-2">
                  <Button variant="ghost" size="sm">
                    Small
                  </Button>
                  <Button variant="ghost" size="md">
                    Medium
                  </Button>
                  <Button variant="ghost" size="lg">
                    Large
                  </Button>
                  <Button variant="ghost" disabled>
                    Disabled
                  </Button>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Danger</p>
                <div className="space-y-2">
                  <Button variant="danger" size="sm">
                    Small
                  </Button>
                  <Button variant="danger" size="md">
                    Medium
                  </Button>
                  <Button variant="danger" size="lg">
                    Large
                  </Button>
                  <Button variant="danger" disabled>
                    Disabled
                  </Button>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Input Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Input Components</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Input label="Basic Input" placeholder="Enter text..." />
            <Input label="Input with Icon" placeholder="Search..." leftIcon={<Search size={16} />} />
            <Input label="Input with Error" error="This field is required" value="Invalid input" readOnly />
            <Input label="Disabled Input" disabled placeholder="Disabled..." />
          </CardBody>
        </Card>

        {/* Badges Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Badge Variants</h3>
          </CardHeader>
          <CardBody>
            <div className="flex flex-wrap gap-3">
              <Badge variant="good">Good</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="atRisk">At Risk</Badge>
              <Badge variant="critical">Critical</Badge>
              <Badge variant="primary">Primary</Badge>
              <Badge variant="neutral">Neutral</Badge>
            </div>
          </CardBody>
        </Card>

        {/* Stat Cards Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Stat Cards</h3>
          </CardHeader>
          <CardBody>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard value="245" label="Total Students" icon="👥" status="good" trend={{ value: 12, isPositive: true }} />
              <StatCard value="89%" label="Avg Attendance" icon="📊" status="warning" trend={{ value: 5, isPositive: false }} />
              <StatCard value="12" label="Sessions Today" icon="📅" status="neutral" />
              <StatCard value="3" label="Anomalies" icon="⚠️" status="critical" trend={{ value: 25, isPositive: false }} />
            </div>
          </CardBody>
        </Card>

        {/* Progress Bars Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Progress Bars</h3>
          </CardHeader>
          <CardBody className="space-y-6">
            <ProgressBar percentage={85} label="Student A Attendance" showLabel />
            <ProgressBar percentage={65} label="Student B Attendance" showLabel />
            <ProgressBar percentage={45} label="Student C Attendance" showLabel />
            <ProgressBar percentage={25} label="Student D Attendance" showLabel />
          </CardBody>
        </Card>

        {/* Table Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Data Table</h3>
          </CardHeader>
          <CardBody>
            <Table columns={tableColumns} data={tableData} />
          </CardBody>
        </Card>

        {/* Modal Section */}
        <Card shadow>
          <CardHeader>
            <h3 className="text-lg font-bold">Modal Component</h3>
          </CardHeader>
          <CardBody>
            <Button onClick={() => setIsModalOpen(true)}>Open Modal</Button>
          </CardBody>
        </Card>

        {/* Complete Card Example */}
        <Card shadow>
          <CardHeader action={<Badge variant="good">Active</Badge>}>
            <h3 className="text-lg font-bold">Complete Card Example</h3>
          </CardHeader>
          <CardBody>
            <p className="text-gray-600 mb-4">
              This demonstrates a complete card with header, body, and footer sections. Cards are versatile components
              for organizing content.
            </p>
          </CardBody>
          <CardFooter>
            <Button variant="ghost">Cancel</Button>
            <Button>Save Changes</Button>
          </CardFooter>
        </Card>
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Example Modal"
        size="md"
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setIsModalOpen(false)}>Confirm</Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-gray-600">This is an example modal component. It closes on Escape or backdrop click.</p>
          <Input
            label="Enter your name"
            placeholder="John Doe"
            value={inputValue}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setInputValue(e.target.value)}
          />
        </div>
      </Modal>
    </Layout>
  );
};

export default ComponentShowcase;
