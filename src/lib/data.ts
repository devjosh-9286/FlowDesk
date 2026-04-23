// Sample data — content-publishing domain, matching design prototypes

export type Role = 'admin' | 'manager' | 'member'

export interface Person {
  id: string
  name: string
  initials: string
  hue: number
}

export const PEOPLE: Person[] = [
  { id: 'u1', name: 'Maya Okafor',    initials: 'MO', hue: 262 },
  { id: 'u2', name: 'Theo Lindqvist', initials: 'TL', hue: 200 },
  { id: 'u3', name: 'Priya Raman',    initials: 'PR', hue: 340 },
  { id: 'u4', name: 'Jun Park',       initials: 'JP', hue: 170 },
  { id: 'u5', name: 'Sasha Vogel',    initials: 'SV', hue: 30  },
  { id: 'u6', name: 'Noor Haddad',    initials: 'NH', hue: 130 },
  { id: 'u7', name: 'Eli Bergstrom',  initials: 'EB', hue: 280 },
  { id: 'u8', name: 'Ren Tanaka',     initials: 'RT', hue: 10  },
]

export const personById = (id: string): Person =>
  PEOPLE.find(p => p.id === id) ?? PEOPLE[0]

export interface Stage {
  id: string
  label: string
  color: string
  type: 'stage' | 'approval'
}

export const STAGES: Stage[] = [
  { id: 'Draft',     label: 'Draft',             color: '#71717A', type: 'stage' },
  { id: 'Editorial', label: 'Editorial review',  color: '#2563EB', type: 'stage' },
  { id: 'Legal',     label: 'Legal approval',    color: '#D97706', type: 'approval' },
  { id: 'Publish',   label: 'Scheduled',         color: '#7C3AED', type: 'stage' },
  { id: 'Live',      label: 'Live',              color: '#16A34A', type: 'stage' },
]

export interface Project {
  id: string
  name: string
  dept: string
  stage: string
  progress: number
  status: 'active' | 'at-risk' | 'blocked'
  due: string
  owner: string
  team: string[]
  tasks: number
  flow: string
}

export const SAMPLE_PROJECTS: Project[] = [
  { id: 'p1', name: 'Q2 Editorial Calendar',     dept: 'Editorial', stage: 'Legal review',     progress: 0.62, status: 'active',   due: 'Apr 28', owner: 'u1', team: ['u1','u2','u3','u4'], tasks: 24, flow: 'Content Publishing · v3' },
  { id: 'p2', name: 'Brand Voice Refresh',       dept: 'Brand',     stage: 'Editorial review', progress: 0.35, status: 'at-risk',  due: 'May 02', owner: 'u3', team: ['u3','u5'],           tasks: 18, flow: 'Content Publishing · v3' },
  { id: 'p3', name: 'Homepage Redesign Brief',   dept: 'Growth',    stage: 'Draft',            progress: 0.18, status: 'active',   due: 'May 14', owner: 'u2', team: ['u2','u4','u6'],      tasks: 31, flow: 'Content Publishing · v3' },
  { id: 'p4', name: 'Pricing Page Copy Rework',  dept: 'Growth',    stage: 'Publish',          progress: 0.92, status: 'active',   due: 'Apr 25', owner: 'u4', team: ['u4','u1'],           tasks: 12, flow: 'Content Publishing · v3' },
  { id: 'p5', name: 'Newsletter Relaunch',       dept: 'Editorial', stage: 'Legal review',     progress: 0.50, status: 'blocked',  due: 'May 09', owner: 'u6', team: ['u6','u7'],           tasks: 22, flow: 'Content Publishing · v3' },
  { id: 'p6', name: 'Partner Case Study — Halo', dept: 'Editorial', stage: 'Draft',            progress: 0.08, status: 'active',   due: 'May 20', owner: 'u7', team: ['u7','u2'],           tasks: 15, flow: 'Content Publishing · v3' },
  { id: 'p7', name: 'Investor Update Memo',      dept: 'Exec',      stage: 'Legal review',     progress: 0.70, status: 'active',   due: 'Apr 24', owner: 'u5', team: ['u5','u1','u3'],      tasks: 9,  flow: 'Executive Memo · v1' },
  { id: 'p8', name: 'Careers Page Refresh',      dept: 'People',    stage: 'Draft',            progress: 0.22, status: 'active',   due: 'May 30', owner: 'u8', team: ['u8','u5'],           tasks: 14, flow: 'Content Publishing · v3' },
]

export type TaskStatus = 'Draft' | 'Editorial' | 'Legal' | 'Publish' | 'Live'
export type Priority = 'high' | 'med' | 'low'

export interface Task {
  id: string
  title: string
  stage: TaskStatus
  assignee: string
  due: string
  prio: Priority
  labels: string[]
  wordcount: number
  comments: number
  checklist: [number, number]   // [done, total]
  dept: string
  approval?: 'pending' | 'approved' | 'rejected'
}

