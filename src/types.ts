export type PersonId = 'self' | 'father' | 'mother';
export type Approval = 'pending' | 'confirmed' | 'partial' | 'rejected';
export type View = 'home' | 'archives' | 'system' | 'inner' | 'dilemma' | 'report' | 'settings';
export interface Person { id: PersonId; name: string; nickname: string; avatar: string; birthDate: string; birthplace: string; }
export interface Material { id: string; personId: PersonId; section: string; text: string; source: 'write' | 'interview' | 'voice'; createdAt: string; }
export interface Insight { id: string; title: string; body: string; sourceIds: string[]; status: Approval; kind: 'summary' | 'hypothesis' | 'dilemma'; }
export interface InnerRole { id: 'innerFather' | 'innerMother' | 'innerChild'; name: string; avatar: string; trait: string; basedOn: PersonId[]; }
export interface JourneyData { profile: { name: string; phone: string; avatar: string; motto: string }; people: Record<PersonId, Person>; materials: Material[]; insights: Insight[]; innerRoles: InnerRole[]; }
