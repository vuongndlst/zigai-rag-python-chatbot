'use client';

import useSWR from 'swr';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const fetcher = (url: string) => fetch(url).then(res => res.json());

export default function UsersPage() {
  const { data: users, mutate } = useSWR('/api/admin/users', fetcher);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [role, setRole] = useState('user');
  const [isActive, setIsActive] = useState(true);

  if (!users) return <p>Loading...</p>;

  const startEdit = (u: any) => {
    setEditingId(u._id);
    setRole(u.role);
    setIsActive(u.isActive);
  };

  const save = async () => {
    await fetch('/api/admin/users', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: editingId, role, isActive }),
    });
    setEditingId(null);
    mutate();
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Users</h1>
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-200">
            <th className="p-2 border">Username</th>
            <th className="p-2 border">Email</th>
            <th className="p-2 border">Role</th>
            <th className="p-2 border">Active</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u: any) => (
            <tr key={u._id} className="border-b">
              <td className="p-2 border text-blue-600 hover:underline cursor-pointer">
                <a href={`/admin/users/${u._id}`}>{u.username}</a>
              </td>
              <td className="p-2 border">{u.email}</td>
              <td className="p-2 border">
                {editingId === u._id ? (
                  <select className="border" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td className="p-2 border">
                {editingId === u._id ? (
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={e => setIsActive(e.target.checked)}
                  />
                ) : (
                  u.isActive ? 'Yes' : 'No'
                )}
              </td>
              <td className="p-2 border">
                {editingId === u._id ? (
                  <Button size="sm" onClick={save}>
                    Save
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => startEdit(u)}>
                    Edit
                  </Button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
