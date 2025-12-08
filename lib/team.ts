import { getSupabaseAdmin } from './supabase-server';

export type TeamRole = 'admin' | 'member' | 'viewer';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: TeamRole;
  joined_at: string;
}

export interface TeamInvite {
  id: string;
  team_id: string;
  token: string;
  email: string | null;
  role: TeamRole;
  created_by: string;
  expires_at: string | null;
  used_at: string | null;
  created_at: string;
}

export async function getUserTeamContext(userId: string): Promise<{
  hasTeam: boolean;
  team: Team | null;
  role: TeamRole | null;
  teamId: string | null;
}> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: membership, error } = await supabase
      .from('team_members')
      .select('team_id, role, teams(*)')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return { hasTeam: false, team: null, role: null, teamId: null };
      }
      throw error;
    }

    if (!membership) {
      return { hasTeam: false, team: null, role: null, teamId: null };
    }

    return {
      hasTeam: true,
      team: membership.teams as any,
      role: membership.role as TeamRole,
      teamId: membership.team_id
    };
  } catch (error) {
    console.log('Team feature not available (tables not created):', error);
    return { hasTeam: false, team: null, role: null, teamId: null };
  }
}

export async function getUserTeams(userId: string): Promise<Array<{ team: Team; role: TeamRole }>> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: memberships, error } = await supabase
      .from('team_members')
      .select('role, teams(*)')
      .eq('user_id', userId);

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return (memberships || []).map((m: any) => ({
      team: m.teams,
      role: m.role
    }));
  } catch (error) {
    console.log('Team feature not available (tables not created):', error);
    return [];
  }
}

export function hasPermission(role: TeamRole | null, action: 'view' | 'edit' | 'admin'): boolean {
  if (!role) return true;

  switch (action) {
    case 'view':
      return ['admin', 'member', 'viewer'].includes(role);
    case 'edit':
      return ['admin', 'member'].includes(role);
    case 'admin':
      return role === 'admin';
    default:
      return false;
  }
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: members, error } = await supabase
      .from('team_members')
      .select('*')
      .eq('team_id', teamId)
      .order('joined_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return members || [];
  } catch (error) {
    console.log('Team feature not available (tables not created):', error);
    return [];
  }
}

export async function getTeamInvites(teamId: string): Promise<TeamInvite[]> {
  try {
    const supabase = getSupabaseAdmin();

    const { data: invites, error } = await supabase
      .from('team_invites')
      .select('*')
      .eq('team_id', teamId)
      .is('used_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      if (error.message?.includes('relation') || error.message?.includes('does not exist')) {
        return [];
      }
      throw error;
    }

    return invites || [];
  } catch (error) {
    console.log('Team feature not available (tables not created):', error);
    return [];
  }
}

export interface ResourceFilter {
  useTeam: boolean;
  teamId: string | null;
  userId: string;
  role: TeamRole | null;
}

export async function getResourceFilter(userId: string): Promise<ResourceFilter> {
  const teamContext = await getUserTeamContext(userId);

  return {
    useTeam: teamContext.hasTeam,
    teamId: teamContext.teamId,
    userId: userId,
    role: teamContext.role
  };
}
