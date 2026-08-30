export type Area = 'Health'|'Mind'|'Self'|'People'|'Work'|'Wealth';
export type GoalStatus = 'active'|'resting'|'completed'|'ended';
export type Goal = {id:string;treeId:string;title:string;area:Area;status:GoalStatus;species:string;health:number;progress:number;rule:string};
export type Contribution = {id:string;date:string;title:string;value:string;goalIds:string[];source:'habit'|'activity'|'note'|'metric'};
export type GoalRule = {goalId:string;effectiveFrom:string;effectiveTo?:string;description:string};

export const sampleGoals: Goal[] = [
 {id:'goal_move_2026',treeId:'tree_goal_move_2026',title:'Move with consistency',area:'Health',status:'active',species:'Japanese Maple',health:92,progress:74,rule:'Move intentionally 4 times each week'},
 {id:'goal_read_2026',treeId:'tree_goal_read_2026',title:'Read with attention',area:'Mind',status:'active',species:'Common Juniper',health:78,progress:46,rule:'Read at least 10 pages on 5 days each week'},
 {id:'goal_language_2026',treeId:'tree_goal_language_2026',title:'Speak Indonesian comfortably',area:'Self',status:'active',species:'Common Juniper',health:66,progress:31,rule:'Practise for 15 minutes on 4 days each week'},
];

export const sampleContributions: Contribution[] = [
 {id:'c1',date:'2026-08-30T08:10:00',title:'Morning walk',value:'24 minutes',goalIds:['goal_move_2026'],source:'habit'},
 {id:'c2',date:'2026-08-30T07:40:00',title:'Read',value:'14 pages',goalIds:['goal_read_2026'],source:'habit'},
 {id:'c3',date:'2026-08-29T18:20:00',title:'Language practice',value:'18 minutes',goalIds:['goal_language_2026'],source:'activity'},
 {id:'c4',date:'2026-08-29T16:30:00',title:'Coastal run',value:'5.2 km',goalIds:['goal_move_2026'],source:'activity'},
];

export const sampleRuleHistory: GoalRule[] = [
 {goalId:'goal_move_2026',effectiveFrom:'2026-07-01',description:'Move intentionally 4 times each week'},
 {goalId:'goal_read_2026',effectiveFrom:'2026-08-01',description:'Read at least 10 pages on 5 days each week'},
 {goalId:'goal_language_2026',effectiveFrom:'2026-08-15',description:'Practise for 15 minutes on 4 days each week'},
];

export function treeIdForGoal(goalId:string){return `tree_${goalId}`}
export function canEnterArea(species:string){return !['Seed','Sprout','Young Plant'].includes(species)}
export function contributionCountsFor(contribution:Contribution,goalId:string){return contribution.goalIds.includes(goalId)}

export const growthRegistry = ['Seed','Sprout','Young Plant','Common Juniper','Japanese Maple','Jacaranda','Rowan','Flowering Dogwood','Holly','Silver Birch','Golden Ginkgo','Rainbow Eucalyptus','White Willow','Cherry Blossom','Red Maple','Eucalyptus','Royal Poinciana / Flame Tree','English Oak','Copper Beech','Norway Spruce','Golden Larch','Blue Atlas Cedar','Giant Sequoia','Douglas Fir','Japanese Cedar','Giant Mountain Ash','Coast Redwood'] as const;
export const legendaryRegistry = ['Major Oak','Fortingall Yew','Methuselah','Yggdrasil'] as const;
export const nurseryStages = growthRegistry.slice(0,3);

export type DaysPresentWildlife = 'Orangutan'|'Gorilla'|'Forest Elephant'|'Great White Stag';
export const daysPresentThresholds: ReadonlyArray<{days:number;species:DaysPresentWildlife;class:'wildlife'|'mythic'}> = [
 {days:7,species:'Orangutan',class:'wildlife'},
 {days:30,species:'Gorilla',class:'wildlife'},
 {days:100,species:'Forest Elephant',class:'wildlife'},
 {days:365,species:'Great White Stag',class:'mythic'},
];

export function eligibleDaysPresentWildlife(longestStreak:number){return daysPresentThresholds.filter(x=>longestStreak>=x.days).map(x=>x.species)}
export function growthStageForEligibleDays(days:number){
 const thresholds=[0,2,5,8,14,21,30,42,56,70,84,98,112,126,140,154,168,182,210,240,270,300,330,365,425,485,545];
 let stage=0;for(let i=0;i<thresholds.length;i++)if(days>=thresholds[i])stage=i;
 return growthRegistry[stage];
}
export function stablePlacementSeed(treeId:string){let h=2166136261;for(const c of treeId){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return h>>>0}
