import type { Strings } from './en';

/**
 * European Portuguese UI strings: the same keys as `en.ts` (a missing key fails the type check).
 * The only file in the repository written in Portuguese (CLAUDE.md → Language rules).
 */
export const ptPT = {
  appName: 'Shooting Clays',
  nav: {
    dashboard: 'Painel',
    add: 'Adicionar',
    history: 'Histórico',
    community: 'Comunidade',
    admin: 'Admin',
    pendingBadge: (n: number) => `${n} à espera de aprovação`,
    menu: 'Menu',
    faq: 'Perguntas frequentes',
    clubs: 'Clubes',
    closeMenu: 'Fechar menu',
    notifications: 'Notificações',
    unreadBadge: (n: number) => `${n} por ler`,
  },
  disciplines: {
    compak: 'Compak Sporting',
    sporting: 'Percurso de Caça',
    fosso: 'Fosso',
    trap: 'Trap',
    helice: 'Hélice',
  },
  periods: {
    allTime: 'Desde sempre',
    lastMonth: 'Mês passado',
    thisMonth: 'Este mês',
  },
  noData: '—',
  dashboard: {
    title: 'Painel',
    periodLabel: 'Período',
    average: 'Média',
    min: 'Mín.',
    max: 'Máx.',
    seriesLabel: 'Séries',
    empty: 'Ainda não há sessões. Toque em Adicionar para registar a primeira série.',
    loading: 'A carregar…',
    loadError: 'Não foi possível carregar o painel. Verifique a ligação e tente novamente.',
    retry: 'Tentar novamente',
    scoresChart: 'Resultados ao longo do tempo',
    averagesChart: 'Média por disciplina',
    range: (min: number, max: number) => `${min}–${max}`,
    averagesKey: 'Barra: média. Linha e números pequenos: resultado mais baixo–mais alto.',
    noChartData: 'Sem séries neste período.',
    legendLabel: 'Disciplinas mostradas no gráfico',
    rangeLabel: 'Intervalo de tempo do gráfico',
    ranges: {
      '3m': '3 meses',
      '6m': '6 meses',
      '1y': '1 ano',
      all: 'Tudo',
    },
    allHidden: 'Todas as disciplinas estão escondidas. Toque numa abaixo para a mostrar.',
  },
  form: {
    addTitle: 'Adicionar sessão',
    editTitle: 'Editar sessão',
    date: 'Data',
    discipline: 'Disciplina',
    club: 'Clube',
    field: 'Campo',
    noFields: (discipline: string) => `Nenhum campo deste clube tem ${discipline}.`,
    score: 'Resultado (em 25)',
    decrease: 'Diminuir resultado',
    increase: 'Aumentar resultado',
    hardestTargets: 'Pratos mais difíceis',
    notes: 'Notas',
    notesPlaceholder: 'Campo, condições, o que treinar…',
    save: 'Guardar',
    saving: 'A guardar…',
    cancel: 'Cancelar',
    saveError:
      'Não foi possível guardar. Os dados continuam aqui: verifique a ligação e tente novamente.',
    errors: {
      date: 'Indique uma data válida.',
      score: 'O resultado tem de ser um número inteiro de 0 a 25.',
      notes: 'As notas podem ter no máximo 1000 caracteres.',
      hardestTargets: 'Os pratos mais difíceis só existem no Compak Sporting.',
      field: 'Escolha o campo.',
    },
  },
  clubs: {
    title: 'Clubes',
    intro: 'Onde atira. O clube habitual vem já escolhido quando adiciona uma série.',
    field: (id: string) => `Campo ${id}`,
    noClub: 'Sem clube',
    noField: 'Sem campo',
    home: 'Clube habitual',
    makeHome: 'Tornar habitual',
    saveError: 'Não foi possível guardar. Tente novamente.',
  },
  history: {
    title: 'Histórico',
    filterLabel: 'Disciplina',
    allDisciplines: 'Todas as disciplinas',
    empty: 'Nenhuma sessão encontrada.',
    loading: 'A carregar…',
    loadError: 'Não foi possível carregar o histórico.',
    edit: 'Editar',
    delete: 'Apagar',
    confirmDelete: 'Apagar esta sessão? Não é possível desfazer.',
    deleteError: 'Não foi possível apagar a sessão. Tente novamente.',
    notFound: 'Sessão não encontrada.',
  },
  auth: {
    tagline: 'Registe as suas séries de tiro aos pratos e acompanhe a evolução por disciplina.',
    signInWithGoogle: 'Entrar com Google',
    signingIn: 'A abrir o Google…',
    signInError: 'Não foi possível iniciar a sessão. Verifique a ligação e tente novamente.',
    loading: 'A carregar…',
    welcome: (name: string) => `Olá, ${name}`,
    accountMenu: 'Conta',
    settings: 'Definições',
    signOut: 'Terminar sessão',
  },
  account: {
    pendingBanner:
      'A sua conta está à espera de aprovação. O administrador tem de aceitar o pedido antes de poder registar sessões. Entretanto, esta é uma pré-visualização do painel com dados de exemplo.',
    addDisabled: 'Pode registar sessões assim que o administrador aprovar a sua conta.',
    sampleData: 'Dados de exemplo',
    inactiveTitle: 'A sua conta está inativa',
    inactiveMessage: 'Contacte o administrador se achar que é um engano.',
    loadError: 'Não foi possível carregar a sua conta. Verifique a ligação e tente novamente.',
  },
  admin: {
    title: 'Utilizadores',
    loading: 'A carregar…',
    loadError: 'Não foi possível carregar os utilizadores.',
    empty: 'Ainda não há utilizadores.',
    you: 'Você',
    adminRole: 'Admin',
    search: 'Pesquisar por nome ou email',
    filterLabel: 'Mostrar',
    filters: { all: 'Todos', active: 'Ativos', pending: 'Pendentes' },
    noMatches: 'Nenhum utilizador corresponde.',
    signedUp: (date: string) => `Registou-se a ${date}`,
    sessions: (n: number) => (n === 1 ? '1 sessão' : `${n} sessões`),
    lastActivity: (date: string) => `Última atividade a ${date}`,
    noActivity: 'Ainda sem atividade',
    toggleLabel: (name: string) => `Permitir que ${name} use a app`,
    approved: (name: string) => `${name} já pode usar a app.`,
    disabled: (name: string) => `${name} foi desativado.`,
    undo: 'Desfazer',
    changeError: 'Não foi possível alterar a conta. Tente novamente.',
    remove: 'Remover',
    removeTitle: (name: string) => `Remover ${name}?`,
    removeWarning:
      'Isto apaga definitivamente a conta e todas as suas sessões. Não é possível desfazer. Se voltar a entrar, recomeça como um utilizador novo à espera de aprovação.',
    removeConfirmLabel: (name: string) => `Escreva "${name}" para confirmar`,
    removeConfirm: 'Remover definitivamente',
    removing: 'A remover…',
    removeError: 'Não foi possível remover a conta. Tente novamente.',
    removed: (name: string) => `${name} foi removido.`,
    revokeTitle: (name: string) => `Revogar o acesso de ${name}?`,
    revokeWarning:
      'As sessões são apagadas de imediato. A pessoa vê a sua mensagem da próxima vez que abrir a app e, quando a der como lida, a conta é apagada. Se voltar a entrar, recomeça como um utilizador novo à espera de aprovação.',
    revokeMessageLabel: 'Mensagem para o utilizador',
    revokeDefaultMessage:
      'Obrigado pelo interesse no Shooting Clays. De momento não podemos manter a sua conta, por isso o acesso foi revogado e os seus dados foram apagados.',
    revokeConfirm: 'Revogar acesso',
    revoking: 'A revogar…',
    revokeError: 'Não foi possível revogar o acesso. Tente novamente.',
    revokedToast: (name: string) => `O acesso de ${name} foi revogado.`,
    revokedStatus: 'Revogada: a aguardar leitura',
    removeNow: 'Apagar já',
  },
  notifications: {
    title: 'Notificações',
    loading: 'A carregar…',
    loadError: 'Não foi possível carregar as notificações.',
    empty: 'Ainda não tem notificações.',
    markRead: 'Li',
    unread: 'Por ler',
    readError: 'Não foi possível dar como lida. Tente novamente.',
    registered: {
      title: 'Registo recebido',
      text: 'A sua conta aguarda aprovação. Receberá aqui uma notificação quando estiver ativa.',
    },
    approved: {
      title: 'A sua conta está ativa',
      text: 'Já pode registar as suas séries e aparecer na Comunidade.',
    },
    revoked: { title: 'O seu acesso foi revogado' },
    signup: {
      title: (name: string) => `${name} registou-se`,
      text: 'A conta aguarda a sua aprovação.',
      link: 'Ver pendentes',
    },
    contact: {
      title: (name: string) => `Mensagem de ${name}`,
      reply: 'Responder por email',
    },
  },
  revoked: {
    note: 'Ao carregar em "Li", a sua conta é apagada e a sessão termina.',
    removing: 'A apagar a sua conta…',
  },
  community: {
    title: 'Comunidade',
    disciplineLabel: 'Disciplina',
    periodLabel: 'Período',
    periods: { day: 'Dia', week: 'Semana', month: 'Mês' },
    previous: 'Período anterior',
    next: 'Período seguinte',
    podium: 'Pódio',
    ranking: 'Classificação',
    place: (rank: number) => `${rank}.º`,
    bestLabel: (score: number) => `Melhor ${score}`,
    you: 'Você',
    empty: 'Ainda não há resultados neste período.',
    loading: 'A carregar…',
    loadError: 'Não foi possível carregar a classificação.',
    hidden: 'Está escondido da Comunidade, por isso não aparece nesta classificação.',
    hiddenLink: 'Alterar nas Definições',
  },
  settings: {
    title: 'Definições',
    displayName: 'Nome a mostrar',
    displayNameHelp: 'Aparece na Comunidade e no cabeçalho. O seu email nunca é mostrado.',
    save: 'Guardar',
    saving: 'A guardar…',
    saved: 'Guardado.',
    saveError: 'Não foi possível guardar. Tente novamente.',
    showInCommunity: 'Mostrar-me na Comunidade',
    showInCommunityHelp:
      'Os seus resultados aparecem nas classificações da Comunidade. Desligue para os esconder; o seu painel não muda.',
    language: 'Idioma',
    homeClub: 'O meu clube',
    homeClubHelp:
      'Vem já escolhido quando adiciona uma série, e é o clube que o Painel mostra primeiro.',
    deviceTitle: 'Este dispositivo',
    clearCache: 'Limpar cache e recarregar',
    clearingCache: 'A limpar…',
    clearCacheHelp:
      'Apaga o que a app guarda neste dispositivo e carrega a versão mais recente. A conta e as sessões não são tocadas; os outros dispositivos não são afetados.',
  },
  faq: {
    title: 'Perguntas frequentes',
    items: {
      ranking: {
        question: 'Como é feita a classificação da Comunidade?',
        answer:
          'Contam-se as séries de cada atirador na disciplina e no período escolhidos. Fica à frente quem tem mais séries de 25; se houver empate, quem tem mais séries de 24, depois de 23, e assim por diante até 0. Só aparece a melhor pontuação, mas todas as séries contam. Quem tiver exatamente as mesmas séries em todas as pontuações partilha o lugar (por exemplo 1.º, 1.º, 3.º) e aparece primeiro quem chegou mais cedo à sua melhor pontuação. Os três primeiros lugares recebem ouro, prata e bronze; um lugar partilhado partilha a medalha.',
      },
      periods: {
        question: 'O que abrangem o Dia, a Semana e o Mês?',
        answer:
          'Dias de calendário em Portugal (hora de Lisboa). A Semana vai de domingo a sábado e o Mês é o mês de calendário. As setas mostram os períodos anteriores.',
      },
      community: {
        question: 'Quem aparece na Comunidade?',
        answer:
          'As contas aprovadas com "Mostrar-me na Comunidade" ligado (vem ligado por defeito). Só aparecem o nome, a foto e as pontuações, nunca o email. Para se esconder, desligue a opção nas Definições; o seu painel não muda.',
      },
      pending: {
        question: 'Porque é que a minha conta nova está à espera de aprovação?',
        answer:
          'Todas as contas novas são aprovadas pelo administrador antes de poderem registar sessões. Até lá, o painel mostra dados de exemplo.',
      },
      targets: {
        question: 'Onde posso registar os pratos mais difíceis?',
        answer: 'No Compak Sporting, cujos pratos têm as letras A a F.',
      },
      install: {
        question: 'Como ponho a app no telemóvel?',
        answer:
          'O Shooting Clays é uma aplicação web (PWA): não há nada para descarregar de uma loja de aplicações. No iPhone, abra o site no Safari, toque em Partilhar e depois em "Adicionar ao ecrã principal". No Android, abra-o no Chrome, toque no menu (⋮) e depois em "Instalar app" ou "Adicionar ao ecrã principal". A partir daí abre em ecrã inteiro pelo seu próprio ícone, como qualquer outra app.',
      },
      updates: {
        question: 'Preciso de atualizar a app?',
        answer:
          'Não. Instala-a uma vez e ela atualiza-se sozinha: quando há uma versão nova, a app descarrega-a em segundo plano da próxima vez que a abrir com rede. Se uma mudança ainda não aparecer, feche a app e volte a abri-la.',
      },
      language: {
        question: 'Como mudo o idioma?',
        answer:
          'Nas Definições → Idioma (English ou Português), ou no ecrã de início de sessão. A escolha fica guardada no seu perfil e acompanha-o noutros dispositivos.',
      },
    },
  },
  site: {
    siteNav: 'Site',
    skipToContent: 'Saltar para o conteúdo',
    nav: {
      home: 'Início',
      disciplines: 'Modalidades',
      faq: 'Perguntas frequentes',
      contact: 'Contactos',
      signIn: 'Entrar',
      openMenu: 'Abrir menu',
    },
    languageLabel: 'Idioma',
    meta: {
      home: {
        title: 'Shooting Clays — os seus resultados de tiro aos pratos, com um desafio saudável',
        description:
          'Registe cada série de tiro aos pratos em segundos, acompanhe a evolução por modalidade e veja como estão os outros atiradores. Grátis, no telemóvel.',
      },
      disciplines: {
        title:
          'Modalidades de tiro aos pratos: Compak, Percurso de Caça, Fosso, Trap e Hélice | Shooting Clays',
        description:
          'Como funcionam o Compak Sporting, o Percurso de Caça, o Fosso, o Trap e a Hélice: postos, máquinas, tiros por prato, pratos por série e cargas dos cartuchos, com dicas para treinar.',
      },
      faq: {
        title: 'Perguntas frequentes | Shooting Clays',
        description:
          'Como pôr a app no telemóvel, como funciona a classificação da Comunidade, o que abrangem o Dia, a Semana e o Mês e quem aparece na Comunidade.',
      },
      contact: {
        title: 'Contactos | Shooting Clays',
        description:
          'Dúvidas, sugestões ou falta uma modalidade? Envie uma mensagem ao Shooting Clays e receba resposta por email.',
      },
      notFound: {
        title: 'Página não encontrada | Shooting Clays',
        description: 'Esta página não existe.',
      },
    },
    home: {
      eyebrow: 'Tiro aos pratos, registado',
      title: 'Registe as suas séries de tiro aos pratos e supere-se',
      lead: 'O Shooting Clays guarda cada série que faz — data, modalidade, pontuação em 25 e os pratos que escaparam — e mostra como está a evoluir. E quando vê que alguém fez 18, já sabe o que tentar da próxima vez: 19.',
      cta: 'Começar grátis',
      ctaNote: 'Entre com a sua conta Google. Grátis, sem passar pela loja de aplicações.',
      screenshotAlt:
        'O painel do Shooting Clays num telemóvel: um gráfico das pontuações ao longo do tempo e a média por modalidade.',
      how: {
        title: 'Como funciona',
        steps: [
          {
            title: 'Registe a série',
            text: 'No fim de cada série, escolha o clube, a modalidade, o campo e a pontuação em 25. No Compak Sporting pode também marcar os pratos mais difíceis (A a F).',
          },
          {
            title: 'Veja a sua evolução',
            text: 'O painel mostra a média, a melhor e a pior pontuação por modalidade, desde sempre, no mês passado e neste mês, com um gráfico de todas as séries.',
          },
          {
            title: 'Compare-se com a Comunidade',
            text: 'Veja quem fez melhor hoje, esta semana e este mês em cada modalidade — e defina o seu próximo objetivo.',
          },
        ],
      },
      spirit: {
        title: 'Competitivo, mas saudável',
        paragraphs: [
          'Treinar sozinho é mais divertido quando sabe como estão os outros. O Shooting Clays transforma cada série num pequeno desafio pessoal: bater a sua média, a sua melhor pontuação ou o atirador que está logo acima de si esta semana.',
          'Não é uma competição oficial. Ninguém é avaliado e cada atirador decide se aparece: a Comunidade só mostra o nome, a foto e a melhor pontuação — nunca o email nem mais nada.',
        ],
        points: [
          'Classificações do dia, da semana e do mês por modalidade',
          'Ouro, prata e bronze para os três primeiros',
          'Pode desligar "Mostrar-me na Comunidade" quando quiser',
        ],
      },
      disciplines: {
        title: 'Cinco modalidades',
        text: 'Cada modalidade tem as suas estatísticas e a sua classificação.',
        more: 'Como funciona cada modalidade',
      },
      faq: {
        title: 'Perguntas',
        more: 'Todas as perguntas',
      },
    },
    disciplines: {
      title: 'Modalidades de tiro aos pratos',
      intro:
        'O Shooting Clays regista séries de 25 pratos em cinco modalidades. Veja como funciona cada uma e no que deve reparar quando treina. As regras variam entre clubes e federações; em competição, siga o regulamento oficial.',
      facts: {
        stations: 'Postos',
        machines: 'Máquinas',
        shots: 'Tiros por prato',
        targets: 'Pratos por série',
        load: 'Carga máxima',
        shot: 'Diâmetro dos bagos',
      },
      tip: 'Dica',
      compareTitle: 'Resumo',
      ammunitionSource:
        'Cargas máximas e diâmetros dos bagos da tabela de munições reconhecidas da FPTAC (Manual para Exame de Aptidão – Licença Federativa E, versão 2.1, agosto de 2026). Podem mudar com a revisão dos regulamentos: para competição, consulte o regulamento em vigor.',
      ammunitionSourceLink: 'Manual da FPTAC (PDF)',
      discipline: 'Modalidade',
      cta: 'Registar a primeira série',
      items: {
        compak: {
          summary:
            'Pratos que imitam a caça, lançados por várias máquinas, para cinco postos alinhados.',
          paragraphs: [
            'Cinco postos lado a lado, numa área compacta, de frente para um conjunto de máquinas identificadas por letras (normalmente de A a F). Cada máquina lança uma trajetória diferente: cruzados, de frente, a fugir, coelhos a rolar pelo chão.',
            'Em cada posto, o atirador faz uma sequência de pratos simples e duplos, cinco pratos por posto, e passa ao seguinte. Cada prato só pode ser atirado uma vez.',
          ],
          facts: {
            stations: '5, alinhados',
            machines: '6 (A–F)',
            shots: '1',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: '2,0–2,5 mm (±0,1 mm)',
          },
          tip: 'Repare nas letras que mais falha: no Shooting Clays pode marcar os pratos mais difíceis de cada série e ver o padrão ao longo do tempo.',
        },
        sporting: {
          summary: 'Um percurso em terreno natural que imita situações de caça.',
          paragraphs: [
            'No Percurso de Caça (Sporting), os postos estão espalhados por terreno natural — mato, encostas, campo aberto — para que cada prato pareça uma situação de caça diferente: perdiz, pato, coelho, uma ave a cruzar entre as árvores.',
            'Os percursos mudam de clube para clube e de dia para dia, por isso ler o prato e o momento de atirar conta tanto como o movimento. Tal como no Compak, as máquinas são identificadas por letras.',
          ],
          facts: {
            stations: 'Vários, espalhados',
            machines: 'Várias (A–F)',
            shots: '1',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: '2,0–2,5 mm (±0,1 mm)',
          },
          tip: 'Observe alguns pratos de cada posto antes da sua vez: o percurso faz parte do desafio.',
        },
        fosso: {
          summary: 'O Fosso Olímpico: pratos rápidos, a fugir, lançados de uma vala.',
          paragraphs: [
            'Quinze máquinas estão escondidas numa vala à frente de cinco postos — três à frente de cada um. O atirador pede o prato sem saber qual das três o vai lançar, nem com que ângulo ou altura.',
            'Os atiradores rodam pelos cinco postos, cinco pratos em cada. Cada prato pode ser atirado duas vezes: o segundo tiro conta como o primeiro.',
          ],
          facts: {
            stations: '5',
            machines: '15 (3 por posto)',
            shots: '2',
            targets: '25',
            load: '24 g (+0,5 g ISSF)',
            shot: 'Até 2,6 mm (ISSF 2026)',
          },
          tip: 'Mantenha a mesma rotina em todos os postos — posição, arma e o momento de pedir o prato — para que só o prato mude.',
        },
        trap: {
          summary: 'Pratos a fugir, lançados por poucas máquinas numa vala à frente do atirador.',
          paragraphs: [
            'As máquinas — normalmente três — estão numa vala à frente da linha de cinco postos. O prato sai a fugir do atirador, com um ângulo que só se descobre quando sai da vala.',
            'Tal como no Fosso, o atirador passa pelos cinco postos e tem dois tiros por prato. É uma modalidade comum nos treinos dos clubes, com menos máquinas do que o Fosso Olímpico.',
          ],
          facts: {
            stations: '5',
            machines: 'Normalmente 3',
            shots: '2',
            targets: '25',
            load: '28 g',
            shot: 'Norma FPTAC',
          },
          tip: 'Use o segundo tiro como rede de segurança, não como plano: tente partir cada prato com o primeiro.',
        },
        helice: {
          summary:
            'Um alvo com duas asas, lançado de forma imprevisível, que tem de cair dentro da vedação.',
          paragraphs: [
            'A hélice (também chamada ZZ) é uma hélice de plástico com uma peça central branca. Vários lançadores à frente do atirador fazem-na girar e lançam-na numa direção que ninguém consegue prever, com mudanças bruscas de altura e de direção.',
            'Para o alvo contar, o tiro tem de soltar a peça central e esta tem de cair dentro da zona vedada. O atirador tem dois tiros por alvo.',
          ],
          facts: {
            stations: '1 linha de tiro',
            machines: '5 a 7 lançadores',
            shots: '2',
            targets: '25',
            load: '28 g (+2% FITASC)',
            shot: 'Até 2,5 mm (±0,1 mm)',
          },
          tip: 'Olhe para a peça central, não para as asas: é ela que tem de cair dentro da vedação.',
        },
      },
    },
    footer: {
      tagline: 'Uma aplicação web gratuita para registar séries de tiro aos pratos.',
      unofficial: 'O Shooting Clays não está associado a nenhuma federação nem clube.',
    },
    notFound: {
      title: 'Página não encontrada',
      text: 'A página que procura não existe ou mudou de sítio.',
      back: 'Ir para o início',
    },
    contact: {
      title: 'Contactos',
      intro:
        'Tem dúvidas, sugestões ou falta uma modalidade que se pratica no seu clube? Envie uma mensagem e receberá resposta por email.',
      name: 'Nome',
      email: 'Email',
      message: 'Mensagem',
      messageHint: (min: number) => `Pelo menos ${min} caracteres.`,
      website: 'Deixe este campo vazio',
      privacy: 'O seu nome e email só são usados para lhe responder.',
      send: 'Enviar mensagem',
      sending: 'A enviar…',
      sent: 'Obrigado! A sua mensagem foi enviada. Receberá resposta por email.',
      errors: {
        name: 'Escreva o seu nome.',
        email: 'Escreva um endereço de email válido.',
        message: (min: number) => `Escreva pelo menos ${min} caracteres.`,
        rateLimited:
          'Foram enviadas demasiadas mensagens daqui. Tente novamente dentro de uma hora.',
        failed: 'Não foi possível enviar a mensagem. Tente novamente mais tarde.',
      },
    },
  },
  languages: { en: 'English', 'pt-PT': 'Português' },
  apiErrors: {
    VALIDATION_ERROR: 'Alguns dados não são válidos.',
    UNAUTHENTICATED: 'A sua sessão terminou. Entre novamente.',
    ACCOUNT_PENDING: 'A sua conta está à espera de aprovação.',
    ACCOUNT_DISABLED: 'A sua conta está inativa.',
    ACCOUNT_REVOKED: 'O seu acesso foi revogado.',
    RATE_LIMITED: 'Demasiados pedidos. Tente novamente mais tarde.',
    FORBIDDEN: 'Não tem permissão para fazer isto.',
    NOT_FOUND: 'Não encontrado. Pode ter sido apagado.',
    INTERNAL_ERROR: 'Ocorreu um erro no servidor.',
    UNAVAILABLE: 'O serviço está indisponível neste momento.',
  },
  notFound: 'Página não encontrada.',
  errorBoundary: 'Algo correu mal. Recarregue a app para continuar.',
} satisfies Strings;
