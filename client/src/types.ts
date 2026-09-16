export type WhatsAppStatus = 'disconnected' | 'connecting' | 'qr_ready' | 'connected';

export interface WhatsAppState {
  status: WhatsAppStatus;
  qrCodeDataUrl: string | null;
  pairingCode: string | null;
  phoneNumber: string | null;
  lastConnectedAt: string | null;
  error: string | null;
}

export interface Contact {
  id: number;
  phone_number: string;
  name: string | null;
  email?: string | null;
  company?: string | null;
  status?: 'prospect' | 'active' | 'vip' | 'support';
  tags?: string[];
  avatar: string | null;
  notes: string | null;
  ai_enabled: number;
  created_at: string;
  updated_at: string;
  unread_count?: number;
  last_message?: string;
  last_message_time?: string;
}

export interface Message {
  id: number;
  whatsapp_message_id: string | null;
  contact_id: number;
  direction: 'inbound' | 'outbound';
  sender_type: 'client' | 'ai' | 'human';
  content: string;
  media_type?: string | null;
  media_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  transcription?: string | null;
  status: string;
  timestamp: string;
}

export interface Memory {
  id: number;
  contact_id: number;
  category: string;
  key: string;
  value: string;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export type TeamMemberStatus = 'active' | 'vacation' | 'sick' | 'other';

export interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string | null;
  phone: string | null;
  color: string;
  avatar: string | null;
  specialties: string[];
  working_hours: Record<string, { enabled: boolean; slots: { start: string; end: string }[] }>;
  status?: TeamMemberStatus;
  is_active: number;
  created_at: string;
}

export interface Appointment {
  id: number | string;
  contact_id: number;
  team_member_id: number | null;
  service_id: number | null;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes: string | null;
  source: 'whatsapp_ai' | 'manual';
  document_url?: string | null;
  document_name?: string | null;
  reminder_sent: number;
  created_at: string;
  updated_at: string;
  contact_name?: string;
  contact_phone?: string;
  team_member_name?: string;
  team_member_color?: string;
  service_name?: string;
  collaborator_status?: 'pending' | 'accepted' | 'declined';
  collaborator_accepted_at?: string | null;
}

export interface CompanySettings {
  name: string;
  activity: string;
  phone: string;
  email: string;
  address: string;
  website: string;
  description: string;
}

export interface DashboardStats {
  totalContacts: number;
  messagesToday: number;
  appointmentsToday: number;
  activeTeamMembers: number;
  whatsapp: WhatsAppState;
}

export interface Service {
  id: number;
  name: string;
  category?: string | null;
  duration_minutes: number;
  price: number;
  description?: string | null;
  is_active: number;
  created_at?: string;
}

export interface IndustryPresetSummary {
  id: string;
  name: string;
  shortName: string;
  sector: string;
  badgeEmoji: string;
  description: string;
  servicesCount: number;
  teamCount: number;
  previewServices: string[];
  companyActivity: string;
}

export interface IndustryPreset {
  id: string;
  name: string;
  shortName: string;
  sector: string;
  badgeEmoji: string;
  description: string;
  company: CompanySettings;
  services: Omit<Service, 'id' | 'is_active'>[];
  teamMembers: Omit<TeamMember, 'id' | 'is_active' | 'created_at' | 'working_hours' | 'avatar'>[];
  systemPrompt: string;
}

