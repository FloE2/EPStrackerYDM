// Fiches ateliers imprimables (tests Sport Santé) — générées pour le travail en autonomie
export const FICHES = [
 {
  "id": "poignee_main",
  "cat": "Force",
  "name": "Poignée de main",
  "mesure": "La force de serrage de la main",
  "mat": "Dynamomètre",
  "essais": "2 essais par main, en alternant D / G",
  "note": "Le meilleur essai de chaque main, en kg",
  "steps": [
   "Le juge remet l’aiguille à zéro et règle la poignée : les doigts serrent avec la 2e phalange.",
   "Debout, l’appareil dans une main, le bras tendu le long du corps et un peu écarté.",
   "Serre le plus fort possible, progressivement, pendant 3 secondes.",
   "Le juge lit le résultat, remet à zéro, puis on change de main."
  ],
  "must": [
   "Debout, bras TENDU vers le bas : le coude ne se plie pas.",
   "Le bras et l’appareil ne touchent PAS le corps ni la cuisse.",
   "Une seule main sur l’appareil.",
   "Le cadran est tourné vers le juge, pas vers l’élève testé.",
   "Aiguille remise à zéro AVANT chaque essai."
  ],
  "nul": [
   "Le bras se plie ou balance pendant l’effort.",
   "L’appareil est appuyé contre le corps.",
   "L’aiguille n’avait pas été remise à zéro."
  ],
  "alias": [
   "poignee",
   "dynamo",
   "prehension",
   "handgrip"
  ]
 },
 {
  "id": "suspension_barre",
  "cat": "Force",
  "name": "Suspension barre",
  "mesure": "L’endurance de force des bras",
  "mat": "Barre fixe, banc ou plinth pour monter, chronomètre",
  "essais": "1 essai",
  "note": "Le temps tenu, en secondes",
  "steps": [
   "Mains sur la barre, paumes vers l’avant, écartées largeur d’épaules.",
   "Monte sur le banc et place le menton AU-DESSUS de la barre, bras fléchis.",
   "Le banc est retiré : le chrono démarre quand les pieds quittent l’appui.",
   "Tiens la position le plus longtemps possible."
  ],
  "must": [
   "Menton AU-DESSUS de la barre, sans être posé dessus.",
   "Prise paumes vers l’avant, mains largeur d’épaules.",
   "Jambes tendues, sans balancement.",
   "Les pieds ne touchent plus rien pendant le test.",
   "Un camarade pareur se tient à côté pour la sécurité."
  ],
  "nul": [
   "STOP : le menton touche la barre ou passe en dessous.",
   "STOP : la tête bascule en arrière pour « tricher ».",
   "STOP : un pied touche le sol ou le banc."
  ],
  "safety": "Descente contrôlée : on ne saute pas de la barre.",
  "alias": [
   "suspension"
  ]
 },
 {
  "id": "chaise_killy",
  "cat": "Force",
  "name": "Chaise de Killy",
  "mesure": "L’endurance des muscles des cuisses",
  "mat": "Un mur lisse, chronomètre",
  "essais": "1 essai",
  "note": "Le temps tenu, en secondes",
  "steps": [
   "Dos contre le mur, descends en glissant jusqu’à être « assis » sans chaise.",
   "Cuisses horizontales, genoux à angle droit (90°).",
   "Croise les bras sur la poitrine.",
   "Le chrono démarre quand la position est correcte. Tiens le plus longtemps possible."
  ],
  "must": [
   "Pieds écartés largeur d’épaules, bien à plat au sol.",
   "Dos ENTIER collé au mur : fesses, dos et tête.",
   "Cuisses horizontales : angle de 90° au genou, pas plus haut.",
   "Genoux au-dessus des chevilles, jamais devant les orteils.",
   "Mains PAS en appui sur les genoux, les cuisses ou le mur : bras croisés sur la poitrine."
  ],
  "nul": [
   "STOP : les fesses remontent (angle plus grand que 90°).",
   "STOP : les mains prennent appui sur les jambes ou le mur.",
   "STOP : le dos ou la tête se décolle du mur."
  ],
  "tip": "Le juge se place sur le côté pour bien voir l’angle du genou. 1 avertissement, puis arrêt.",
  "alias": [
   "chaise",
   "killy"
  ]
 },
 {
  "id": "saut_longueur_2pieds",
  "cat": "Force",
  "name": "Saut en longueur 2 pieds",
  "mesure": "La puissance (explosivité) des jambes",
  "mat": "Ligne au sol, tapis, mètre ruban",
  "essais": "2 essais",
  "note": "Le meilleur des 2 essais, en cm",
  "steps": [
   "Pieds parallèles, écartés largeur du bassin, pointes derrière la ligne.",
   "Fléchis les jambes et balance les bras vers l’arrière.",
   "Saute le plus loin possible vers l’avant, en poussant sur les 2 pieds.",
   "Reste immobile à la réception : le mesureur repère la trace la plus proche de la ligne."
  ],
  "must": [
   "Pointes de pieds DERRIÈRE la ligne, sans la toucher.",
   "SANS élan : ni pas, ni petit sautillement avant de partir.",
   "Décollage des 2 pieds EN MÊME TEMPS.",
   "Mesure de la ligne jusqu’au TALON le plus proche (ou à la main / aux fesses si tu tombes en arrière).",
   "Mètre bien droit, perpendiculaire à la ligne."
  ],
  "nul": [
   "Pied posé sur la ligne ou devant.",
   "Un pas d’élan ou un sautillement avant le saut.",
   "Les pieds ne décollent pas ensemble."
  ],
  "alias": [
   "longueur",
   "sans elan",
   "detente horizontale"
  ]
 },
 {
  "id": "planche",
  "cat": "Force",
  "name": "Planche (gainage)",
  "mesure": "L’endurance des abdominaux et du dos",
  "mat": "Tapis, chronomètre",
  "essais": "1 essai",
  "note": "Le temps tenu, en secondes",
  "steps": [
   "Allongé ventre au sol, place tes avant-bras au sol, coudes sous les épaules.",
   "Monte sur la pointe des pieds : seuls les avant-bras et les pieds touchent le sol.",
   "Aligne tête – épaules – bassin – talons, regard vers le sol.",
   "Le chrono démarre quand la position est correcte. Tiens le plus longtemps possible."
  ],
  "must": [
   "Coudes juste SOUS les épaules.",
   "Corps en LIGNE DROITE : fesses ni en l’air, ni qui s’affaissent.",
   "Seuls les avant-bras et les pointes de pieds touchent le sol.",
   "Les genoux ne touchent jamais le sol.",
   "Le juge se place sur le côté, à hauteur du bassin."
  ],
  "nul": [
   "STOP : le bassin monte ou descend (1 avertissement, puis arrêt).",
   "STOP : un genou touche le sol.",
   "STOP : l’élève se repose ou change d’appui."
  ],
  "alias": [
   "planche",
   "gainage"
  ]
 },
 {
  "id": "lancer_ballon",
  "cat": "Coordination",
  "name": "Lancer de ballon",
  "mesure": "La coordination œil-main et la précision",
  "mat": "Cible à cercles, ballon, ligne de lancer (distance fixée par le prof)",
  "essais": "10 lancers",
  "note": "Le total des points, sur 50",
  "steps": [
   "Place-toi derrière la ligne de lancer.",
   "Lance 10 fois le ballon vers la cible.",
   "Après chaque lancer, le juge annonce les points : centre = 5, 1er cercle = 3, 2e cercle = 1, à côté = 0.",
   "Le secrétaire écrit les points de chaque lancer puis fait le total."
  ],
  "must": [
   "Pieds DERRIÈRE la ligne pendant tout le lancer.",
   "Même ballon et même distance pour tout le monde.",
   "Exactement 10 lancers, pas un de plus.",
   "Ballon sur un trait : on compte la zone qui rapporte le MOINS.",
   "Les points sont écrits lancer par lancer, pas de tête."
  ],
  "nul": [
   "Pied sur ou devant la ligne : 0 point pour ce lancer.",
   "Lancer en plus « pour remplacer » un raté : interdit."
  ],
  "alias": [
   "lancer"
  ]
 },
 {
  "id": "5_foulees_bondissantes",
  "cat": "Coordination",
  "name": "5 foulées bondissantes",
  "mesure": "La coordination et la puissance enchaînées",
  "mat": "Ligne au sol, mètre ruban (zone souple pour la réception)",
  "essais": "2 essais",
  "note": "Le meilleur des 2 essais, en cm",
  "steps": [
   "Départ arrêté, pieds joints, derrière la ligne.",
   "Enchaîne 5 grands bonds en alternant les pieds : D – G – D – G – D (ou G – D – G – D – G).",
   "Réceptionne-toi sur les 2 pieds et ne bouge plus.",
   "Le mesureur mesure de la ligne jusqu’au talon le plus proche."
  ],
  "must": [
   "Départ pieds JOINTS, à l’arrêt, sans élan.",
   "EXACTEMENT 5 appuis, en ALTERNANT les pieds.",
   "Enchaîner sans s’arrêter entre les bonds.",
   "Réception sur les 2 pieds.",
   "Le compteur compte les appuis à voix haute."
  ],
  "nul": [
   "Élan ou pas d’élan avant le départ.",
   "Deux appuis de suite sur le même pied.",
   "Plus ou moins de 5 appuis.",
   "Pied sur la ligne au départ."
  ],
  "alias": [
   "foulee"
  ]
 },
 {
  "id": "triple_saut_1pied",
  "cat": "Coordination",
  "name": "Triple saut sur un pied",
  "mesure": "La coordination et l’équilibre en mouvement",
  "mat": "Ligne au sol, mètre ruban",
  "essais": "2 essais par pied",
  "note": "Le meilleur essai du pied droit ET du pied gauche, en cm",
  "steps": [
   "Debout sur un pied, derrière la ligne.",
   "Fais 3 sauts à cloche-pied en avançant, sans t’arrêter.",
   "Reste sur ton pied au 3e saut : le mesureur repère l’arrivée.",
   "Mesure de la ligne jusqu’au talon du pied d’arrivée. Puis l’autre pied."
  ],
  "must": [
   "Les 3 sauts sur LE MÊME pied.",
   "L’autre pied ne touche JAMAIS le sol.",
   "Les 3 sauts s’enchaînent sans temps d’arrêt.",
   "Départ derrière la ligne, sans élan.",
   "Tester les DEUX pieds et noter les deux résultats."
  ],
  "nul": [
   "L’autre pied touche le sol.",
   "Un arrêt entre deux sauts.",
   "Pied sur la ligne au départ."
  ],
  "alias": [
   "triple",
   "cloche"
  ]
 },
 {
  "id": "10x5m",
  "cat": "Vitesse",
  "name": "10 × 5 m",
  "mesure": "La vitesse et l’agilité (changements de direction)",
  "mat": "2 lignes à 5 m l’une de l’autre, plots, chronomètre",
  "essais": "1 essai",
  "note": "Le temps, en secondes (au dixième)",
  "steps": [
   "Debout, un pied derrière la ligne de départ.",
   "Le chronométreur dit « Prêt… Partez ! » et démarre le chrono.",
   "Cours jusqu’à l’autre ligne, franchis-la, fais demi-tour et reviens : chaque trajet de 5 m compte 1.",
   "10 trajets en tout (= 5 allers-retours). Le chrono s’arrête quand tu franchis la ligne la 10e fois."
  ],
  "must": [
   "Départ arrêté, derrière la ligne, au signal seulement.",
   "À chaque bout, les DEUX pieds dépassent la ligne.",
   "Le compteur annonce les trajets à voix haute : 1, 2, 3… 10.",
   "Sol sec et non glissant, baskets lacées.",
   "Chrono arrêté au franchissement de la ligne au 10e trajet."
  ],
  "nul": [
   "Faux départ : on recommence.",
   "Ligne pas franchie à un demi-tour : essai à refaire après repos.",
   "Erreur de comptage des trajets."
  ],
  "alias": [
   "10x5",
   "10 x 5",
   "navette 5"
  ]
 },
 {
  "id": "equilibre_monopodal",
  "cat": "Équilibre",
  "name": "Équilibre sur un pied",
  "mesure": "L’équilibre sans bouger (statique)",
  "mat": "Sol plat, chronomètre",
  "essais": "1 essai yeux ouverts, puis 1 essai yeux fermés",
  "note": "Les 2 temps en secondes (60 s maximum)",
  "steps": [
   "Debout, mains sur les hanches.",
   "Lève un pied, jambe fléchie : le chrono démarre.",
   "Tiens le plus longtemps possible, sans bouger le pied d’appui.",
   "Refais le test les yeux fermés."
  ],
  "must": [
   "Mains SUR LES HANCHES pendant tout le test.",
   "Le pied d’appui ne bouge pas : pas de pivot, pas de petit saut.",
   "Le pied levé ne touche pas le sol.",
   "Yeux fermés = VRAIMENT fermés du début à la fin.",
   "On arrête à 60 secondes : c’est le maximum."
  ],
  "nul": [
   "STOP : le pied levé touche le sol.",
   "STOP : le pied d’appui bouge ou glisse.",
   "STOP : les mains quittent les hanches.",
   "STOP : les yeux s’ouvrent (essai yeux fermés)."
  ],
  "safety": "Yeux fermés : un camarade reste à côté pour rattraper.",
  "alias": [
   "monopodal",
   "equilibre sur un pied",
   "unipodal"
  ]
 },
 {
  "id": "flamingo_poutre",
  "cat": "Équilibre",
  "name": "Flamingo sur poutre",
  "mesure": "L’équilibre sur une petite surface",
  "mat": "Poutre basse (3 cm de large), chronomètre",
  "essais": "1 minute d’équilibre",
  "note": "Le nombre de chutes en 1 minute",
  "steps": [
   "Monte sur la poutre sur un pied.",
   "Plie l’autre jambe et tiens ton pied avec la main du même côté (talon vers la fesse).",
   "Tu peux t’aider du bras d’un camarade pour te placer : le chrono démarre quand tu le lâches.",
   "À chaque chute : on arrête le chrono, tu te replaces, on relance. Le compteur compte les chutes."
  ],
  "must": [
   "Le pied de la jambe libre est tenu par la main du MÊME côté.",
   "Le chrono S’ARRÊTE à chaque chute et repart quand l’élève est replacé.",
   "On compte 1 minute de temps sur la poutre, pas 1 minute d’horloge.",
   "Le compteur annonce chaque chute à voix haute."
  ],
  "nul": [
   "Chute = lâcher son pied.",
   "Chute = toucher le sol ou la poutre avec une autre partie du corps.",
   "Chute = tomber de la poutre."
  ],
  "nultitle": "CE QUI COMPTE COMME UNE CHUTE",
  "alias": [
   "flamingo",
   "flamant"
  ]
 },
 {
  "id": "souplesse_posterieure",
  "cat": "Souplesse",
  "name": "Souplesse postérieure",
  "mesure": "La souplesse de l’arrière des jambes et du dos",
  "mat": "Caisson de mesure avec curseur, tapis",
  "essais": "2 essais",
  "note": "Le meilleur des 2 essais, en cm",
  "steps": [
   "Pieds nus, assis jambes tendues, plantes de pieds contre le caisson.",
   "Pose une main sur l’autre, bouts des doigts alignés.",
   "Penche-toi LENTEMENT en avant et pousse le curseur le plus loin possible.",
   "Tiens 2 secondes au plus loin : le juge lit le résultat."
  ],
  "must": [
   "Plantes de pieds bien à PLAT contre le caisson.",
   "Genoux TENDUS, l’arrière des genoux reste au sol.",
   "Mains superposées, doigts alignés : une main ne dépasse pas l’autre.",
   "Mouvement LENT, sans à-coup ni élan.",
   "Position tenue 2 secondes."
  ],
  "nul": [
   "Les genoux se plient.",
   "Un à-coup pour pousser le curseur.",
   "Une main devance l’autre."
  ],
  "alias": [
   "posterieure",
   "sit and reach",
   "flexion du tronc"
  ]
 },
 {
  "id": "souplesse_epaules",
  "cat": "Souplesse",
  "name": "Souplesse des épaules",
  "mesure": "La mobilité des épaules",
  "mat": "Règle ou mètre ruban",
  "essais": "1 essai de chaque côté",
  "note": "La distance entre les doigts, en cm (droite et gauche). Les doigts se touchent = 0 cm",
  "steps": [
   "Debout, dos droit.",
   "Côté droit : bras droit par-dessus l’épaule, main dans le dos, paume contre le dos.",
   "Bras gauche par en dessous, dos de la main contre le dos.",
   "Rapproche les doigts le plus possible. Le mesureur mesure l’écart entre les deux majeurs. Puis on inverse."
  ],
  "must": [
   "Debout, dos droit : on ne se cambre pas, on ne tourne pas le buste.",
   "Doigts TENDUS, les majeurs pointés l’un vers l’autre.",
   "On ne tire PAS en accrochant les doigts.",
   "Mesure entre les bouts des deux majeurs.",
   "Le côté noté = le bras qui passe PAR-DESSUS."
  ],
  "nul": [
   "Doigts accrochés ou qui tirent.",
   "Dos cambré ou buste qui tourne."
  ],
  "alias": [
   "epaule"
  ]
 },
 {
  "id": "vameval",
  "cat": "Endurance",
  "name": "VAMEVAL",
  "mesure": "L’endurance (le « moteur » cœur-poumons)",
  "mat": "Plots, bande sonore, enceinte, fiche de suivi",
  "essais": "1 passage",
  "note": "Le dernier palier atteint",
  "steps": [
   "Le prof lance la bande sonore : chaque bip t’indique quand arriver au plot suivant.",
   "Départ à 8 km/h (palier 1). Toutes les minutes, la vitesse augmente de 0,5 km/h.",
   "Règle ton allure pour être dans la zone du plot au moment du bip.",
   "Ton observateur note ton palier et te signale les retards."
  ],
  "must": [
   "Être DANS LA ZONE du plot au bip (ni trop tôt, ni trop tard).",
   "Ne pas partir en avance : on suit le rythme des bips.",
   "Chaque coureur a un observateur qui ne regarde que lui.",
   "Arrêt après 2 bips manqués : on note le dernier palier atteint.",
   "À l’arrêt, on marche : on ne s’assoit pas tout de suite."
  ],
  "nul": [
   "STOP : 2 bips manqués (pas dans la zone).",
   "On ne compte pas un palier fini en coupant ou en trichant sur les plots."
  ],
  "safety": "Douleur, vertige ou malaise : on s’arrête et on prévient le prof.",
  "alias": [
   "vameval"
  ]
 }
];

