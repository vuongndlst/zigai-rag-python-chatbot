'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Card } from '@/components/ui/card';

export default function UserDetailsPage() {
  const { id } = useParams();
  const [user, setUser] = useState<any>(null);
  const [chats, setChats] = useState<any[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userRes = await fetch(`/api/admin/users/${id}`);
        if (!userRes.ok) throw new Error('Failed to load user data.');
        const userData = await userRes.json();

        const chatRes = await fetch(`/api/admin/user-chats/${id}`);
        if (!chatRes.ok) throw new Error('Failed to load chat history.');
        const chatData = await chatRes.json();

        setUser(userData);
        setChats(chatData);
      } catch (err: any) {
        setError(err.message || 'Unexpected error');
      } finally {
        setLoading(false);
      }
    };

    if (id) fetchData();
  }, [id]);

  if (loading) return <p className="p-4">Loading...</p>;
  if (error) return <p className="p-4 text-red-500">{error}</p>;
  if (!user) return <p className="p-4 text-red-500">User not found.</p>;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">User Details</h1>

      <Card className="p-4 space-y-2">
        <p><strong>Username:</strong> {user.username}</p>
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Role:</strong> {user.role}</p>
        <p><strong>Status:</strong> {user.isActive ? 'Active' : 'Inactive'}</p>
        <p><strong>Created at:</strong> {new Date(user.createdAt).toLocaleString()}</p>
      </Card>

      <h2 className="text-xl font-semibold">Chat History</h2>
      {chats.length === 0 ? (
        <p>No chat history found.</p>
      ) : (
        <ul className="space-y-3">
          {chats.map(chat => (
            <Card
              key={chat._id}
              className="p-3 text-sm cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setSelectedChatId(prev => (prev === chat._id ? null : chat._id))
              }
            >
              <p><strong>Time:</strong> {new Date(chat.createdAt).toLocaleString()}</p>
              <p><strong>Prompt:</strong> {chat.messages?.[0]?.content || 'N/A'}</p>
              <p><strong>Response:</strong> {chat.messages?.[1]?.content || 'N/A'}</p>

              {selectedChatId === chat._id && (
                <div className="mt-2 border-t pt-2 space-y-1">
                  <p className="font-semibold text-gray-700">Full Conversation:</p>
                  {chat.messages.map((m: any, idx: number) => (
                    <p key={idx}>
                      <strong>{m.role}:</strong> {m.content}
                    </p>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
