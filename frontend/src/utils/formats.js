// Shared list of supported tournament formats.
// "Combination Tournaments" groups the three two-stage formats together
// in the create-tournament dropdown.
export const FORMAT_GROUPS = [
  {
    label: 'Standard',
    options: [
      {value: 'single_knockout', label: '🏆 Single Knockout'},
      {value: 'double_knockout', label: '🔄 Double Knockout' },
    ],
  },
  {
    label: 'Combination Tournaments',
    options: [
      { value: 'knockout_cum_league', label: '🥊➡️🔁 Knockout cum League' },
      { value: 'league_cum_knockout', label: '🔁➡️🥊 League cum Knockout' },
      { value: 'knockout_cum_knockout', label: '🥊➡️🥊 Knockout cum Knockout' },
    ],
  },
];

export const formatLabel = (format) => {
  for (const group of FORMAT_GROUPS) {
    const match = group.options.find((o) => o.value === format);
    if (match) return match.label;
  }
  return '🔄 Double Knockout';
};