const COULEURS = {
  FORCE: '#be123c', COORDINATION: '#c2410c', VITESSE: '#a16207',
  EQUILIBRE: '#15803d', SOUPLESSE: '#1d4ed8', ENDURANCE: '#4338ca'
};
const NOMS_CAT = {
  FORCE: 'Force', COORDINATION: 'Coordination', VITESSE: 'Vitesse',
  EQUILIBRE: 'Équilibre', SOUPLESSE: 'Souplesse', ENDURANCE: 'Endurance'
};

const norm = (s) => (s || '').toString().toLowerCase()
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .replace(/[×]/g, 'x').replace(/\s+/g, ' ').trim();

const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// Retrouve la fiche détaillée correspondant à un test de la base (par son nom)
export const trouverFiche = (test) => {
  const n = norm(test?.name);
  if (!n) return null;
  if (n.includes('5') && n.includes('foulee')) return FICHES.find(f => f.id === '5_foulees_bondissantes');
  return FICHES.find(f => f.alias.some(a => n.includes(norm(a)))) || null;
};

// Découpe un texte libre en phrases (pour les tests sans fiche détaillée)
const phrases = (txt) => (txt || '').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean);

// Construit le contenu d'une fiche : détaillée si connue, sinon à partir des champs du test
const contenuFiche = (test) => {
  const f = trouverFiche(test);
  if (f) return { ...f, name: test.name || f.name };
  const mat = Array.isArray(test.material) && test.material.length ? test.material.join(', ') : 'Voir le prof';
  const steps = phrases(test.full_description || test.description);
  const must = phrases(test.validation);
  return {
    name: test.name,
    mesure: test.quality_evaluated || test.description || '',
    mat,
    essais: test.trials ? `${test.trials} essai${Number(test.trials) > 1 ? 's' : ''}` : '—',
    note: test.evaluation || (test.unit ? `Le résultat, en ${test.unit}` : 'Le résultat'),
    steps: steps.length ? steps.slice(0, 6) : ['Suivre les consignes du professeur.'],
    must: must.length ? must.slice(0, 6) : ['Respecter exactement les consignes ci-dessus.', 'Un doute sur un essai : on le refait.'],
    nul: ['Une consigne n’est pas respectée : l’essai est à refaire.']
  };
};

