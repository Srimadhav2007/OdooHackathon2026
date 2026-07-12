import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Tags, Users, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

// --- Reusable Modal Component ---
const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <button onClick={onClose} className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600">
              <X size={20} />
            </button>
          </div>
          <div className="p-6">
            {children}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default function OrgSetupPage({ defaultTab = 'departments' }) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [modalState, setModalState] = useState({ isOpen: false, type: null, data: null });
  const navigate = useNavigate();

  // --- Reactive Mock Data ---
  const [departments, setDepartments] = useState([
    { id: 1, name: 'Finance', head: 'Sarah Jenkins', parent: 'HQ', status: 'Active' },
    { id: 2, name: 'Engineering', head: 'Marcus Cole', parent: 'HQ', status: 'Active' },
    { id: 3, name: 'Logistics', head: 'Unassigned', parent: 'Operations', status: 'Active' },
  ]);

  const [categories, setCategories] = useState([
    { id: 1, name: 'Electronics', attributes: 'Warranty, MAC Address', status: 'Active' },
    { id: 2, name: 'Vehicles', attributes: 'License Plate, Mileage', status: 'Active' },
    { id: 3, name: 'Furniture', attributes: 'Condition, Location', status: 'Active' },
  ]);

  const [employees, setEmployees] = useState([
    { id: 1, name: 'Alicia Dean', email: 'admin@assetflow.com', dept: 'HQ', role: 'Admin' },
    { id: 2, name: 'Priya Sharma', email: 'emp@assetflow.com', dept: 'Engineering', role: 'Employee' },
    { id: 3, name: 'David Cho', email: 'manager@assetflow.com', dept: 'Operations', role: 'Asset Manager' },
  ]);

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    navigate(`/${tabId}`); 
  };

  const openModal = (type, data = null) => setModalState({ isOpen: true, type, data });
  const closeModal = () => setModalState({ isOpen: false, type: null, data: null });

  const tabs = [
    { id: 'departments', label: 'Departments', icon: Building2 },
    { id: 'employees', label: 'Employee Directory', icon: Users },
    { id: 'categories', label: 'Asset Categories', icon: Tags },
  ];

  const getPrimaryAction = () => {
    if (activeTab === 'departments') return { label: 'Add Department', onClick: () => openModal('addDepartment') };
    if (activeTab === 'categories') return { label: 'Add Category', onClick: () => openModal('addCategory') };
    return { label: 'Invite Employee', onClick: () => openModal('addEmployee') };
  };

  const action = getPrimaryAction();

  // Handle saving the role change from the modal
  const handleRoleSubmit = (e) => {
    e.preventDefault();
    const newRole = e.target.roleSelect.value;
    setEmployees(prev => prev.map(emp => 
      emp.id === modalState.data.id ? { ...emp, role: newRole } : emp
    ));
    closeModal();
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Admin Only"
        title="Organization Setup"
        description="Manage departments, asset categories, and employee roles across the enterprise."
        actions={[
          <Button key="add" variant="primary" onClick={action.onClick}>
            <Plus size={18} className="mr-2" />
            {action.label}
          </Button>
        ]}
      />

      <div className="mt-8">
        <div className="flex border-b border-slate-200">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-2 px-6 py-4 text-sm font-medium transition-colors ${
                  isActive ? 'text-violet-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                }`}
              >
                <Icon size={18} />
                {tab.label}
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600"
                  />
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
            <div className="border-b border-slate-100 bg-slate-50/50 p-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm text-slate-900 caret-violet-600 transition-colors focus:border-violet-600 focus:bg-white focus:text-slate-900 focus:outline-none focus:ring-1 focus:ring-violet-600"
                />
              </div>
            </div>

            {activeTab === 'departments' && <DepartmentsTable data={departments} onEdit={(data) => openModal('editDepartment', data)} />}
            {activeTab === 'employees' && <EmployeesTable data={employees} onManageRole={(data) => openModal('manageRole', data)} />}
            {activeTab === 'categories' && <CategoriesTable data={categories} onEdit={(data) => openModal('editCategory', data)} />}
          </Card>
        </div>
      </div>

      <Modal 
        isOpen={modalState.isOpen} 
        onClose={closeModal} 
        title={
          modalState.type === 'addDepartment' ? 'Create New Department' :
          modalState.type === 'addCategory' ? 'Create Asset Category' :
          modalState.type === 'manageRole' ? 'Manage Employee Role' : 'Form'
        }
      >
        <form onSubmit={modalState.type === 'manageRole' ? handleRoleSubmit : (e) => { e.preventDefault(); closeModal(); }} className="space-y-4">
          
          {modalState.type === 'addDepartment' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Department Name</label>
                <input type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Marketing" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Parent Department (Optional)</label>
                <select className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600">
                  <option value="">None (Top Level)</option>
                  <option value="hq">HQ</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            </>
          )}

          {modalState.type === 'addCategory' && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category Name</label>
                <input type="text" required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Laptops" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Custom Attributes (Comma separated)</label>
                <input type="text" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 caret-violet-600 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600" placeholder="e.g. Warranty Date, MAC Address" />
              </div>
            </>
          )}

          {modalState.type === 'manageRole' && (
            <>
              <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <p className="text-sm font-medium text-slate-900">{modalState.data?.name}</p>
                <p className="text-xs text-slate-500">{modalState.data?.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Assign New Role</label>
                <select 
                  name="roleSelect"
                  defaultValue={modalState.data?.role}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:bg-white focus:outline-none focus:ring-1 focus:ring-violet-600"
                >
                  <option value="Employee">Employee (Standard Access)</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Asset Manager">Asset Manager</option>
                  <option value="Admin">System Admin</option>
                </select>
                <p className="mt-2 text-xs text-slate-500">
                  Promoting a user grants them elevated permissions across the platform immediately.
                </p>
              </div>
            </>
          )}

          <div className="mt-6 flex justify-end gap-3 border-t border-slate-100 pt-4">
            <Button type="button" variant="ghost" onClick={closeModal}>Cancel</Button>
            <Button type="submit" variant="primary">Save Changes</Button>
          </div>
        </form>
      </Modal>

    </div>
  );
}

