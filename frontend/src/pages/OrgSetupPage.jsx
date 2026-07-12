import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Building2, Tags, Users, Plus, Search, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PageHeader from '../components/layout/PageHeader';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';

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

  useEffect(() => setActiveTab(defaultTab), [defaultTab]);

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

  // FIX: Properly handle form submissions for edits
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (modalState.type === 'editDepartment') {
      const newName = e.target.deptName.value;
      const newParent = e.target.parentDept.value;
      setDepartments(prev => prev.map(d => d.id === modalState.data.id ? { ...d, name: newName, parent: newParent } : d));
    } else if (modalState.type === 'editCategory') {
      const newName = e.target.catName.value;
      const newAttrs = e.target.attributes.value;
      setCategories(prev => prev.map(c => c.id === modalState.data.id ? { ...c, name: newName, attributes: newAttrs } : c));
    } else if (modalState.type === 'manageRole') {
      const newRole = e.target.roleSelect.value;
      setEmployees(prev => prev.map(emp => emp.id === modalState.data.id ? { ...emp, role: newRole } : emp));
    }
    closeModal();
  };

  return (
    <div className="relative mx-auto max-w-7xl">
      <PageHeader
        eyebrow="Admin Only"
        title="Organization Setup"
        description="Manage departments, asset categories, and employee roles across the enterprise."
        actions={[
          <Button key="add" variant="primary" onClick={() => openModal(`add${activeTab}`)}>
            <Plus size={18} className="mr-2" />
            Add New
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
                {isActive && <motion.div layoutId="activeTab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-violet-600" />}
              </button>
            );
          })}
        </div>

        <div className="mt-6">
          <Card className="overflow-hidden p-0">
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
          modalState.type?.includes('Department') ? 'Department Details' :
          modalState.type?.includes('Category') ? 'Category Details' :
          'Manage Employee Role'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          
          {/* FIX: Fields are now populated with modalState.data */}
          {modalState.type?.includes('Department') && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Department Name</label>
                <input name="deptName" type="text" defaultValue={modalState.data?.name || ''} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Parent Department (Optional)</label>
                <select name="parentDept" defaultValue={modalState.data?.parent?.toLowerCase() || ''} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                  <option value="">None (Top Level)</option>
                  <option value="hq">HQ</option>
                  <option value="operations">Operations</option>
                </select>
              </div>
            </>
          )}

          {/* FIX: Fields are now populated with modalState.data */}
          {modalState.type?.includes('Category') && (
            <>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Category Name</label>
                <input name="catName" type="text" defaultValue={modalState.data?.name || ''} required className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">Custom Attributes</label>
                <input name="attributes" type="text" defaultValue={modalState.data?.attributes || ''} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600" />
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
                <select name="roleSelect" defaultValue={modalState.data?.role} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-violet-600 focus:outline-none focus:ring-1 focus:ring-violet-600">
                  <option value="Employee">Employee (Standard Access)</option>
                  <option value="Department Head">Department Head</option>
                  <option value="Asset Manager">Asset Manager</option>
                  <option value="Admin">System Admin</option>
                </select>
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

function DepartmentsTable({ data, onEdit }) {
  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="px-6 py-3 font-medium">Department Name</th>
          <th className="px-6 py-3 font-medium">Head</th>
          <th className="px-6 py-3 font-medium">Status</th>
          <th className="px-6 py-3 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {data.map((row) => (
          <tr key={row.id} className="transition-colors hover:bg-slate-50">
            <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
            <td className="px-6 py-4">{row.head}</td>
            <td className="px-6 py-4"><Badge tone="success">{row.status}</Badge></td>
            <td className="px-6 py-4 text-right">
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(row)}>Edit</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmployeesTable({ data, onManageRole }) {
  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="px-6 py-3 font-medium">Employee</th>
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
            <td className="px-6 py-4"><Badge tone="neutral">{row.role}</Badge></td>
            <td className="px-6 py-4 text-right">
              <Button variant="secondary" className="px-3 py-1 text-xs shadow-none" onClick={() => onManageRole(row)}>Manage Role</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CategoriesTable({ data, onEdit }) {
  return (
    <table className="w-full text-left text-sm text-slate-600">
      <thead className="bg-slate-50 text-xs uppercase text-slate-500">
        <tr>
          <th className="px-6 py-3 font-medium">Category Name</th>
          <th className="px-6 py-3 text-right font-medium">Actions</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 bg-white">
        {data.map((row) => (
          <tr key={row.id} className="transition-colors hover:bg-slate-50">
            <td className="px-6 py-4 font-medium text-slate-900">{row.name}</td>
            <td className="px-6 py-4 text-right">
              <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => onEdit(row)}>Edit</Button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}