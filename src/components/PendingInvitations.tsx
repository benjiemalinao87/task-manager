import { useState, useEffect } from 'react';
import { Mail, CheckCircle, XCircle, Users, Clock, Loader2 } from 'lucide-react';
import { apiClient } from '../lib/api-client';
import { useWorkspace } from '../context/WorkspaceContext';

interface Invitation {
  id: string;
  workspace_id: string;
  workspace_name: string;
  email: string;
  role: 'admin' | 'member';
  status: 'pending';
  invited_by: string;
  inviter_name?: string;
  created_at: string;
  expires_at: string;
  token: string;
}

export function PendingInvitations() {
  const { refreshWorkspaces } = useWorkspace();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [showInvitations, setShowInvitations] = useState(true);

  useEffect(() => {
    loadPendingInvitations();
  }, []);

  const loadPendingInvitations = async () => {
    try {
      setIsLoading(true);
      const response = await apiClient.getPendingInvitations();
      setInvitations(response.invitations || []);
    } catch (error) {
      console.error('Error loading pending invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async (invitation: Invitation) => {
    setProcessingId(invitation.id);
    try {
      await apiClient.acceptInvitation(invitation.token);
      
      // Refresh workspaces to show the new one
      await refreshWorkspaces();
      
      // Remove this invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      // Show success message
      alert(`✅ Successfully joined ${invitation.workspace_name}!`);
    } catch (error: any) {
      console.error('Error accepting invitation:', error);
      alert(error.message || 'Failed to accept invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitation: Invitation) => {
    if (!confirm(`Are you sure you want to decline the invitation to ${invitation.workspace_name}?`)) {
      return;
    }

    setProcessingId(invitation.id);
    try {
      await apiClient.declineInvitation(invitation.token);
      
      // Remove this invitation from the list
      setInvitations(prev => prev.filter(inv => inv.id !== invitation.id));
      
      alert('Invitation declined.');
    } catch (error: any) {
      console.error('Error declining invitation:', error);
      alert(error.message || 'Failed to decline invitation. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Don't render anything if loading or no invitations
  if (isLoading) return null;
  if (invitations.length === 0) return null;
  if (!showInvitations) return null;

  return (
    <div className="mb-6 space-y-3">
      {invitations.map((invitation) => {
        const expired = isExpired(invitation.expires_at);
        
        return (
          <div
            key={invitation.id}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl shadow-lg p-6 text-white border-2 border-blue-400 animate-fade-in"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left side - Icon and content */}
              <div className="flex gap-4 flex-1">
                <div className="bg-white/20 backdrop-blur-sm p-3 rounded-xl h-fit">
                  <Mail className="w-7 h-7 text-white" />
                </div>
                
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-white">
                      Workspace Invitation
                    </h3>
                    {expired && (
                      <span className="bg-red-500/30 text-red-100 text-xs font-semibold px-3 py-1 rounded-full border border-red-300">
                        Expired
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-blue-50">
                    <p className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      <span>
                        <span className="font-semibold text-white">{invitation.inviter_name || 'Someone'}</span>
                        {' '}invited you to join{' '}
                        <span className="font-semibold text-white">{invitation.workspace_name}</span>
                      </span>
                    </p>
                    
                    <p className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4" />
                      Role: <span className="font-semibold text-white capitalize">{invitation.role}</span>
                    </p>
                    
                    <p className="flex items-center gap-2 text-sm">
                      <Clock className="w-4 h-4" />
                      {expired ? (
                        <span className="text-red-200">Expired on {formatDate(invitation.expires_at)}</span>
                      ) : (
                        <span>Expires {formatDate(invitation.expires_at)}</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {/* Right side - Actions */}
              <div className="flex flex-col gap-2 min-w-[120px]">
                {!expired ? (
                  <>
                    <button
                      onClick={() => handleAccept(invitation)}
                      disabled={processingId === invitation.id}
                      className="bg-white text-blue-600 hover:bg-blue-50 font-bold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    >
                      {processingId === invitation.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4" />
                          <span>Accept</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleDecline(invitation)}
                      disabled={processingId === invitation.id}
                      className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                    >
                      {processingId === invitation.id ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>...</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-4 h-4" />
                          <span>Decline</span>
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => handleDecline(invitation)}
                    disabled={processingId === invitation.id}
                    className="bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 font-semibold py-2.5 px-4 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed border border-white/30"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Dismiss</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

