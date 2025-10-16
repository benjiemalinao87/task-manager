import { useState, useEffect } from 'react';
import { Users, Mail, Shield, Crown, UserPlus, Trash2, Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { apiClient } from '../lib/api-client';
import { TeamNavigation } from './TeamNavigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface Member {
  user_id: string;
  name: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
}

interface Invitation {
  id: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending' | 'accepted' | 'declined' | 'expired';
  invited_by: string;
  inviter_name?: string;
  created_at: string;
  expires_at: string;
}

export function TeamManagement() {
  const { currentWorkspace } = useWorkspace();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member'>('member');
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [cancellingInviteId, setCancellingInviteId] = useState<string | null>(null);
  const [updatingRoleUserId, setUpdatingRoleUserId] = useState<string | null>(null);

  useEffect(() => {
    if (currentWorkspace) {
      loadTeamData();
    }
  }, [currentWorkspace]);

  const loadTeamData = async () => {
    if (!currentWorkspace) return;

    setIsLoading(true);
    try {
      const [membersRes, invitationsRes] = await Promise.all([
        apiClient.getWorkspaceMembers(currentWorkspace.id),
        apiClient.getWorkspaceInvitations(currentWorkspace.id),
      ]);
      setMembers(membersRes.members || []);
      setInvitations(invitationsRes.invitations || []);
    } catch (error) {
      console.error('Error loading team data:', error);
      alert('Failed to load team data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInviteMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace) return;

    setIsInviting(true);
    try {
      await apiClient.inviteToWorkspace(currentWorkspace.id, {
        email: inviteEmail,
        role: inviteRole,
      });

      alert(`Invitation sent to ${inviteEmail}!`);
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteForm(false);
      await loadTeamData();
    } catch (error: any) {
      console.error('Error inviting member:', error);
      alert(error.message || 'Failed to send invitation. Please try again.');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string, memberName: string) => {
    if (!currentWorkspace) return;
    if (!confirm(`Are you sure you want to remove ${memberName} from this workspace?`)) {
      return;
    }

    setRemovingMemberId(userId);
    try {
      await apiClient.removeWorkspaceMember(currentWorkspace.id, userId);
      alert(`${memberName} has been removed from the workspace.`);
      await loadTeamData();
    } catch (error: any) {
      console.error('Error removing member:', error);
      alert(error.message || 'Failed to remove member. Please try again.');
    } finally {
      setRemovingMemberId(null);
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!currentWorkspace) return;
    if (!confirm(`Are you sure you want to cancel the invitation to ${email}?`)) {
      return;
    }

    setCancellingInviteId(invitationId);
    try {
      await apiClient.cancelInvitation(currentWorkspace.id, invitationId);
      alert('Invitation cancelled.');
      await loadTeamData();
    } catch (error: any) {
      console.error('Error cancelling invitation:', error);
      alert(error.message || 'Failed to cancel invitation. Please try again.');
    } finally {
      setCancellingInviteId(null);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'admin' | 'member', memberName: string) => {
    if (!currentWorkspace) return;
    
    setUpdatingRoleUserId(userId);
    try {
      await apiClient.updateWorkspaceMemberRole(currentWorkspace.id, userId, newRole);
      alert(`${memberName}'s role has been updated to ${newRole}.`);
      await loadTeamData();
    } catch (error: any) {
      console.error('Error updating member role:', error);
      alert(error.message || 'Failed to update member role. Please try again.');
    } finally {
      setUpdatingRoleUserId(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner':
        return <Crown className="w-4 h-4 text-purple-600" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-blue-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return 'bg-purple-100 text-purple-700 border-purple-300';
      case 'admin':
        return 'bg-blue-100 text-blue-700 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'declined':
        return <XCircle className="w-4 h-4 text-red-600" />;
      case 'expired':
        return <Clock className="w-4 h-4 text-gray-600" />;
      default:
        return <Clock className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return 'bg-green-100 text-green-700 border-green-300';
      case 'declined':
        return 'bg-red-100 text-red-700 border-red-300';
      case 'expired':
        return 'bg-gray-100 text-gray-700 border-gray-300';
      default:
        return 'bg-yellow-100 text-yellow-700 border-yellow-300';
    }
  };

  const canManageTeam = currentWorkspace?.role === 'owner' || currentWorkspace?.role === 'admin';
  const isOwner = currentWorkspace?.role === 'owner';

  if (!currentWorkspace) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex items-center justify-center py-20">
          <div className="bg-[#0f1b2e] rounded-2xl shadow-lg p-12 text-center border border-gray-800">
            <AlertCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Workspace Selected</h3>
            <p className="text-gray-400">Please select a workspace to manage your team.</p>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0a1628] text-white">
        <TeamNavigation />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a1628] text-white">
      <TeamNavigation />

      <div className="px-6 py-8 max-w-[1600px] mx-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">Team Management</h1>
                <p className="text-blue-100">Manage members and invitations for {currentWorkspace.name}</p>
              </div>
              {canManageTeam && (
                <button
                  onClick={() => setShowInviteForm(!showInviteForm)}
                  className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-3 px-6 rounded-xl transition-all flex items-center gap-2 shadow-md hover:shadow-lg"
                >
                  <UserPlus className="w-5 h-5" />
                  Invite Member
                </button>
              )}
            </div>
          </div>

      {/* Invite Form */}
      {showInviteForm && canManageTeam && (
        <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-blue-400" />
            Invite New Member
          </h2>
          <form onSubmit={handleInviteMember} className="space-y-4">
            <div>
              <label htmlFor="inviteEmail" className="block text-sm font-semibold text-gray-300 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                id="inviteEmail"
                required
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#1a2332] border-2 border-gray-700 text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all placeholder-gray-500"
                placeholder="colleague@example.com"
              />
            </div>
            <div>
              <label htmlFor="inviteRole" className="block text-sm font-semibold text-gray-300 mb-2">
                Role *
              </label>
              <Select
                value={inviteRole}
                onValueChange={(value) => setInviteRole(value as 'admin' | 'member')}
              >
                <SelectTrigger className="w-full h-[50px] px-4 border-2 border-gray-700 bg-[#1a2332] text-white rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4 text-gray-600" />
                      <div>
                        <div className="font-medium">Member</div>
                        <div className="text-xs text-gray-500">Can view assigned tasks and track time</div>
                      </div>
                    </div>
                  </SelectItem>
                  <SelectItem value="admin" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-blue-600" />
                      <div>
                        <div className="font-medium">Admin</div>
                        <div className="text-xs text-gray-500">Can assign tasks and view all reports</div>
                      </div>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={isInviting}
                className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-3 px-6 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
              >
                {isInviting ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Send Invitation
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => setShowInviteForm(false)}
                disabled={isInviting}
                className="px-6 py-3 border-2 border-gray-600 rounded-xl text-gray-300 font-bold hover:bg-gray-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Team Members */}
      <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Users className="w-6 h-6 text-white" />
          Team Members ({members.length})
        </h2>
        <div className="space-y-3">
          {members.map((member) => (
            <div
              key={member.user_id}
              className="flex items-center justify-between p-4 bg-[#1a2332] rounded-xl border border-gray-700 hover:shadow-md hover:border-gray-600 transition-all"
            >
              <div className="flex items-center gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                  {member.name?.charAt(0).toUpperCase() || member.email.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-semibold text-white">{member.name || member.email}</div>
                  <div className="text-sm text-gray-400">{member.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    Joined {new Date(member.joined_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {/* Show dropdown for owner to change roles, otherwise show static badge */}
                {isOwner && member.role !== 'owner' ? (
                  <Select
                    value={member.role}
                    onValueChange={(value) => handleRoleChange(member.user_id, value as 'admin' | 'member', member.name || member.email)}
                    disabled={updatingRoleUserId === member.user_id}
                  >
                    <SelectTrigger className={`w-[140px] h-[44px] px-4 border-2 rounded-xl font-bold ${getRoleBadge(member.role)} hover:opacity-80 transition-all disabled:opacity-50`}>
                      <div className="flex items-center gap-2">
                        {updatingRoleUserId === member.user_id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          getRoleIcon(member.role)
                        )}
                        <SelectValue />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Shield className="w-4 h-4 text-blue-600" />
                          <span className="font-medium">Admin</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="member" className="cursor-pointer">
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-600" />
                          <span className="font-medium">Member</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <span className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold border ${getRoleBadge(member.role)}`}>
                    {getRoleIcon(member.role)}
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                )}
                {canManageTeam && member.role !== 'owner' && (
                  <button
                    onClick={() => handleRemoveMember(member.user_id, member.name || member.email)}
                    disabled={removingMemberId === member.user_id}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove member"
                  >
                    {removingMemberId === member.user_id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className="bg-[#0f1b2e] rounded-2xl shadow-lg border border-gray-700 p-6">
          <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Mail className="w-6 h-6 text-white" />
            Invitations ({invitations.length})
          </h2>
          <div className="space-y-3">
            {invitations.map((invitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-[#1a2332] rounded-xl border border-gray-700 hover:shadow-md hover:border-gray-600 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                    {invitation.email.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-white">{invitation.email}</div>
                    <div className="text-sm text-gray-400">
                      Invited by {invitation.inviter_name || 'Unknown'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {invitation.status === 'pending' && `Expires ${new Date(invitation.expires_at).toLocaleDateString()}`}
                      {invitation.status !== 'pending' && `${invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold border ${getRoleBadge(invitation.role)}`}>
                    {getRoleIcon(invitation.role)}
                    {invitation.role.charAt(0).toUpperCase() + invitation.role.slice(1)}
                  </span>
                  <span className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl font-bold border ${getStatusBadge(invitation.status)}`}>
                    {getStatusIcon(invitation.status)}
                    {invitation.status.charAt(0).toUpperCase() + invitation.status.slice(1)}
                  </span>
                  {canManageTeam && invitation.status === 'pending' && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                      disabled={cancellingInviteId === invitation.id}
                      className="bg-red-600 hover:bg-red-700 text-white p-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Cancel invitation"
                    >
                      {cancellingInviteId === invitation.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <XCircle className="w-4 h-4" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Permission Notice for Members */}
      {!canManageTeam && (
        <div className="bg-blue-900/20 border-2 border-blue-700 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-blue-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="font-bold text-blue-300 mb-1">View Only</h3>
              <p className="text-sm text-blue-200">
                You can view team members but cannot invite or remove members. Contact your workspace owner or admin to manage team membership.
              </p>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
}
