import { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, deleteUser, type User } from '../api/users';
import useAuthStore from '../store/authStore';

type Tab = 'account' | 'users';

export default function UserManagement() {
  const [activeTab, setActiveTab] = useState<Tab>('account');
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Create user form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
  // Edit user form state
  const [editingUserId, setEditingUserId] = useState<number | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editPassword, setEditPassword] = useState('');
  
  // Account form state
  const [showChangeUsername, setShowChangeUsername] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [accountUsername, setAccountUsername] = useState('');
  const [accountPassword, setAccountPassword] = useState('');
  
  const user = useAuthStore((state) => state.user);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    if (activeTab === 'users' && user?.is_admin) {
      fetchUsers();
    }
  }, [activeTab, user]);

  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await createUser({
        username: newUsername,
        password: newPassword,
        is_admin: false,
      });
      setNewUsername('');
      setNewPassword('');
      setShowCreateForm(false);
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    }
  }

  async function handleUpdateUser(userId: number, isCurrentUser: boolean) {
    setError(null);
    try {
      const data: any = {};
      if (editUsername) data.username = editUsername;
      if (editPassword) data.password = editPassword;
      
      const updatedUser = await updateUser(userId, data);
      
      if (isCurrentUser && token) {
        setAuth(token, updatedUser);
      }
      
      setEditingUserId(null);
      setEditUsername('');
      setEditPassword('');
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update user');
    }
  }

  async function handleDeleteUser(userId: number, isCurrentUser: boolean) {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    setError(null);
    try {
      await deleteUser(userId);
      
      if (isCurrentUser) {
        clearAuth();
        const baseTag = document.querySelector('base');
        const basename = baseTag?.getAttribute('href')?.replace(/\/$/, '') || '';
        window.location.href = basename + '/login';
        return;
      }
      
      fetchUsers();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete user');
    }
  }

  async function handleUpdateAccount(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    
    setError(null);
    try {
      const data: any = {};
      if (accountUsername) data.username = accountUsername;
      if (accountPassword) data.password = accountPassword;
      
      const updatedUser = await updateUser(user.id, data);
      
      if (token) {
        setAuth(token, updatedUser);
      }
      
      setAccountUsername('');
      setAccountPassword('');
      setShowChangeUsername(false);
      setShowChangePassword(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update account');
    }
  }

  async function handleDeleteAccount() {
    if (!user) return;
    if (!confirm('Are you sure you want to delete your account? This cannot be undone.')) return;
    
    setError(null);
    try {
      await deleteUser(user.id);
      clearAuth();
      const baseTag = document.querySelector('base');
      const basename = baseTag?.getAttribute('href')?.replace(/\/$/, '') || '';
      window.location.href = basename + '/login';
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete account');
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Tabs */}
      <div style={{ 
        display: 'flex',
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '16px',
        gap: '4px'
      }}>
        <button
          onClick={() => setActiveTab('account')}
          style={{
            padding: '8px 16px',
            border: 'none',
            borderBottom: activeTab === 'account' ? '2px solid #2563eb' : '2px solid transparent',
            background: 'transparent',
            cursor: 'pointer',
            fontWeight: activeTab === 'account' ? 600 : 400,
            color: activeTab === 'account' ? '#2563eb' : '#6b7280',
            fontSize: '14px',
            transition: 'all 0.15s'
          }}
        >
          Account
        </button>
        {user?.is_admin && (
          <button
            onClick={() => setActiveTab('users')}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderBottom: activeTab === 'users' ? '2px solid #2563eb' : '2px solid transparent',
              background: 'transparent',
              cursor: 'pointer',
              fontWeight: activeTab === 'users' ? 600 : 400,
              color: activeTab === 'users' ? '#2563eb' : '#6b7280',
              fontSize: '14px',
              transition: 'all 0.15s'
            }}
          >
            Users
          </button>
        )}
      </div>

      {/* Error display */}
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

      {/* Account Tab */}
      {activeTab === 'account' && user && (
        <div>
          <div style={{
            padding: '16px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ 
              fontSize: '12px',
              color: '#6b7280',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Username
            </div>
            <div style={{ 
              fontSize: '16px',
              color: '#111827',
              fontWeight: 600
            }}>
              {user.username}
            </div>
          </div>

          {!showChangeUsername && !showChangePassword && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button
                onClick={() => setShowChangeUsername(true)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Change Username
              </button>
              <button
                onClick={() => setShowChangePassword(true)}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#2563eb',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1d4ed8'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
              >
                Change Password
              </button>
              <button
                onClick={handleDeleteAccount}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#ef4444',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'background-color 0.15s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
              >
                Delete Account
              </button>
            </div>
          )}

          {showChangeUsername && (
            <form onSubmit={handleUpdateAccount} style={{ 
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  New Username:
                </label>
                <input
                  type="text"
                  value={accountUsername}
                  onChange={(e) => setAccountUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangeUsername(false);
                    setAccountUsername('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {showChangePassword && (
            <form onSubmit={handleUpdateAccount} style={{ 
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  New Password:
                </label>
                <input
                  type="password"
                  value={accountPassword}
                  onChange={(e) => setAccountPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowChangePassword(false);
                    setAccountPassword('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Users Tab (Admin Only) */}
      {activeTab === 'users' && user?.is_admin && (
        <div>
          {!showCreateForm && (
            <button
              onClick={() => setShowCreateForm(true)}
              style={{
                width: '100%',
                padding: '10px 16px',
                marginBottom: '16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'background-color 0.15s'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
              Create User
            </button>
          )}

          {showCreateForm && (
            <form onSubmit={handleCreateUser} style={{ 
              marginBottom: '16px',
              padding: '16px',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              backgroundColor: '#ffffff'
            }}>
              <h3 style={{ 
                marginTop: 0,
                marginBottom: '16px',
                fontSize: '16px',
                fontWeight: 600,
                color: '#111827'
              }}>
                Create New User
              </h3>
              <div style={{ marginBottom: '12px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Username:
                </label>
                <input
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block',
                  marginBottom: '6px',
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#374151'
                }}>
                  Password:
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'inherit'
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="submit"
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                >
                  Create
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setNewUsername('');
                    setNewPassword('');
                  }}
                  style={{
                    flex: 1,
                    padding: '8px 16px',
                    backgroundColor: '#f3f4f6',
                    color: '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: 500,
                    transition: 'background-color 0.15s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {loading ? (
            <div style={{ 
              padding: '16px',
              color: '#6b7280',
              fontSize: '14px',
              textAlign: 'center'
            }}>
              Loading users...
            </div>
          ) : (
            <div>
              {users.map((u) => {
                const isCurrentUser = u.id === user.id;
                const isOtherAdmin = u.is_admin && !isCurrentUser;
                const isEditing = editingUserId === u.id;

                return (
                  <div
                    key={u.id}
                    style={{
                      padding: '12px',
                      marginBottom: '8px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      backgroundColor: '#ffffff'
                    }}
                  >
                    {!isEditing ? (
                      <div style={{ 
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{ 
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: 500
                        }}>
                          {u.username}
                          {u.is_admin && (
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
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setEditUsername('');
                              setEditPassword('');
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
                            Edit
                          </button>
                          {!isOtherAdmin && (
                            <button
                              onClick={() => handleDeleteUser(u.id, isCurrentUser)}
                              style={{
                                padding: '6px 12px',
                                backgroundColor: '#ef4444',
                                color: 'white',
                                border: 'none',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontSize: '13px',
                                fontWeight: 500,
                                transition: 'background-color 0.15s'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#dc2626'}
                              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#ef4444'}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p style={{ 
                          marginTop: 0,
                          marginBottom: '12px',
                          fontSize: '14px',
                          fontWeight: 600,
                          color: '#111827'
                        }}>
                          Editing: {u.username}
                        </p>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            display: 'block',
                            marginBottom: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#6b7280'
                          }}>
                            New Username (leave blank to keep current):
                          </label>
                          <input
                            type="text"
                            value={editUsername}
                            onChange={(e) => setEditUsername(e.target.value)}
                            placeholder={u.username}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                        <div style={{ marginBottom: '12px' }}>
                          <label style={{ 
                            display: 'block',
                            marginBottom: '6px',
                            fontSize: '13px',
                            fontWeight: 500,
                            color: '#6b7280'
                          }}>
                            New Password (leave blank to keep current):
                          </label>
                          <input
                            type="password"
                            value={editPassword}
                            onChange={(e) => setEditPassword(e.target.value)}
                            style={{
                              width: '100%',
                              padding: '8px 12px',
                              border: '1px solid #d1d5db',
                              borderRadius: '6px',
                              fontSize: '14px',
                              fontFamily: 'inherit'
                            }}
                          />
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={() => handleUpdateUser(u.id, isCurrentUser)}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              backgroundColor: '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#059669'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#10b981'}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setEditUsername('');
                              setEditPassword('');
                            }}
                            style={{
                              flex: 1,
                              padding: '8px 16px',
                              backgroundColor: '#f3f4f6',
                              color: '#374151',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: 'pointer',
                              fontSize: '14px',
                              fontWeight: 500,
                              transition: 'background-color 0.15s'
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e5e7eb'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#f3f4f6'}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
