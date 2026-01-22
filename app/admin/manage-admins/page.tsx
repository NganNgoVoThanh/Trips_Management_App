// app/admin/manage-admins/page.tsx
// Admin Management UI Panel (Super Admin Only)

'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Shield, MapPin, UserPlus, UserMinus, Search, RefreshCw, Activity, Users } from 'lucide-react';
import { AdminHeader } from '@/components/admin/header';
import PendingAdminAssignments from '@/components/admin/pending-admin-assignments';

interface Location {
  id: string;
  name: string;
  code: string;
  province: string;
}

interface AdminUser {
  id: string;
  email: string;
  name: string;
  employee_id: string | null;
  admin_type: 'super_admin' | 'location_admin';
  location_name: string | null;
  location_code: string | null;
  admin_assigned_at: string | null;
  last_login_at: string | null;
}

interface SearchUser {
  id: string;
  email: string;
  name: string;
  employee_id: string | null;
  department: string | null;
  current_role: string;
  current_admin_type: string;
}

export default function ManageAdminsPage() {
  const { data: session } = useSession();
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);

  // Dialog states
  const [grantDialogOpen, setGrantDialogOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchUser | AdminUser | null>(null);
  const [grantAdminType, setGrantAdminType] = useState<'super_admin' | 'location_admin'>('location_admin');
  const [grantLocationId, setGrantLocationId] = useState('');
  const [grantReason, setGrantReason] = useState('');
  const [revokeReason, setRevokeReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminsRes, locationsRes, statsRes] = await Promise.all([
        fetch('/api/admin/manage/admins'),
        fetch('/api/admin/manage/locations'),
        fetch('/api/admin/manage/statistics'),
      ]);

      if (adminsRes.ok) {
        const data = await adminsRes.json();
        setAdmins(data.admins || []);
      }

      if (locationsRes.ok) {
        const data = await locationsRes.json();
        setLocations(data.locations || []);
      }

      if (statsRes.ok) {
        const data = await statsRes.json();
        setStatistics(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearchLoading(true);
    try {
      const res = await fetch(`/api/admin/manage/admins?action=search&query=${encodeURIComponent(query)}&excludeAdmins=true`);
      if (res.ok) {
        const data = await res.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleGrantAdmin = async () => {
    const targetEmail = selectedUser?.email || searchQuery;
    if (!targetEmail || !targetEmail.includes('@')) {
      alert('❌ Please enter a valid email address');
      return;
    }

    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/manage/admins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUserEmail: targetEmail,
          adminType: grantAdminType,
          locationId: grantAdminType === 'location_admin' ? grantLocationId : null,
          reason: grantReason,
        }),
      });

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('Non-JSON response:', text);
        alert(`❌ Server error (${res.status}). Please sign out and sign in again.`);
        return;
      }

      const data = await res.json();

      if (res.ok) {
        if (data.isPending) {
          alert('✅ User not found in system. Admin invitation email has been sent. The user will receive admin role upon first login.');
        } else {
          alert('✅ Admin role granted successfully!');
        }
        setGrantDialogOpen(false);
        resetGrantForm();
        fetchData();
      } else {
        // Show debug info if available
        if (data.debug) {
          console.log('Debug info:', data.debug);
          alert(`❌ ${data.error}\n\nYour current role: ${data.debug.role}\nAdmin type: ${data.debug.adminType}\n\n${data.debug.hint || ''}`);
        } else {
          alert(`❌ Error: ${data.error}`);
        }
      }
    } catch (error) {
      alert('❌ Error granting admin role. Please sign out and sign in again.');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeAdmin = async () => {
    if (!selectedUser) return;

    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/manage/admins?email=${encodeURIComponent(selectedUser.email)}&reason=${encodeURIComponent(revokeReason)}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (res.ok) {
        alert('✅ Admin role revoked successfully!');
        setRevokeDialogOpen(false);
        setRevokeReason('');
        setSelectedUser(null);
        fetchData();
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      alert('❌ Error revoking admin role');
      console.error(error);
    } finally {
      setActionLoading(false);
    }
  };

  const resetGrantForm = () => {
    setSelectedUser(null);
    setGrantAdminType('location_admin');
    setGrantLocationId('');
    setGrantReason('');
    setSearchQuery('');
    setSearchResults([]);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50">
        <AdminHeader />
        <div className="flex items-center justify-center flex-1">
          <RefreshCw className="h-8 w-8 animate-spin text-red-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-gray-50">
      <AdminHeader />
      <div className="container mx-auto p-6 max-w-7xl flex-1">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Management</h1>
          <p className="text-gray-600">Manage Super Admins and Location Admins</p>
        </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card className="p-6 border-l-4 border-l-red-600 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Admins</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.total_admins}</p>
              </div>
              <Users className="h-10 w-10 text-red-600" />
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-purple-600 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Super Admins</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.super_admins}</p>
              </div>
              <Shield className="h-10 w-10 text-purple-600" />
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-blue-600 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Location Admins</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.location_admins}</p>
              </div>
              <MapPin className="h-10 w-10 text-blue-600" />
            </div>
          </Card>
          <Card className="p-6 border-l-4 border-l-green-600 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Locations</p>
                <p className="text-3xl font-bold text-gray-900">{statistics.locations_with_admins}</p>
              </div>
              <Activity className="h-10 w-10 text-green-600" />
            </div>
          </Card>
        </div>
      )}

      {/* Actions */}
      <div className="mb-6 flex gap-4">
        <Button onClick={() => setGrantDialogOpen(true)} className="bg-red-600 hover:bg-red-700">
          <UserPlus className="h-4 w-4 mr-2" />
          Grant Admin Role
        </Button>
        <Button onClick={fetchData} variant="outline" className="border-red-200 text-red-700 hover:bg-red-50">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Pending Admin Assignments Section */}
      <div className="mb-8">
        <PendingAdminAssignments />
      </div>

      {/* Admins List */}
      <Card className="p-6 shadow-sm">
        <h2 className="text-xl font-bold mb-4 text-gray-900">Current Admins</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Type</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Location</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Assigned Date</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {admins.map((admin) => (
                <tr key={admin.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{admin.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{admin.email}</td>
                  <td className="px-4 py-3">
                    {admin.admin_type === 'super_admin' ? (
                      <Badge className="bg-purple-100 text-purple-800 hover:bg-purple-100">Super Admin</Badge>
                    ) : (
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Location Admin</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {admin.location_name ? (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{admin.location_code} - {admin.location_name}</span>
                      </div>
                    ) : (
                      <span className="text-gray-400">All Locations</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {admin.admin_assigned_at ? new Date(admin.admin_assigned_at).toLocaleDateString() : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-700"
                      onClick={() => {
                        setSelectedUser(admin);
                        setRevokeDialogOpen(true);
                      }}
                      disabled={admin.email === session?.user?.email}
                    >
                      <UserMinus className="h-3 w-3 mr-1" />
                      Revoke
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Grant Admin Dialog */}
      <Dialog open={grantDialogOpen} onOpenChange={setGrantDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Grant Admin Role</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {/* User Email */}
            <div>
              <Label>User Email *</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  placeholder="Enter email or search for existing user..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchUsers(e.target.value);
                    // Auto-create a pseudo user object from email
                    if (e.target.value.includes('@')) {
                      setSelectedUser({
                        id: 'new',
                        email: e.target.value,
                        name: e.target.value,
                        employee_id: null,
                        department: null,
                        current_role: 'user',
                        current_admin_type: 'none'
                      });
                    }
                  }}
                />
                <Button variant="outline" onClick={() => searchUsers(searchQuery)}>
                  <Search className="h-4 w-4" />
                </Button>
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="mt-2 border rounded-lg max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <div
                      key={user.id}
                      onClick={() => {
                        setSelectedUser(user);
                        setSearchQuery(user.email);
                        setSearchResults([]);
                      }}
                      className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0"
                    >
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-600">{user.email}</div>
                      {user.department && (
                        <div className="text-xs text-gray-500">{user.department}</div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Show fields when email is valid or user is selected */}
            {(selectedUser || searchQuery.includes('@')) && (
              <>
                {/* Admin Type */}
                <div>
                  <Label>Admin Type</Label>
                  <Select value={grantAdminType} onValueChange={(value: any) => setGrantAdminType(value)}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="super_admin">Super Admin (All Locations)</SelectItem>
                      <SelectItem value="location_admin">Location Admin (Specific Location)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Location (if location_admin) */}
                {grantAdminType === 'location_admin' && (
                  <div>
                    <Label>Location</Label>
                    <Select value={grantLocationId} onValueChange={setGrantLocationId}>
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select location..." />
                      </SelectTrigger>
                      <SelectContent>
                        {locations.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Reason */}
                <div>
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    placeholder="Why are you granting admin role to this user?"
                    value={grantReason}
                    onChange={(e) => setGrantReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setGrantDialogOpen(false); resetGrantForm(); }}>
              Cancel
            </Button>
            <Button
              className="bg-red-600 hover:bg-red-700"
              onClick={handleGrantAdmin}
              disabled={(!selectedUser && !searchQuery.includes('@')) || (grantAdminType === 'location_admin' && !grantLocationId) || actionLoading}
            >
              {actionLoading ? 'Processing...' : 'Grant Admin Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Admin Dialog */}
      <Dialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke Admin Role</DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {selectedUser && (
              <>
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm text-red-800">
                    You are about to revoke admin role from:
                  </p>
                  <p className="font-bold text-red-900 mt-2">{selectedUser.name}</p>
                  <p className="text-sm text-red-700">{selectedUser.email}</p>
                </div>

                <div>
                  <Label>Reason (Optional)</Label>
                  <Textarea
                    placeholder="Why are you revoking admin role?"
                    value={revokeReason}
                    onChange={(e) => setRevokeReason(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRevokeDialogOpen(false); setRevokeReason(''); setSelectedUser(null); }}>
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700" onClick={handleRevokeAdmin} disabled={actionLoading}>
              {actionLoading ? 'Processing...' : 'Revoke Admin Role'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
