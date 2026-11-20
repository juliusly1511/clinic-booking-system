import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { createAdminUser, fetchUsers, toggleUserStatus } from '../../api/admin';

export default function ManageUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    specialty: 'General Medicine'
  });

  const load = () => {
    fetchUsers().then((d) => setUsers(d.users || []));
  };

  useEffect(load, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      await createAdminUser(form);
      toast.success('User provisioned.');
      setForm({ name: '', email: '', phone: '', password: '', role: 'staff', specialty: 'General Medicine' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create user');
    }
  };

  const handleToggle = async (id) => {
    await toggleUserStatus(id);
    toast.success('Account status updated.');
    load();
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Manage Clinic Accounts</h1>
        <p className="text-sm text-slate-600">Provision doctors, reception staff, or deactivate accounts.</p>
      </div>

      <form onSubmit={handleCreate} className="grid gap-3 rounded-xl border border-slate-200 bg-white p-5 sm:grid-cols-3">
        <input
          required
          placeholder="Full Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="email"
          required
          placeholder="Email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          required
          placeholder="PH Phone (0917...)"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <input
          type="password"
          required
          placeholder="Temporary Password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
        <select
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value })}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="staff">Staff</option>
          <option value="doctor">Doctor</option>
          <option value="admin">Admin</option>
          <option value="patient">Patient</option>
        </select>
        {form.role === 'doctor' ? (
          <input
            placeholder="Specialty (e.g. Cardiology)"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
            className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        ) : (
          <div />
        )}
        <button
          type="submit"
          className="sm:col-span-3 rounded-lg bg-teal-600 py-2 text-sm font-semibold text-white hover:bg-teal-700"
        >
          Add User
        </button>
      </form>

      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="min-w-full divide-y divide-slate-200 text-sm">
          <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map((u) => (
              <tr key={u._id}>
                <td className="px-4 py-3 font-medium">{u.name}</td>
                <td className="px-4 py-3 text-slate-600">{u.email}</td>
                <td className="px-4 py-3 uppercase text-xs font-semibold text-teal-700">{u.role}</td>
                <td className="px-4 py-3">{u.isActive ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => handleToggle(u._id)}
                    className="rounded border border-slate-300 px-2.5 py-1 text-xs hover:bg-slate-50"
                  >
                    {u.isActive ? 'Deactivate' : 'Activate'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