// --- Data Tables ---

function DepartmentsTable({ data, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 font-medium">Department Name</th>
            <th className="px-6 py-3 font-medium">Head</th>
            <th className="px-6 py-3 font-medium">Parent</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-slate-50">
              <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
              <td className="px-6 py-4">{row.head}</td>
              <td className="px-6 py-4">{row.parent}</td>
              <td className="px-6 py-4"><Badge tone="success">{row.status}</Badge></td>
              <td className="px-6 py-4 text-right">
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(row)}>Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EmployeesTable({ data, onManageRole }) {
  const getBadgeTone = (role) => {
    switch (role) {
      case 'Admin': return 'violet';
      case 'Asset Manager': return 'sky';
      case 'Department Head': return 'amber';
      default: return 'neutral';
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 font-medium">Employee</th>
            <th className="px-6 py-3 font-medium">Department</th>
            <th className="px-6 py-3 font-medium">Role</th>
            <th className="px-6 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-slate-50">
              <td className="px-6 py-4">
                <div className="font-medium text-slate-900">{row.name}</div>
                <div className="text-xs text-slate-500">{row.email}</div>
              </td>
              <td className="px-6 py-4">{row.dept}</td>
              <td className="px-6 py-4">
                <Badge tone={getBadgeTone(row.role)}>{row.role}</Badge>
              </td>
              <td className="px-6 py-4 text-right">
                <Button 
                  variant="secondary" 
                  className="px-3 py-1 text-xs shadow-none"
                  onClick={() => onManageRole(row)}
                >
                  Manage Role
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CategoriesTable({ data, onEdit }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm text-slate-600">
        <thead className="bg-slate-50 text-xs uppercase text-slate-500">
          <tr>
            <th className="px-6 py-3 font-medium">Category Name</th>
            <th className="px-6 py-3 font-medium">Custom Fields</th>
            <th className="px-6 py-3 font-medium">Status</th>
            <th className="px-6 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">
          {data.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-slate-50">
              <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
              <td className="px-6 py-4 text-slate-500">{row.attributes}</td>
              <td className="px-6 py-4"><Badge tone="success">{row.status}</Badge></td>
              <td className="px-6 py-4 text-right">
                <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(row)}>Edit</Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}