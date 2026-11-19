import React, { useCallback, useEffect, useState } from 'react';
import { Database, Edit2, Plus, Trash2, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { getBootstrapStatus } from '../../api/auth';
import { listDoctors } from '../../api/doctors';
import {
  countDoctorUpcomingAppointments,
  createUserByAdmin,
  deleteUserByAdmin,
  listAllUsers,
  seedDemoData,
  updateUserByAdmin,
} from '../../api/admin';
import { useAuth } from '../../context/AuthContext';
import { isValidPhPhone } from '../../lib/dates';
import { ConfirmDialog } from '../../components/ConfirmDialog';
import type { Doctor, UserProfile, UserRole } from '../../types';

const WEEKDAYS = [
  { val: 1, label: 'Mon' },
  { val: 2, label: 'Tue' },
  { val: 3, label: 'Wed' },
  { val: 4, label: 'Thu' },
  { val: 5, label: 'Fri' },
  { val: 6, label: 'Sat' },
  { val: 0, label: 'Sun' },
];

export const AdminUsers: React.FC = () => {
  const { profile: currentAdmin } = useAuth();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [demoExists, setDemoExists] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff' as UserRole,
    specialty: '',
    slotDuration: 30,
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    bio: '',
  });

  const [editTarget, setEditTarget] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    phone: '',
    isActive: true,
    doctorId: '',
    specialty: '',
    slotDuration: 30,
    workingDays: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '17:00',
    bio: '',
  });
  const [savingEdit, setSavingEdit] = useState(false);

  const [deactivateTarget, setDeactivateTarget] = useState<{
    user: UserProfile;
    upcomingCount: number;
  } | null>(null);

  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [seeding, setSeeding] = useState(false);
  const [seedModalCreds, setSeedModalCreds] = useState<Array<{
    role: string;
    email: string;
    password: string;
  }> | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uList, dList, boot] = await Promise.all([
        listAllUsers(),
        listDoctors(),
        getBootstrapStatus(),
      ]);
      setUsers(uList);
      setDoctors(dList);
      setDemoExists(boot.hasDemoData);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  const toggleDay = (days: number[], dayVal: number) =>
    days.includes(dayVal) ? days.filter((d) => d !== dayVal) : [...days, dayVal];

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newUser.name.trim().length < 2) {
      toast.error('Please enter a valid name.');
      return;
    }
    if (!isValidPhPhone(newUser.phone)) {
      toast.error('Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.');
      return;
    }
    if (newUser.password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }
    if (newUser.role === 'doctor') {
      if (!newUser.specialty.trim()) {
        toast.error('Specialty is required for doctors.');
        return;
      }
      if (newUser.workingDays.length === 0) {
        toast.error('Select at least one working day.');
        return;
      }
    }

    setCreating(true);
    try {
      await createUserByAdmin({
        name: newUser.name,
        email: newUser.email,
        phone: newUser.phone,
        password: newUser.password,
        role: newUser.role,
        doctorDetails:
          newUser.role === 'doctor'
            ? {
                specialty: newUser.specialty,
                slotDuration: Number(newUser.slotDuration),
                workingDays: newUser.workingDays,
                startTime: newUser.startTime,
                endTime: newUser.endTime,
                bio: newUser.bio,
              }
            : undefined,
      });
      toast.success('User created.');
      setCreateOpen(false);
      setNewUser({
        name: '',
        email: '',
        phone: '',
        password: '',
        role: 'staff',
        specialty: '',
        slotDuration: 30,
        workingDays: [1, 2, 3, 4, 5],
        startTime: '09:00',
        endTime: '17:00',
        bio: '',
      });
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to create user.');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: UserProfile) => {
    const docRec = doctors.find((d) => d.userId === u.uid);
    setEditTarget(u);
    setEditForm({
      name: u.name,
      phone: u.phone,
      isActive: u.isActive,
      doctorId: docRec?.id ?? '',
      specialty: docRec?.specialty ?? '',
      slotDuration: docRec?.slotDuration ?? 30,
      workingDays: docRec?.workingDays ?? [1, 2, 3, 4, 5],
      startTime: docRec?.startTime ?? '09:00',
      endTime: docRec?.endTime ?? '17:00',
      bio: docRec?.bio ?? '',
    });
  };

  const commitEdit = async (forceActive?: boolean) => {
    if (!editTarget) return;
    setSavingEdit(true);
    try {
      await updateUserByAdmin({
        uid: editTarget.uid,
        name: editForm.name,
        phone: editForm.phone,
        isActive: forceActive ?? editForm.isActive,
        doctor: editForm.doctorId
          ? {
              id: editForm.doctorId,
              specialty: editForm.specialty,
              slotDuration: Number(editForm.slotDuration),
              workingDays: editForm.workingDays,
              startTime: editForm.startTime,
              endTime: editForm.endTime,
              bio: editForm.bio,
            }
          : undefined,
      });
      toast.success('User updated.');
      setEditTarget(null);
      setDeactivateTarget(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update user.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTarget) return;
    if (!isValidPhPhone(editForm.phone)) {
      toast.error('Use Philippine mobile format: 09XXXXXXXXX or +639XXXXXXXXX.');
      return;
    }

    if (editTarget.isActive && !editForm.isActive && editForm.doctorId) {
      const count = await countDoctorUpcomingAppointments(editForm.doctorId);
      if (count > 0) {
        setDeactivateTarget({ user: editTarget, upcomingCount: count });
        return;
      }
    }
    await commitEdit();
  };

  const handleDeleteUser = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteUserByAdmin(deleteTarget.uid);
      toast.success('User deleted.');
      setDeleteTarget(null);
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Unable to delete user.');
    } finally {
      setDeleting(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeeding(true);
    try {
      const creds = await seedDemoData();
      setSeedModalCreds(creds);
      toast.success('Demo data loaded!');
      await loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load demo data.');
    } finally {
      setSeeding(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Users</h1>
          <p className="mt-1 text-sm text-slate-600">
            Create staff, doctor, and admin accounts or manage user access.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!demoExists && (
            <button
              type="button"
              disabled={seeding}
              onClick={handleSeedDemo}
              className="inline-flex items-center gap-2 rounded-lg border border-clinic-200 bg-clinic-50 px-4 py-2 text-sm font-semibold text-clinic-800 hover:bg-clinic-100 disabled:opacity-50"
            >
              <Database className="h-4 w-4" />
              {seeding ? 'Loading demo data...' : 'Seed demo data'}
            </button>
          )}
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-clinic-600 px-4 py-2 text-sm font-semibold text-white hover:bg-clinic-700"
          >
            <Plus className="h-4 w-4" />
            New user
          </button>
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <div className="space-y-2 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-11 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold text-slate-600">
                <tr>
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => (
                  <tr key={u.uid} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {u.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{u.email}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs tabular-nums text-slate-600">
                      {u.phone || '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 capitalize text-slate-700">
                      {u.role}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold">
                      <span className={u.isActive ? 'text-emerald-700' : 'text-rose-700'}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                          Edit
                        </button>
                        {u.uid !== currentAdmin?.uid && (
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {createOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-lg font-semibold text-slate-900">Create User</h2>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Full name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="doctor">Doctor</option>
                    <option value="patient">Patient</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-slate-700">Email *</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700">
                    Mobile (09...) *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newUser.phone}
                    onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                    placeholder="09171234567"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700">
                  Initial password * (min 8 chars)
                </label>
                <input
                  type="password"
                  required
                  value={newUser.password}
                  onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {newUser.role === 'doctor' && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700">Doctor Schedule Details</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Specialty *
                      </label>
                      <input
                        type="text"
                        required
                        value={newUser.specialty}
                        onChange={(e) => setNewUser({ ...newUser, specialty: e.target.value })}
                        placeholder="e.g. Pediatrics"
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Slot duration (mins)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={120}
                        value={newUser.slotDuration}
                        onChange={(e) =>
                          setNewUser({ ...newUser, slotDuration: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Start time</label>
                      <input
                        type="time"
                        value={newUser.startTime}
                        onChange={(e) => setNewUser({ ...newUser, startTime: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">End time</label>
                      <input
                        type="time"
                        value={newUser.endTime}
                        onChange={(e) => setNewUser({ ...newUser, endTime: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700">Working days</label>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {WEEKDAYS.map((d) => {
                        const checked = newUser.workingDays.includes(d.val);
                        return (
                          <button
                            key={d.val}
                            type="button"
                            onClick={() =>
                              setNewUser({
                                ...newUser,
                                workingDays: toggleDay(newUser.workingDays, d.val),
                              })
                            }
                            className={`rounded-lg border px-2.5 py-1 text-xs font-medium ${
                              checked
                                ? 'border-clinic-600 bg-clinic-600 text-white'
                                : 'border-slate-300 bg-white text-slate-700'
                            }`}
                          >
                            {d.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create user'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Edit User</h2>
                <p className="text-xs capitalize text-slate-500">
                  {editTarget.email} · Role: {editTarget.role}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditTarget(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700">Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700">Phone</label>
                <input
                  type="tel"
                  required
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </div>

              {editTarget.uid !== currentAdmin?.uid && (
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-clinic-600"
                  />
                  Account active
                </label>
              )}

              {editForm.doctorId && (
                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <p className="text-xs font-semibold text-slate-700">Doctor Profile</p>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700">Specialty</label>
                      <input
                        type="text"
                        value={editForm.specialty}
                        onChange={(e) => setEditForm({ ...editForm, specialty: e.target.value })}
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700">
                        Slot duration (mins)
                      </label>
                      <input
                        type="number"
                        min={10}
                        max={120}
                        value={editForm.slotDuration}
                        onChange={(e) =>
                          setEditForm({ ...editForm, slotDuration: Number(e.target.value) })
                        }
                        className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditTarget(null)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700 disabled:opacity-50"
                >
                  {savingEdit ? 'Saving...' : 'Save changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(deactivateTarget)}
        title="Deactivate doctor with upcoming bookings?"
        variant="danger"
        confirmLabel="Yes, deactivate"
        loading={savingEdit}
        description={
          deactivateTarget && (
            <span>
              <strong>Dr. {deactivateTarget.user.name}</strong> has{' '}
              <strong>{deactivateTarget.upcomingCount}</strong> upcoming appointment(s). Are you
              sure you want to deactivate this account?
            </span>
          )
        }
        onConfirm={() => commitEdit(false)}
        onCancel={() => setDeactivateTarget(null)}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete user"
        variant="danger"
        confirmLabel="Delete user"
        loading={deleting}
        description={
          deleteTarget && (
            <span>
              Delete <strong>{deleteTarget.name}</strong> ({deleteTarget.email})? Users with
              existing appointment records cannot be deleted and should be deactivated instead.
            </span>
          )
        }
        onConfirm={handleDeleteUser}
        onCancel={() => setDeleteTarget(null)}
      />

      {seedModalCreds && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-slate-900">Demo Accounts Ready</h2>
            <p className="mt-1 text-sm text-slate-600">
              All seeded accounts use password{' '}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs">
                Password@123
              </code>
              .
            </p>
            <div className="mt-4 overflow-hidden rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
                <thead className="bg-slate-50 font-semibold text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Role</th>
                    <th className="px-3 py-2">Email</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {seedModalCreds.map((c) => (
                    <tr key={c.email}>
                      <td className="px-3 py-2 capitalize font-medium text-slate-800">{c.role}</td>
                      <td className="px-3 py-2 font-mono text-slate-600">{c.email}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setSeedModalCreds(null)}
                className="rounded-lg bg-clinic-600 px-5 py-2 text-sm font-semibold text-white hover:bg-clinic-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
