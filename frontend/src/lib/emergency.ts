/** Emergency numbers (India) and first-aid cards. Bundled into the app so they open with no connection. */

export const EMERGENCY_NUMBERS: { number: string; label: string; note?: string }[] = [
  { number: '112', label: 'All emergencies', note: 'Police, fire and ambulance. Works from any phone.' },
  { number: '108', label: 'Ambulance' },
  { number: '101', label: 'Fire' },
  { number: '100', label: 'Police' },
  { number: '1091', label: 'Women in distress' },
  { number: '1098', label: 'Child helpline' },
  { number: '14567', label: 'Senior citizen helpline (Elder Line)' },
]

export interface FirstAid { id: string; title: string; steps: string[] }

/** Short, widely taught first steps. They never replace a trained responder: call first, then follow the steps. */
export const FIRST_AID: FirstAid[] = [
  { id: 'bleeding', title: 'Heavy bleeding', steps: ['Call 112 or 108.', 'Press firmly on the wound with a clean cloth. Do not remove it if it soaks through; add more on top.', 'Keep pressing until help arrives.', 'If you can, raise the injured limb above the heart.'] },
  { id: 'choking', title: 'Choking adult', steps: ['Ask: “Are you choking?” If they can cough or speak, let them cough.', 'If they cannot breathe, call 112 or 108 or ask someone else to.', 'Lean them forward and give up to 5 firm blows between the shoulder blades.', 'If that fails, give up to 5 abdominal thrusts. Repeat until the object comes out or they collapse.'] },
  { id: 'burns', title: 'Burns', steps: ['Move away from the heat source.', 'Cool the burn under cool running water for at least 20 minutes.', 'Remove rings and loose clothing near the burn unless stuck to the skin.', 'Cover loosely with a clean non-fluffy cloth. Do not apply ice, butter or toothpaste. Call 108 for large or deep burns.'] },
  { id: 'faint', title: 'Fainted or not responding', steps: ['Call 112 or 108.', 'Check breathing. If they are breathing, lay them on their side.', 'If they are not breathing normally, ask someone to find a defibrillator and start chest compressions: push hard and fast in the centre of the chest.', 'Stay until help arrives.'] },
  { id: 'stroke', title: 'Stroke signs: face, arm, speech', steps: ['Face drooping, arm weak, speech slurred: call 112 or 108 at once.', 'Note the time the signs began and tell the responders.', 'Keep them still and comfortable. Give no food, drink or medicine.'] },
]