export const SAMPLE_TASKS: Task[] = [
  { id: 't1',  title: 'Q2 campaign narrative',           stage: 'Draft',     assignee: 'u2', due: 'Apr 24', prio: 'high', labels: ['narrative','longform'], wordcount: 1840, comments: 4,  checklist: [2,5], dept: 'Editorial' },
  { id: 't2',  title: 'Announce new pricing tier',       stage: 'Draft',     assignee: 'u4', due: 'Apr 26', prio: 'med',  labels: ['pricing'],              wordcount:  640, comments: 2,  checklist: [1,4], dept: 'Growth' },
  { id: 't3',  title: 'Feature: collaborative filters',  stage: 'Draft',     assignee: 'u7', due: 'May 02', prio: 'low',  labels: ['product'],              wordcount:  320, comments: 1,  checklist: [0,6], dept: 'Editorial' },
  { id: 't4',  title: 'Halo customer story — long form', stage: 'Editorial', assignee: 'u1', due: 'Apr 24', prio: 'high', labels: ['case-study'],           wordcount: 2340, comments: 11, checklist: [3,4], dept: 'Editorial' },
  { id: 't5',  title: 'Homepage hero copy — v3',         stage: 'Editorial', assignee: 'u3', due: 'Apr 25', prio: 'high', labels: ['web'],                  wordcount:  180, comments: 6,  checklist: [2,3], dept: 'Growth' },
  { id: 't6',  title: 'Investor update April',           stage: 'Legal',     assignee: 'u5', due: 'Apr 24', prio: 'high', labels: ['regulated'],            wordcount:  920, comments: 3,  checklist: [4,4], dept: 'Exec',      approval: 'pending' },
  { id: 't7',  title: 'Partnership press release — Halo',stage: 'Legal',     assignee: 'u1', due: 'Apr 25', prio: 'high', labels: ['press'],                wordcount:  420, comments: 2,  checklist: [3,3], dept: 'Editorial', approval: 'pending' },
  { id: 't8',  title: 'Pricing page rework',             stage: 'Publish',   assignee: 'u4', due: 'Apr 25', prio: 'med',  labels: ['web'],                  wordcount:  560, comments: 7,  checklist: [5,5], dept: 'Growth' },
  { id: 't9',  title: 'Tuesday newsletter — issue 042',  stage: 'Publish',   assignee: 'u6', due: 'Apr 23', prio: 'med',  labels: ['email'],                wordcount:  880, comments: 1,  checklist: [4,4], dept: 'Editorial' },
  { id: 't10', title: 'Winter roadmap recap',            stage: 'Live',      assignee: 'u2', due: 'Apr 18', prio: 'low',  labels: ['product'],              wordcount: 1210, comments: 9,  checklist: [6,6], dept: 'Editorial' },
  { id: 't11', title: 'Series B announcement',           stage: 'Live',      assignee: 'u5', due: 'Apr 12', prio: 'high', labels: ['regulated'],            wordcount:  780, comments: 14, checklist: [5,5], dept: 'Exec' },
]

export const FLOW_NODES = [
  { id: 'n1', type: 'stage',     label: 'Draft',            x:   40, y:  80, isMandatory: true,  checklist: ['Outline written','Draft v1','Style pass'], approvalMode: 'any' as const },
  { id: 'n2', type: 'stage',     label: 'Editorial review', x:  260, y:  80, isMandatory: true,  checklist: ['Line edit','Fact check','Tone'],          approvalMode: 'any' as const },
  { id: 'n3', type: 'condition', label: 'Regulated?',       x:  500, y:  80, isMandatory: true,  checklist: [],                                         approvalMode: 'any' as const },
  { id: 'n4', type: 'approval',  label: 'Legal approval',   x:  740, y:  10, isMandatory: true,  checklist: [],                                         approvalMode: 'any' as const },
  { id: 'n5', type: 'stage',     label: 'Scheduled',        x:  740, y: 180, isMandatory: true,  checklist: ['Slot chosen','QA preview'],               approvalMode: 'any' as const },
  { id: 'n6', type: 'stage',     label: 'Published',        x:  980, y: 100, isMandatory: true,  checklist: ['Live link verified'],                     approvalMode: 'any' as const },
  { id: 'n7', type: 'end',       label: 'Done',             x: 1200, y: 100, isMandatory: false, checklist: [],                                         approvalMode: 'any' as const },
]

export const FLOW_EDGES = [
  { id: 'e1', source: 'n1', target: 'n2' },
  { id: 'e2', source: 'n2', target: 'n3' },
  { id: 'e3', source: 'n3', target: 'n4', label: 'yes' },
  { id: 'e4', source: 'n3', target: 'n5', label: 'no' },
  { id: 'e5', source: 'n4', target: 'n5', label: 'approved' },
  { id: 'e6', source: 'n5', target: 'n6' },
  { id: 'e7', source: 'n6', target: 'n7' },
]
