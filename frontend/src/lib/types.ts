export type Role = 'CITIZEN' | 'DISPATCHER' | 'RESPONDER' | 'ADMIN'
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED'
export type Category = 'ACCIDENT' | 'FIRE' | 'FLOOD' | 'MEDICAL' | 'OTHER'
export type Priority = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
export type IncidentStatus =
  | 'REPORTED' | 'AI_ANALYZED' | 'AWAITING_VERIFICATION' | 'VERIFIED' | 'ASSIGNED'
  | 'RESPONDER_ACCEPTED' | 'ON_SCENE' | 'RESOLVED' | 'CLOSED' | 'REJECTED' | 'DUPLICATE'
export type AssignmentStatus = 'ASSIGNED' | 'ACCEPTED' | 'DECLINED' | 'ARRIVED' | 'COMPLETED' | 'CANCELLED'
export type Availability = 'AVAILABLE' | 'BUSY' | 'OFFLINE'

export interface User {
  id: number
  fullName: string
  email: string
  phone?: string
  role: Role
  verificationStatus: VerificationStatus
  chatUserId: string
  createdAt: string
  status?: 'ACTIVE' | 'SUSPENDED'
}
export interface AuthResponse { token: string; user: User }

export interface IncidentSummary {
  id: number
  incidentNumber: string
  category: Category
  priority?: Priority
  status: IncidentStatus
  description: string
  latitude: number
  longitude: number
  createdAt: string
  updatedAt: string
  priorityIsAiSuggestion: boolean
  responders: string[]
  hasChannel: boolean
  addressHint?: string
  demo?: boolean
}
export interface Analysis {
  suggestedCategory: Category
  suggestedPriority: Priority
  confidence: number
  summary: string
  keyInformation: string[]
  missingInformation: string[]
  extractedLocation?: string
  modelVersion: string
  createdAt: string
  processingStatus?: 'OK' | 'FALLBACK'
  fallbackReason?: string
  latencyMs?: number
  suspectedInjection?: boolean
  redacted?: boolean
}
export interface Assignment {
  id: number
  incidentId: number
  incidentNumber?: string
  responderId: number
  responderName: string
  responderType?: string
  status: AssignmentStatus
  declineReason?: string
  assignedAt: string
  acceptedAt?: string
  arrivedAt?: string
  completedAt?: string
}
export interface HistoryEntry {
  previousStatus?: IncidentStatus
  newStatus: IncidentStatus
  changedByName: string
  reason?: string
  createdAt: string
}
export interface IncidentDetail {
  summary: IncidentSummary
  reportedByName?: string
  contactName?: string
  contactPhone?: string
  imageUrl?: string
  aiSummary?: string
  incidentTime: string
  analysis?: Analysis
  assignments: Assignment[]
  history: HistoryEntry[]
  channel?: { channelId: string; reporterInvited: boolean; lastMessageAt?: string; messageCount: number; syncStatus?: 'PENDING' | 'SYNCED' | 'FAILED'; syncError?: string; lastSyncedAt?: string }
  allowedNext: IncidentStatus[]
  duplicateOfId?: number
  locationAccuracyMeters?: number
  locationSource?: 'GPS' | 'MAP_PIN'
  duplicateCount?: number
}
export interface Page<T> { items: T[]; page: number; size: number; totalElements: number; totalPages: number }
export interface MapMarker {
  id: number
  incidentNumber: string
  category: Category
  priority?: Priority
  status: IncidentStatus
  latitude: number
  longitude: number
  assigned: boolean
  createdAt: string
  description: string
}
export interface Stats {
  total: number
  active: number
  unassigned: number
  critical: number
  byStatus: Record<string, number>
  byPriority: Record<string, number>
  byCategory: Record<string, number>
  avgMinutesToAnalysis?: number
  avgMinutesToVerification?: number
  avgMinutesVerificationToAssignment?: number
  respondersAvailable: number
  respondersTotal: number
  avgMinutesToResolution?: number
  analysisCoverage?: number
  modelSuccessRate?: number
  assignmentCompletionRate?: number
  chatMessages: number
  demoIncidents?: number
}
export interface DuplicateMatch {
  incidentId: number
  incidentNumber: string
  confidence: number
  distanceMeters: number
  minutesApart: number
  reasons: string[]
  status: IncidentStatus
  description: string
  semanticSimilarity?: number
}
export interface Recommendation {
  responderId: number
  name: string
  responderType: string
  score: number
  distanceMeters?: number
  reasons: string[]
}
export interface Responder {
  userId: number
  chatUserId: string
  fullName: string
  phone?: string
  responderType: string
  availability: Availability
  shareLocation: boolean
  latitude?: number
  longitude?: number
  lastLocationAt?: string
  activeAssignments: number
  verificationStatus: VerificationStatus
}
export interface AssignmentResult { assignment: Assignment; chatSynced: boolean; chatMessage?: string; chatSyncStatus?: string }
export interface ChatToken { appKey: string; userId: string; token: string; displayName: string }
export interface Contact { userId: number; chatUserId: string; fullName: string; role: Role; responderType?: string }
export interface ChannelSync { channelId: string; synced: boolean; message: string; memberChatIds: string[]; syncStatus?: string }
export interface AppNotification {
  id: number
  incidentId?: number
  type: string
  title: string
  message: string
  createdAt: string
  read: boolean
}
export interface AuditLogEntry {
  id: number
  actor: string
  action: string
  resourceType: string
  resourceId?: string
  details?: string
  createdAt: string
}
export interface ConversationSummary { summary: string; messageCount: number; source: string }

export interface CoverageGap { incidentId: number; incidentNumber: string; priority?: Priority; nearestMeters?: number; reason: string }
export interface Coverage { radiusKm: number; availableLocated: number; availableUnlocated: number; gaps: CoverageGap[] }
export interface AuditVerification { valid: boolean; checked: number; firstBrokenId?: number }
export interface AiEvalReport {
  analyzer: string; cases: number; categoryAccuracy: number; priorityAccuracy: number; criticalRecall: number
  injectionResistance: number; injectionFlagRate: number; duplicatePrecision: number; duplicateRecall: number
  medianLatencyMs: number; p95LatencyMs: number; fallbackRate: number; approxInputTokens: number; approxOutputTokens: number
  approxCostUsd?: number; failures: string[]; note: string
}
export interface IncidentExport { incident: IncidentDetail; audit: { actor: string; action: string; details?: string; createdAt: string }[]; exportedAt: string; exportedBy: string; note: string }
export interface DemoInfo { demoMode: boolean; accounts?: { role: Role; email: string; name: string }[] }
