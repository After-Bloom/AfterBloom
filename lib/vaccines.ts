// India National Immunization Schedule - editable data table.
// Re-check against the current MoHFW document before the demo.
export const VACCINE_LAST_VERIFIED = "Not yet verified - check MoHFW before demo";

export type VaccineStep = { id: string; age: string; days: number; vaccines: string[] };
export const VACCINES: VaccineStep[] = [
  { id: "birth", age: "Birth", days: 0, vaccines: ["BCG", "OPV-0", "Hepatitis B birth dose"] },
  { id: "6w", age: "6 weeks", days: 42, vaccines: ["OPV-1", "Pentavalent-1", "Rotavirus-1", "fIPV-1", "PCV-1"] },
  { id: "10w", age: "10 weeks", days: 70, vaccines: ["OPV-2", "Pentavalent-2", "Rotavirus-2"] },
  { id: "14w", age: "14 weeks", days: 98, vaccines: ["OPV-3", "Pentavalent-3", "Rotavirus-3", "fIPV-2", "PCV-2"] },
  { id: "9m", age: "9-12 months", days: 274, vaccines: ["MR-1", "JE-1 (endemic districts)", "PCV booster", "Vitamin A"] },
  { id: "16m", age: "16-24 months", days: 487, vaccines: ["MR-2", "JE-2", "DPT booster-1", "OPV booster"] },
];

// Developmental milestones by age. Source to confirm: WHO and the Indian Academy of Pediatrics; pending paediatrician review.
// Missing a milestone is not a diagnosis: the page always says to talk to the doctor if she is worried.
export const MILESTONES = [
  { age: "1 month", items: ["Lifts head briefly when on tummy", "Startles or turns to a loud sound", "Looks at faces"] },
  { age: "2 months", items: ["Smiles at people", "Follows things with eyes", "Briefly calms when comforted"] },
  { age: "4 months", items: ["Holds head steady", "Coos and makes sounds", "Reaches for toys"] },
  { age: "6 months", items: ["Rolls over", "Responds to own name", "Passes things hand to hand"] },
  { age: "9 months", items: ["Sits without support", "Babbles 'mama' 'baba'", "Plays peek-a-boo"] },
  { age: "12 months", items: ["Pulls up to stand", "Says one or two words", "Waves bye-bye"] },
];
