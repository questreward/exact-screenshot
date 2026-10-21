export function dateMilestones(anchor: Date) {
  return [7, 30, 90, 180].map(days => ({
    value: new Date(anchor.getTime() + days * 86400000).toISOString().slice(0, 10),
    label: days === 7 ? 'Dans 7 jours' : `Dans ${days} jours`,
  }));
}