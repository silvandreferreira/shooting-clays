import type { DisciplineKey, Period } from '@shooting-clays/shared';

/** All UI strings. A Portuguese translation can be added later as a sibling file. */
export const en = {
  appName: 'Shooting Clays',
  nav: {
    dashboard: 'Dashboard',
    add: 'Add',
    history: 'History',
  },
  disciplines: {
    compak: 'Compak Sporting',
    sporting: 'Sporting',
    fosso: 'Fosso',
    trap: 'Trap',
    helice: 'Helice',
  } satisfies Record<DisciplineKey, string>,
  periods: {
    allTime: 'All time',
    lastMonth: 'Last month',
    thisMonth: 'This month',
  } satisfies Record<Period, string>,
  noData: '—',
  dashboard: {
    title: 'Dashboard',
    periodLabel: 'Period',
    average: 'Average',
    min: 'Min',
    max: 'Max',
    seriesLabel: 'Series',
    empty: 'No sessions yet. Tap Add to log your first series.',
    loading: 'Loading…',
    loadError: 'Could not load the dashboard. Check your connection and try again.',
    retry: 'Retry',
    scoresChart: 'Scores over time',
    averagesChart: 'Average by discipline',
    noChartData: 'No series in this period.',
  },
  form: {
    addTitle: 'Add session',
    editTitle: 'Edit session',
    date: 'Date',
    discipline: 'Discipline',
    score: 'Score (out of 25)',
    decrease: 'Decrease score',
    increase: 'Increase score',
    hardestTargets: 'Hardest targets',
    notes: 'Notes',
    notesPlaceholder: 'Field, conditions, what to work on…',
    save: 'Save',
    saving: 'Saving…',
    cancel: 'Cancel',
    saveError: 'Could not save. Your data is still here: check your connection and try again.',
  },
  history: {
    title: 'History',
    filterLabel: 'Discipline',
    allDisciplines: 'All disciplines',
    empty: 'No sessions found.',
    loading: 'Loading…',
    loadError: 'Could not load the history.',
    edit: 'Edit',
    delete: 'Delete',
    confirmDelete: 'Delete this session? This cannot be undone.',
    deleteError: 'Could not delete the session. Try again.',
    notFound: 'Session not found.',
  },
  notFound: 'Page not found.',
  errorBoundary: 'Something went wrong. Reload the app to continue.',
};

export type Strings = typeof en;

export const t = en;