const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14532d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>';
const CROSS = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b91c1c" stroke-width="3" stroke-linecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>';
const WARN = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L22 20 H2 Z"/><line x1="12" y1="10" x2="12" y2="14"/><line x1="12" y1="17" x2="12" y2="17.5"/></svg>';

const pageFiche = (test, numero) => {
  const f = contenuFiche(test);
  const c = COULEURS[test.category] || '#111111';
  const cat = NOMS_CAT[test.category] || '';
  const li = (arr, icon, cls) => arr.map(s => `<li class="${cls}">${icon}<span>${esc(s)}</span></li>`).join('');
  const etapes = f.steps.map((s, k) => `<li class="etape"><span class="num" style="background:${c}">${k + 1}</span><span>${esc(s)}</span></li>`).join('');
  const extra = [['safety', 'Sécurité'], ['tip', 'Juge']]
    .filter(([k]) => f[k]).map(([k, lab]) => `<div class="extra">${WARN}<span><strong>${lab} : </strong>${esc(f[k])}</span></div>`).join('');
  return `
<section class="page">
  <header class="bandeau" style="background:${c}">
    <div>
      <div class="sur">${esc(cat)} · Test Sport Santé</div>
      <h1>${esc(f.name)}</h1>
      <div class="mesure">Ce test mesure : ${esc(f.mesure)}</div>
    </div>
    <div class="pastille" style="color:${c}"><small>ATELIER</small><b>${numero}</b></div>
  </header>
  <div class="infos">
    <div class="info" style="border-color:${c}"><small style="color:${c}">Matériel</small><div>${esc(f.mat)}</div></div>
    <div class="info" style="border-color:${c}"><small style="color:${c}">Essais</small><div>${esc(f.essais)}</div></div>
    <div class="info" style="border-color:${c}"><small style="color:${c}">On note</small><div>${esc(f.note)}</div></div>
  </div>
  <div><h2 style="color:${c}">Comment on fait</h2><ol>${etapes}</ol></div>
  <div class="must"><h2>Les incontournables — sinon le test ne compte pas</h2><ul>${li(f.must, CHECK, 'ok')}</ul></div>
  <div class="nul"><h2>${esc(f.nultitle || 'Essai nul / on arrête si…')}</h2><ul>${li(f.nul, CROSS, 'ko')}</ul></div>
  ${extra}
  <footer><span><strong>Rôles :</strong> testé · juge · chrono/mesureur · secrétaire — on tourne après chaque passage.</span><span><strong>Un doute ?</strong> On refait l’essai.</span></footer>
</section>`;
};

