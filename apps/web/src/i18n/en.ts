import type {
  ChartRange,
  CommunityPeriod,
  DisciplineKey,
  Locale,
  Period,
} from '@shooting-clays/shared';

/**
 * All UI strings, in English (the source). `pt-PT.ts` holds the same keys in European Portuguese;
 * components read the active language with `useT()` (see `./index.tsx`).
 */
export const en = {
  appName: 'Shooting Clays',
  nav: {
    dashboard: 'Dashboard',
    add: 'Add',
    history: 'History',
    community: 'Community',
    admin: 'Admin',
    pendingBadge: (n: number) => `${n} waiting for approval`,
    menu: 'Menu',
    faq: 'FAQ',
    clubs: 'Clubs',
    closeMenu: 'Close menu',
    notifications: 'Notifications',
    unreadBadge: (n: number) => (n === 1 ? '1 unread' : `${n} unread`),
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
    range: (min: number, max: number) => `${min}–${max}`,
    averagesKey: 'Bar: average. Line and small numbers: lowest–highest score.',
    noChartData: 'No series in this period.',
    legendLabel: 'Disciplines shown in the chart',
    rangeLabel: 'Time range of the chart',
    ranges: {
      '3m': '3 months',
      '6m': '6 months',
      '1y': '1 year',
      all: 'All time',
    } satisfies Record<ChartRange, string>,
    allHidden: 'All disciplines are hidden. Tap one below to show it.',
  },
  form: {
    addTitle: 'Add session',
    editTitle: 'Edit session',
    date: 'Date',
    discipline: 'Discipline',
    club: 'Club',
    field: 'Field',
    noFields: (discipline: string) => `No field at this club has ${discipline}.`,
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
    errors: {
      date: 'Enter a valid date.',
      score: 'Score must be a whole number from 0 to 25.',
      notes: 'Notes can have at most 1000 characters.',
      hardestTargets: 'Hardest targets are only for Compak Sporting.',
      field: 'Choose the field.',
    },
  },
  clubs: {
    title: 'Clubs',
    intro: 'Where you shoot. Your home club is chosen first when you add a series.',
    field: (id: string) => `Field ${id}`,
    noClub: 'No club',
    noField: 'No field',
    home: 'Home club',
    makeHome: 'Make home club',
    saveError: 'Could not save. Try again.',
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
  auth: {
    tagline: 'Log your clay shooting series and track your progress per discipline.',
    signInWithGoogle: 'Sign in with Google',
    signingIn: 'Opening Google…',
    signInError: 'Could not start the sign-in. Check your connection and try again.',
    loading: 'Loading…',
    welcome: (name: string) => `Welcome, ${name}`,
    accountMenu: 'Account',
    settings: 'Settings',
    signOut: 'Sign out',
  },
  account: {
    pendingBanner:
      'Your account is waiting for approval. The administrator needs to accept your request before you can log your sessions. Meanwhile, this is a preview of your dashboard with sample data.',
    addDisabled: 'You can log sessions once the administrator approves your account.',
    sampleData: 'Sample data',
    inactiveTitle: 'Your account is inactive',
    inactiveMessage: 'Contact the administrator if you think this is a mistake.',
    loadError: 'Could not load your account. Check your connection and try again.',
  },
  admin: {
    title: 'Users',
    loading: 'Loading…',
    loadError: 'Could not load the users.',
    empty: 'No users yet.',
    you: 'You',
    adminRole: 'Admin',
    search: 'Search by name or email',
    filterLabel: 'Show',
    filters: { all: 'All', active: 'Active', pending: 'Pending' },
    noMatches: 'No users match.',
    signedUp: (date: string) => `Signed up ${date}`,
    sessions: (n: number) => (n === 1 ? '1 session' : `${n} sessions`),
    lastActivity: (date: string) => `Last activity ${date}`,
    noActivity: 'No activity yet',
    toggleLabel: (name: string) => `Allow ${name} to use the app`,
    approved: (name: string) => `${name} can now use the app.`,
    disabled: (name: string) => `${name} has been disabled.`,
    undo: 'Undo',
    changeError: 'Could not change the account. Try again.',
    remove: 'Remove',
    removeTitle: (name: string) => `Remove ${name}?`,
    removeWarning:
      'This permanently deletes the account and all of its sessions. It cannot be undone. If they sign in again, they start over as a new user waiting for approval.',
    removeConfirmLabel: (name: string) => `Type "${name}" to confirm`,
    removeConfirm: 'Remove permanently',
    removing: 'Removing…',
    removeError: 'Could not remove the account. Try again.',
    removed: (name: string) => `${name} has been removed.`,
    revokeTitle: (name: string) => `Revoke access for ${name}?`,
    revokeWarning:
      'Their sessions are deleted at once. They see your message the next time they open the app, and when they mark it as read the account is deleted. If they sign in again, they start over as a new user waiting for approval.',
    revokeMessageLabel: 'Message to the user',
    revokeDefaultMessage:
      'Thank you for your interest in Shooting Clays. We cannot keep your account at the moment, so your access has been revoked and your data has been deleted.',
    revokeConfirm: 'Revoke access',
    revoking: 'Revoking…',
    revokeError: 'Could not revoke the access. Try again.',
    revokedToast: (name: string) => `${name}'s access has been revoked.`,
    revokedStatus: 'Revoked: waiting to be read',
    removeNow: 'Delete now',
  },
  notifications: {
    title: 'Notifications',
    loading: 'Loading…',
    loadError: 'Could not load the notifications.',
    empty: 'No notifications yet.',
    markRead: 'Mark as read',
    unread: 'Unread',
    readError: 'Could not mark it as read. Try again.',
    registered: {
      title: 'Sign-up received',
      text: 'Your account is waiting for approval. You will get a notification here when it is active.',
    },
    approved: {
      title: 'Your account is active',
      text: 'You can now log your series and appear in the Community.',
    },
    revoked: { title: 'Your access has been revoked' },
    signup: {
      title: (name: string) => `${name} signed up`,
      text: 'The account is waiting for your approval.',
      link: 'See pending users',
    },
    contact: {
      title: (name: string) => `Message from ${name}`,
      reply: 'Reply by email',
    },
  },
  revoked: {
    note: 'When you mark it as read, your account is deleted and you are signed out.',
    removing: 'Deleting your account…',
  },
  community: {
    title: 'Community',
    disciplineLabel: 'Discipline',
    periodLabel: 'Period',
    periods: { day: 'Day', week: 'Week', month: 'Month' } satisfies Record<CommunityPeriod, string>,
    previous: 'Previous period',
    next: 'Next period',
    podium: 'Podium',
    ranking: 'Ranking',
    place: (rank: number) =>
      `${rank}${rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th'}`,
    bestLabel: (score: number) => `Best ${score}`,
    you: 'You',
    empty: 'No results for this period yet.',
    loading: 'Loading…',
    loadError: 'Could not load the ranking.',
    hidden: 'You are hidden from the Community, so you are not in this ranking.',
    hiddenLink: 'Change in Settings',
  },
  settings: {
    title: 'Settings',
    displayName: 'Display name',
    displayNameHelp: 'Shown in the Community and in the header. Your email is never shown.',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved.',
    saveError: 'Could not save. Try again.',
    showInCommunity: 'Show me in the Community',
    showInCommunityHelp:
      'Your results appear on the Community rankings. Switch off to hide them; your own dashboard does not change.',
    language: 'Language',
    homeClub: 'My club',
    homeClubHelp: 'Chosen first when you add a series, and the club shown first on the Dashboard.',
    deviceTitle: 'This device',
    clearCache: 'Clear cache and reload',
    clearingCache: 'Clearing…',
    clearCacheHelp:
      'Deletes what the app keeps on this device and loads the latest version. Your account and sessions are not touched; other devices are not affected.',
  },
  /** Each language is named in its own language, whatever the active one. */
  faq: {
    title: 'Frequently asked questions',
    items: {
      ranking: {
        question: 'How is the Community ranking decided?',
        answer:
          "Each shooter's series in the chosen discipline and period are counted by score. Whoever has more series at 25 comes first; if that is equal, more series at 24, then at 23, and so on down to 0. Only the best score is shown, but every series counts. Shooters with exactly the same series at every score share the place (for example 1st, 1st, 3rd), and the one who reached their best score first is listed first. The first three places get gold, silver and bronze; a shared place shares the medal.",
      },
      periods: {
        question: 'What do Day, Week and Month cover?',
        answer:
          'Calendar days in Portugal (Lisbon time). Week runs from Sunday to Saturday and Month is the calendar month. The arrows go back to earlier periods.',
      },
      community: {
        question: 'Who appears in the Community?',
        answer:
          'Approved accounts with "Show me in the Community" on (it is on by default). Only the display name, photo and scores are shown, never the email. To hide, switch it off in Settings; your own Dashboard does not change.',
      },
      pending: {
        question: 'Why is my new account waiting for approval?',
        answer:
          'Every new account is approved by the administrator before it can record sessions. Until then the Dashboard shows sample data.',
      },
      targets: {
        question: 'Where can I record the hardest targets?',
        answer: 'In Compak Sporting, whose targets are labelled A to F.',
      },
      install: {
        question: 'How do I put the app on my phone?',
        answer:
          'Shooting Clays is a web app (PWA): there is nothing to download from an app store. On iPhone, open the site in Safari, tap Share and then "Add to Home Screen". On Android, open it in Chrome, tap the menu (⋮) and then "Install app" or "Add to Home screen". It then opens full screen from its own icon, like any other app.',
      },
      updates: {
        question: 'Do I need to update the app?',
        answer:
          'No. You install it once and it updates itself: when there is a new version, the app downloads it in the background the next time you open it with a connection. If a change does not show yet, close the app and open it again.',
      },
      language: {
        question: 'How do I change the language?',
        answer:
          'In Settings → Language (English or Português), or on the sign-in screen. The choice is saved in your profile and follows you to other devices.',
      },
    },
  },
  /** The public site (src/site): home, disciplines and FAQ pages, prerendered for search engines. */
  site: {
    siteNav: 'Site',
    skipToContent: 'Skip to content',
    nav: {
      home: 'Home',
      disciplines: 'Disciplines',
      faq: 'FAQ',
      contact: 'Contact',
      signIn: 'Sign in',
      openMenu: 'Open menu',
    },
    languageLabel: 'Language',
    meta: {
      home: {
        title: 'Shooting Clays — your clay shooting scores, with a friendly challenge',
        description:
          'Log every clay shooting series in seconds, follow your progress per discipline and see how other shooters are doing. Free, on your phone.',
      },
      disciplines: {
        title:
          'Clay shooting disciplines: Compak, Sporting, Fosso, Trap and Helice | Shooting Clays',
        description:
          'How Compak Sporting, Sporting, Fosso, Trap and Helice work: stations, machines, shots per target, targets per series and cartridge loads, with tips for training.',
      },
      faq: {
        title: 'Frequently asked questions | Shooting Clays',
        description:
          'How to put the app on your phone, how the Community ranking works, what Day, Week and Month cover and who appears in the Community.',
      },
      contact: {
        title: 'Contact | Shooting Clays',
        description:
          'Questions, suggestions or a discipline missing? Send a message to Shooting Clays and get an answer by email.',
      },
      notFound: {
        title: 'Page not found | Shooting Clays',
        description: 'This page does not exist.',
      },
    },
    home: {
      eyebrow: 'Clay shooting, logged',
      title: 'Log your clay shooting series and beat your own best',
      lead: 'Shooting Clays keeps every series you shoot — date, discipline, score out of 25 and the targets that got away — and shows how you are progressing. And when you see that someone shot 18, you know what to aim for next time: 19.',
      cta: 'Start for free',
      ctaNote: 'Sign in with your Google account. Free, no app store needed.',
      screenshotAlt:
        'The Shooting Clays dashboard on a phone: a chart of scores over time and the average per discipline.',
      how: {
        title: 'How it works',
        steps: [
          {
            title: 'Log the series',
            text: 'After each series, pick the club, the discipline, the field and the score out of 25. In Compak Sporting you can also mark the hardest targets (A to F).',
          },
          {
            title: 'See your progress',
            text: 'The dashboard shows your average, best and worst score per discipline, for all time, last month and this month, with a chart of every series.',
          },
          {
            title: 'Compare with the Community',
            text: 'See who shot best today, this week and this month in each discipline — and set yourself the next target.',
          },
        ],
      },
      spirit: {
        title: 'Competitive, but friendly',
        paragraphs: [
          'Training on your own is more fun when you know how the others are doing. Shooting Clays turns every series into a small personal challenge: beat your average, your best score, or the shooter just above you this week.',
          'It is not an official competition. Nobody is judged and each shooter decides whether to appear: the Community only shows the display name, the photo and the best score — never an email or anything else.',
        ],
        points: [
          'Day, week and month rankings per discipline',
          'Gold, silver and bronze for the top three',
          'Switch off "Show me in the Community" at any time',
        ],
      },
      disciplines: {
        title: 'Five disciplines',
        text: 'Each discipline has its own statistics and its own ranking.',
        more: 'How each discipline works',
      },
      faq: {
        title: 'Questions',
        more: 'All questions',
      },
    },
    disciplines: {
      title: 'Clay shooting disciplines',
      intro:
        'Shooting Clays records series of 25 targets in five disciplines. This is how each one works and what to look out for when you train. Rules vary between clubs and federations; for competitions, follow the official rules.',
      facts: {
        stations: 'Stations',
        machines: 'Machines',
        shots: 'Shots per target',
        targets: 'Targets per series',
        load: 'Max. load',
        shot: 'Shot size',
      },
      tip: 'Tip',
      compareTitle: 'At a glance',
      ammunitionSource:
        'Maximum loads and shot sizes from the FPTAC table of recognised ammunition (exam manual for the federation licence E, version 2.1, August 2026). They can change when the rules are revised: for competitions, check the current rules.',
      ammunitionSourceLink: 'FPTAC manual (PDF)',
      discipline: 'Discipline',
      cta: 'Log your first series',
      items: {
        compak: {
          summary: 'Hunting-style targets from several machines, shot from five stations in a row.',
          paragraphs: [
            'Five stations stand side by side in a compact area, facing a set of machines labelled with letters (usually A to F). Each machine throws a different trajectory: crossing, incoming, going away, rabbits rolling along the ground.',
            'At each station the shooter gets a menu of singles and doubles, five targets per station, and moves on to the next one. Each target can be shot only once.',
          ],
          facts: {
            stations: '5, in a row',
            machines: '6 (A–F)',
            shots: '1',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: '2.0–2.5 mm (±0.1 mm)',
          },
          tip: 'Note which letters you miss most: in Shooting Clays you can mark the hardest targets of each series and see the pattern over time.',
        },
        sporting: {
          summary: 'A course across natural ground that imitates hunting situations.',
          paragraphs: [
            'Sporting (also called a hunting course) spreads the stations over natural ground — woods, slopes, open fields — so that every target looks like a different game situation: partridge, duck, rabbit, a bird crossing between trees.',
            'Courses change from club to club and from day to day, which makes reading the target and the moment to shoot as important as the swing itself. Like Compak, the machines are identified by letters.',
          ],
          facts: {
            stations: 'Several, spread out',
            machines: 'Several (A–F)',
            shots: '1',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: '2.0–2.5 mm (±0.1 mm)',
          },
          tip: 'Watch a few targets from each station before your turn: the course is part of the challenge.',
        },
        fosso: {
          summary: 'The Olympic trap discipline: fast, going-away targets from a trench.',
          paragraphs: [
            'Fifteen machines are hidden in a trench in front of five stations — three in front of each one. The shooter calls for the target without knowing which of the three will throw it, nor its angle or height.',
            'Shooters rotate through the five stations, five targets at each. A target can be shot twice: the second shot counts the same as the first.',
          ],
          facts: {
            stations: '5',
            machines: '15 (3 per station)',
            shots: '2',
            targets: '25',
            load: '24 g (+0.5 g ISSF)',
            shot: 'Up to 2.6 mm (ISSF 2026)',
          },
          tip: 'Keep the same routine at every station — stance, gun hold and the moment you call — so that only the target changes.',
        },
        trap: {
          summary: 'Going-away targets from a few machines in a trench in front of the shooter.',
          paragraphs: [
            'The machines — usually three — are in a trench in front of the line of five stations. The target comes out going away from the shooter, at an angle you only discover when it leaves the trench.',
            'As in Fosso, the shooter moves through the five stations and has two shots per target. It is a common training discipline at clubs, with fewer machines than Olympic trap.',
          ],
          facts: {
            stations: '5',
            machines: 'Usually 3',
            shots: '2',
            targets: '25',
            load: '28 g',
            shot: 'FPTAC standard',
          },
          tip: 'Use the second shot as a safety net, not a plan: aim to break every target with the first.',
        },
        helice: {
          summary: 'A two-winged target thrown unpredictably, which must fall inside the fence.',
          paragraphs: [
            'The helice (also called ZZ) is a plastic propeller with a white centre piece. Several launchers in front of the shooter spin it and throw it in a direction nobody can predict, with sudden changes of height and direction.',
            'For the target to count, the shot must knock off the centre piece and it must fall inside the fenced area. The shooter has two shots per target.',
          ],
          facts: {
            stations: '1 shooting line',
            machines: '5 to 7 launchers',
            shots: '2',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: 'Up to 2.5 mm (±0.1 mm)',
          },
          tip: 'Look at the centre piece, not the wings: it is what has to fall inside the fence.',
        },
      },
    },
    footer: {
      tagline: 'A free web app to log clay shooting series.',
      unofficial: 'Shooting Clays is not affiliated with any federation or club.',
    },
    notFound: {
      title: 'Page not found',
      text: 'The page you are looking for does not exist or has moved.',
      back: 'Go to the home page',
    },
    contact: {
      title: 'Contact',
      intro:
        'Questions, suggestions, or a discipline your club shoots that is missing? Send a message and you will get an answer by email.',
      name: 'Name',
      email: 'Email',
      message: 'Message',
      messageHint: (min: number) => `At least ${min} characters.`,
      /** Label of the hidden honeypot field (never shown to people). */
      website: 'Leave this field empty',
      privacy: 'Your name and email are only used to reply to you.',
      send: 'Send message',
      sending: 'Sending…',
      sent: 'Thank you! Your message was sent. You will get an answer by email.',
      errors: {
        name: 'Write your name.',
        email: 'Write a valid email address.',
        message: (min: number) => `Write at least ${min} characters.`,
        rateLimited: 'Too many messages were sent from here. Try again in an hour.',
        failed: 'The message could not be sent. Try again later.',
      },
    },
  },
  languages: { en: 'English', 'pt-PT': 'Português' } satisfies Record<Locale, string>,
  /** Messages for API error codes shown to the user (the API itself answers in English). */
  apiErrors: {
    VALIDATION_ERROR: 'Some of the data is not valid.',
    UNAUTHENTICATED: 'Your session has ended. Sign in again.',
    ACCOUNT_PENDING: 'Your account is waiting for approval.',
    ACCOUNT_DISABLED: 'Your account is inactive.',
    ACCOUNT_REVOKED: 'Your access has been revoked.',
    RATE_LIMITED: 'Too many requests. Try again later.',
    FORBIDDEN: 'You are not allowed to do this.',
    NOT_FOUND: 'Not found. It may have been deleted.',
    INTERNAL_ERROR: 'Something went wrong on the server.',
    UNAVAILABLE: 'The service is unavailable right now.',
  } satisfies Record<string, string>,
  notFound: 'Page not found.',
  errorBoundary: 'Something went wrong. Reload the app to continue.',
};

export type Strings = typeof en;
