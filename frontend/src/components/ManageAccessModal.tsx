import { useState, useEffect } from 'react';
import { getUsers, type User } from '../api/users';
import {
  getWorkspaceMembers,
  addWorkspaceMember,
  removeWorkspaceMember,
  transferOwnership,
  type WorkspaceMember,
} from '../api/workspaces';

interface ManageAccessModalProps {
  workspaceId: number;
  workspaceName: string;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageAccessModal({
  workspaceId,
  workspaceName,
  onClose,
  onUpdate,
}: ManageAccessModalProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [allUsers, workspaceMembers] = await Promise.all([
        getUsers(),
        getWorkspaceMembers(workspaceId),
      ]);
      setUsers(allUsers);
      setMembers(workspaceMembers);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleMember(userId: number, isCurrentlyMember: boolean) {
    setError(null);
    try {
      if (isCurrentlyMember) {
        await removeWorkspaceMember(workspaceId, userId);
      } else {
        await addWorkspaceMember(workspaceId, userId);
      }
      await loadData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update member');
    }
  }

  async function handleTransferOwnership(newOwnerId: number) {
    if (!confirm('Are you sure you want to transfer ownership? You will become a member.')) {
      return;
    }

    setError(null);
    try {
      await transferOwnership(workspaceId, newOwnerId);
      await loadData();
      onUpdate();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to transfer ownership');
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        backdropFilter: 'blur(4px)'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          padding: '24px',
          borderRadius: '12px',
          minWidth: '480px',
          maxWidth: '600px',
          maxHeight: '80vh',
          overflow: 'auto',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ 
          marginTop: 0,
          marginBottom: '8px',
          fontSize: '20px',
          fontWeight: 700,
          color: '#111827'
        }}>
          Manage Access
        </h2>
        <p style={{
          marginTop: 0,
          marginBottom: '20px',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {workspaceName}
        </p>

        {error && (
          <div style={{
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: '#fee2e2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            color: '#991b1b',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        {loading ? (
          <div style={{ 
            padding: '32px',
            textAlign: 'center',
            color: '#6b7280',
            fontSize: '14px'
          }}>
            Loading...
          </div>
        ) : (
          <div style={{ marginBottom: '20px' }}>
            {users.map((user) => {
              const member = members.find((m) => m.user_id === user.id);
              const isMember = !!member;
              const isOwner = member?.role === 'owner';

              return (
                <div
                  key={user.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px',
                    marginBottom: '8px',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    backgroundColor: isMember ? '#f9fafb' : '#ffffff',
                    transition: 'all 0.15s'
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <label 
                    style={{ 
                      display: 'flex',
                      alignItems: 'center',
                      cursor: isOwner ? 'default' : 'pointer',
                      flex: 1
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      type="checkbox"
                      checked={isMember}
                      disabled={isOwner}
                      onChange={(e) => {
                        e.stopPropagation();
                        if (!isOwner) {
                          handleToggleMember(user.id, isMember);
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      style={{ 
                        marginRight: '12px',
                        width: '18px',
                        height: '18px',
                        cursor: isOwner ? 'default' : 'pointer'
                      }}
                    />
                    <span style={{
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#111827'
                    }}>
                      {user.username}
                      {user.is_admin && (
                        <span style={{ 
                          marginLeft: '8px',
                          fontSize: '12px',
                          color: '#6b7280',
                          backgroundColor: '#f3f4f6',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 500
                        }}>
                          Admin
                        </span>
                      )}
                      {isOwner && (
                        <span style={{ 
                          marginLeft: '8px',
                          fontSize: '12px',
                          color: '#2563eb',
                          backgroundColor: '#dbeafe',
                          padding: '2px 8px',
                          borderRadius: '12px',
                          fontWeight: 500
                        }}>
                          Owner
                        </span>
                      )}
                    </span>
                  </label>

                  {isMember && !isOwner && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTransferOwnership(user.id);
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#f59e0b',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 500,
                        transition: 'background-color 0.15s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d97706'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f59e0b'}
                    >
                      Transfer Ownership
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={onClose}
          style={{
            width: '100%',
            padding: '10px 16px',
            backgroundColor: '#f3f4f6',
            color: '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: 500,
            transition: 'background-color 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
        >
          Close
        </button>
      </div>
    </div>
  );
}