const pageAccueil = () => {
  const roles = [
    ['L’élève testé', 'Il réalise le test en respectant les incontournables.'],
    ['Le juge', 'Il a la fiche en main, vérifie CHAQUE incontournable et dit si l’essai compte ou non.'],
    ['Le chrono / mesureur', 'Il donne le départ, chronomètre ou mesure, et annonce le résultat à voix haute.'],
    ['Le secrétaire', 'Il écrit le résultat tout de suite, au bon nom, avec l’unité.']
  ];
  const etapes = [
    'Arrivez à l’atelier et lisez la fiche ENSEMBLE, à voix haute.',
    'Installez le matériel comme indiqué sur la fiche.',
    'Répartissez les 4 rôles.',
    'Le premier passe le test. Le juge vérifie les incontournables pendant tout le test.',
    'Le secrétaire note le résultat. Puis on tourne les rôles jusqu’à ce que tout le monde soit passé.',
    'Rangez le matériel comme vous l’avez trouvé et attendez le signal pour changer d’atelier.'
  ];
  const regles = [
    'Un essai qui ne respecte pas un incontournable NE COMPTE PAS : on le refait.',
    'Un doute ? On refait l’essai. Toujours un doute ? On lève la main et on appelle le prof.',
    'Pas de résultat inventé ou arrondi « pour faire plaisir ».',
    'On encourage, on ne se moque pas : chacun progresse à son rythme.'
  ];
  return `
<section class="page accueil">
  <header class="bandeau" style="background:#111"><div>
    <div class="sur">Tests Sport Santé</div>
    <h1>Ateliers en autonomie</h1>
    <div class="mesure">Votre mission : faire passer les tests vous-mêmes, sérieusement, pour que les résultats soient VRAIS.</div>
  </div></header>
  <div><h2>Les 4 rôles dans chaque groupe</h2><ul class="roles">${roles.map(([a, b]) => `<li><b>${esc(a)}</b><span>${esc(b)}</span></li>`).join('')}</ul></div>
  <div><h2>À chaque atelier</h2><ol>${etapes.map((s, k) => `<li class="etape"><span class="num" style="background:#111">${k + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol></div>
  <div class="must"><h2>Les règles d’or</h2><ul>${regles.map(s => `<li class="ok">${CHECK}<span>${esc(s)}</span></li>`).join('')}</ul></div>
</section>`;
};

const CSS = `
@page { size: A4; margin: 0; }
* { box-sizing: border-box; }
body { margin: 0; background: #e5e7eb; font-family: Inter, Arial, sans-serif; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
.barre { position: sticky; top: 0; z-index: 2; background: #1e3a8a; color: #fff; padding: 12px 20px; display: flex; gap: 16px; align-items: center; justify-content: space-between; font-size: 15px; }
.barre button { background: #fff; color: #1e3a8a; border: 0; border-radius: 8px; padding: 10px 18px; font-size: 15px; font-weight: 700; cursor: pointer; }
.page { width: 210mm; height: 297mm; margin: 16px auto; background: #fff; padding: 10mm 11mm; display: flex; flex-direction: column; gap: 14px; overflow: hidden; page-break-after: always; break-after: page; }
.bandeau { color: #fff; border-radius: 14px; padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.sur { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 2px 0; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 46px; line-height: 1; text-transform: uppercase; }
.mesure { font-size: 15px; font-weight: 500; }
.pastille { flex: none; width: 86px; height: 86px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pastille small { font-size: 11px; font-weight: 700; letter-spacing: .1em; }
.pastille b { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-size: 42px; line-height: 1; }
.infos { display: flex; gap: 10px; }
.info { flex: 1; border: 2px solid; border-radius: 10px; padding: 8px 12px; font-size: 14px; font-weight: 600; line-height: 1.35; }
.info small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; }
h2 { margin: 0 0 8px; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 21px; letter-spacing: .04em; text-transform: uppercase; }
ol, ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.etape { display: flex; gap: 12px; align-items: flex-start; font-size: 15px; line-height: 1.4; }
.num { flex: none; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.etape span:last-child { padding-top: 3px; }
.must { background: #fff4c7; border: 3px solid #111; border-radius: 14px; padding: 12px 16px; }
.ok { display: flex; gap: 10px; align-items: flex-start; font-size: 16px; font-weight: 600; line-height: 1.35; }
.nul { background: #fdecec; border: 2px solid #b91c1c; border-radius: 14px; padding: 10px 16px; }
.nul h2 { color: #991b1b; }
.ko { display: flex; gap: 10px; align-items: flex-start; font-size: 15px; line-height: 1.35; }
.ok svg, .ko svg, .extra svg { flex: none; margin-top: 1px; }
.extra { display: flex; gap: 10px; align-items: flex-start; font-size: 14px; line-height: 1.35; border: 2px dashed #111; border-radius: 10px; padding: 8px 14px; }
footer span:last-child { flex: none; }
footer { margin-top: auto; border-top: 2px solid #111; padding-top: 8px; font-size: 13px; display: flex; justify-content: space-between; gap: 16px; }
.accueil { gap: 22px; }
.accueil h1 { font-size: 56px; }
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.roles li { border: 2px solid #111; border-radius: 12px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; font-size: 15px; line-height: 1.4; }
.roles b { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-size: 22px; text-transform: uppercase; }
@media print { body { background: #fff; } .barre { display: none; } .page { margin: 0; } }
`;

// Ouvre les fiches dans un nouvel onglet, prêtes à imprimer ou à enregistrer en PDF
export const ouvrirFichesAteliers = (tests, options = {}) => {
  const { accueil = true } = options;
  const liste = (tests || []).filter(Boolean);
  if (liste.length === 0) {
    alert('Aucun test à imprimer.');
    return;
  }
  const html = `<!doctype html><html lang="fr"><head><meta charset="utf-8">
<title>Fiches ateliers – Tests Sport Santé</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Barlow+Condensed:wght@700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>${CSS}</style></head><body>
<div class="barre"><span>${liste.length} fiche${liste.length > 1 ? 's' : ''}${accueil ? ' + page d’accueil' : ''} · Pour un PDF : choisir « Enregistrer au format PDF » comme imprimante</span>
<button onclick="window.print()">Imprimer / Enregistrer en PDF</button></div>
${accueil ? pageAccueil() : ''}
${liste.map((t, i) => pageFiche(t, i + 1)).join('')}
<script>
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(function () { setTimeout(function () { window.print(); }, 300); });
</script>
</body></html>`;
  const w = window.open('', '_blank');
  if (!w) {
    alert('Votre navigateur a bloqué l’ouverture des fiches. Autorisez les fenêtres pop-up pour ce site puis réessayez.');
    return;
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
};
