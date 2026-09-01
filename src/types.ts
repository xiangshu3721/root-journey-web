export type PersonId = 'father' | 'mother';
export type MaterialSubject = PersonId | 'self' | 'family';
export type EvidenceType = 'fact' | 'experience' | 'interpretation' | 'hypothesis' | 'raw';
export type Approval = 'pending' | 'confirmed' | 'partial' | 'rejected';
export type View = 'home' | 'parents' | 'dilemma' | 'assessment';
export interface Person { id: PersonId; name: string; nickname: string; avatar: string; birthDate: string; birthplace: string; growthPlace: string; education: string; work: string; marriage: string; wealth: string; majorIllness: string; setbacks: string; lifeEvents: string; keyInteractions: string; }
export interface Material { id: string; personId: MaterialSubject; section: string; text: string; source: 'write' | 'interview' | 'voice'; createdAt: string; evidenceType?: EvidenceType; rawEntryId?: string; isRaw?: boolean; questionId?: string; questionText?: string; questionModule?: string; questionDimension?: string; }
export interface Insight { id: string; title: string; body: string; sourceIds: string[]; status: Approval; kind: 'summary' | 'hypothesis' | 'dilemma' | 'portrait'; confidence?: '低' | '中' | '高'; portraitSections?: Record<string, string>; portraitSummary?: string; portraitExtras?: Record<string, string>; portraitVersion?: number; materialSignature?: string; }
export interface InnerRole { id: 'innerFather' | 'innerMother'; name: string; avatar: string; trait: string; basedOn: PersonId[]; }
export interface FamilyPatternAssessment { answers: Array<number | null>; scores: number[]; completedAt: string; attributions?: Record<string, string>; openAnswers?: Record<string, string>; }
export interface BasicProfile { name: string; phone: string; avatar: string; motto: string; wechatQr: string; gender: string; birthYear: string; birthplace: string; siblings: string; lifeStages: string[]; }
export interface JourneyData { profile: BasicProfile; people: Record<PersonId, Person>; materials: Material[]; insights: Insight[]; innerRoles: InnerRole[]; familyAssessment?: FamilyPatternAssessment; }
