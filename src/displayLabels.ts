const lockedLabels:Record<string,string>={
  na:'N/A',n_a:'N/A',pb:'PB',rpe:'RPE',
  saved_meal:'Saved Meal',manual_macros:'Manual Macros',meal_plan:'Meal Plan',
  non_negotiable:'Non-Negotiable',dormant_woods:'Dormant Woods',
  eternal_forest:'Heartwood',the_canopy:'The Canopy',
  review_pending:'Review Pending',keep_growing:'Keep Growing',grow_gently:'Grow Gently',
  return_to_normal:'Return to Normal',change_climate:'Change Climate',create_another:'Create Another Clearing',
  times_per_week:'Times per Week',specific_days:'Specific Days',
  active_calories:'Active Calories',body_weight:'Body Weight',
};

/** Formats stable system keys for display. Never pass user-authored content here. */
export function formatDisplayLabel(value:string|null|undefined,labels:Record<string,string>={}){
  if(!value)return'';
  const key=value.trim();
  if(labels[key])return labels[key];
  if(lockedLabels[key])return lockedLabels[key];
  return key.replace(/[_-]+/g,' ').replace(/\s+/g,' ').split(' ').map(word=>word?word[0].toUpperCase()+word.slice(1).toLowerCase():'').join(' ');
}
