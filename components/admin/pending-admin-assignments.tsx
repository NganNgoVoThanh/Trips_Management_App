'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Clock, Mail, XCircle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface PendingAssignment {
  id: string;
  email: string;
  admin_type: 'super_admin' | 'location_admin';
  location_id: string | null;
  location_name: string | null;
  assigned_by_email: string;
  assigned_by_name: string | null;
  reason: string | null;
  expires_at: string;
  activated: boolean;
  activated_at: string | null;
  invitation_sent: boolean;
  invitation_sent_at: string | null;
  reminder_sent_count: number;
  created_at: string;
}

interface Statistics {
  total: number;
  active: number;
  expired: number;
  activated: number;
  pending_invitation: number;
}

export default function PendingAdminAssignments() {
  const [pendingAssignments, setPendingAssignments] = useState<PendingAssignment[]>([]);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingEmail, setProcessingEmail] = useState<string | null>(null);
  const [showExpired, setShowExpired] = useState(false);
  const [showActivated, setShowActivated] = useState(false);

  const fetchPendingAssignments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (showExpired) params.append('includeExpired', 'true');
      if (showActivated) params.append('includeActivated', 'true');

      const response = await fetch(`/api/admin/pending-assignments?${params}`);
      const data = await response.json();

      if (data.success) {
        setPendingAssignments(data.pendingAssignments);
        setStatistics(data.statistics);
      } else {
        toast.error('Failed to fetch pending assignments');
      }
    } catch (error) {
      console.error('Error fetching pending assignments:', error);
      toast.error('Failed to fetch pending assignments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPendingAssignments();
  }, [showExpired, showActivated]);

  const handleResendInvitation = async (email: string) => {
    setProcessingEmail(email);
    try {
      const response = await fetch('/api/admin/pending-assignments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, action: 'resend_invitation' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Invitation email sent successfully');
        fetchPendingAssignments();
      } else {
        toast.error(data.error || 'Failed to send invitation');
      }
    } catch (error) {
      console.error('Error resending invitation:', error);
      toast.error('Failed to send invitation');
    } finally {
      setProcessingEmail(null);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!confirm(`Are you sure you want to revoke the pending assignment for ${email}?`)) {
      return;
    }

    setProcessingEmail(email);
    try {
      const response = await fetch('/api/admin/pending-assignments', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reason: 'Revoked by admin' }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Pending assignment revoked successfully');
        fetchPendingAssignments();
      } else {
        toast.error(data.error || 'Failed to revoke assignment');
      }
    } catch (error) {
      console.error('Error revoking assignment:', error);
      toast.error('Failed to revoke assignment');
    } finally {
      setProcessingEmail(null);
    }
  };

  const getStatusBadge = (assignment: PendingAssignment) => {
    const now = new Date();
    const expiresAt = new Date(assignment.expires_at);

    if (assignment.activated) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
          <CheckCircle className="w-3 h-3 mr-1" />
          Activated
        </Badge>
      );
    }

    if (expiresAt < now) {
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100">
          <XCircle className="w-3 h-3 mr-1" />
          Expired
        </Badge>
      );
    }

    return (
      <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">
        <Clock className="w-3 h-3 mr-1" />
        Pending
      </Badge>
    );
  };

  const getDaysRemaining = (expiresAt: string) => {
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffTime = expires.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Admin Assignments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{statistics.total}</div>
              <div className="text-sm text-gray-600">Total</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-yellow-600">{statistics.active}</div>
              <div className="text-sm text-gray-600">Active</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-600">{statistics.activated}</div>
              <div className="text-sm text-gray-600">Activated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-red-600">{statistics.expired}</div>
              <div className="text-sm text-gray-600">Expired</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-blue-600">{statistics.pending_invitation}</div>
              <div className="text-sm text-gray-600">Pending Email</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pending Admin Assignments</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowExpired(!showExpired)}
                className={showExpired ? 'bg-gray-100' : ''}
              >
                {showExpired ? 'Hide' : 'Show'} Expired
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowActivated(!showActivated)}
                className={showActivated ? 'bg-gray-100' : ''}
              >
                {showActivated ? 'Hide' : 'Show'} Activated
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPendingAssignments}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {pendingAssignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <AlertCircle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No pending admin assignments found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Location
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned By
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Expires
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {pendingAssignments.map((assignment) => {
                    const daysRemaining = getDaysRemaining(assignment.expires_at);
                    const isExpired = daysRemaining < 0;

                    return (
                      <tr key={assignment.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {assignment.email}
                          </div>
                          {assignment.invitation_sent && (
                            <div className="text-xs text-gray-500 flex items-center mt-1">
                              <Mail className="w-3 h-3 mr-1" />
                              Invitation sent {assignment.reminder_sent_count > 0 && `(${assignment.reminder_sent_count} reminders)`}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <Badge variant="outline">
                            {assignment.admin_type === 'super_admin' ? 'Super Admin' : 'Location Admin'}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.location_name || '-'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {assignment.assigned_by_name || assignment.assigned_by_email}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          {getStatusBadge(assignment)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm">
                          {assignment.activated ? (
                            <span className="text-green-600">
                              {new Date(assignment.activated_at!).toLocaleDateString()}
                            </span>
                          ) : isExpired ? (
                            <span className="text-red-600">
                              Expired {Math.abs(daysRemaining)} days ago
                            </span>
                          ) : (
                            <span className={daysRemaining <= 7 ? 'text-orange-600 font-medium' : 'text-gray-600'}>
                              {daysRemaining} days
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm space-x-2">
                          {!assignment.activated && !isExpired && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResendInvitation(assignment.email)}
                                disabled={processingEmail === assignment.email}
                              >
                                <Mail className="w-4 h-4 mr-1" />
                                {assignment.invitation_sent ? 'Resend' : 'Send'}
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRevoke(assignment.email)}
                                disabled={processingEmail === assignment.email}
                                className="text-red-600 hover:text-red-700"
                              >
                                <XCircle className="w-4 h-4 mr-1" />
                                Revoke
                              </Button>
                            </>
                          )}
                          {isExpired && !assignment.activated && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleRevoke(assignment.email)}
                              disabled={processingEmail === assignment.email}
                              className="text-red-600 hover:text-red-700"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Remove
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Help Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="pt-6">
          <div className="flex items-start">
            <AlertCircle className="w-5 h-5 text-blue-600 mr-3 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-medium mb-2">About Pending Admin Assignments:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-800">
                <li>When you grant admin role to an email that hasn't logged in yet, a pending assignment is created.</li>
                <li>The user will receive an invitation email with instructions to login.</li>
                <li>Upon their first login, the admin role will be automatically activated.</li>
                <li>Pending assignments expire after 30 days if not activated.</li>
                <li>You can resend invitation emails or revoke assignments at any time.</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
