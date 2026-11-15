// Fiches ateliers imprimables (tests Sport Santé)
//
// IMPORTANT : le contenu des fiches vient UNIQUEMENT des données de chaque test
// enregistrées dans l'appli (table "tests") : nom, qualité évaluée, matériel,
// nombre d'essais, consignes de réalisation, validation, évaluation, unité.
// Aucun protocole n'est écrit ici : pour changer une fiche, on modifie le test
// dans l'appli (bouton "Modifier"), et la fiche suit automatiquement.

const COULEURS = {
  FORCE: '#be123c', COORDINATION: '#c2410c', VITESSE: '#a16207',
  EQUILIBRE: '#15803d', SOUPLESSE: '#1d4ed8', ENDURANCE: '#4338ca'
};
const NOMS_CAT = {
  FORCE: 'Force', COORDINATION: 'Coordination', VITESSE: 'Vitesse',
  EQUILIBRE: 'Équilibre', SOUPLESSE: 'Souplesse', ENDURANCE: 'Endurance'
};

const esc = (s) => (s ?? '').toString()
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const texte = (v) => (v ?? '').toString().trim();

// Découpe en phrases sans modifier les mots (coupure après . ! ? ou retour à la ligne)
const enPhrases = (txt) => texte(txt)
  .split(/(?<=[.!?])\s+(?=[A-ZÀ-ÖØ-Ý0-9«"(])|\r?\n+/)
  .map(s => s.trim()).filter(Boolean);

// Découpe les critères de validation (séparés par des virgules, points-virgules,
// points ou retours à la ligne) sans modifier les mots
const enCriteres = (txt) => texte(txt)
  .split(/\s*[;\n]\s*|(?<=[.!?])\s+|,\s+(?=[a-zà-ÿA-ZÀ-Ý])/)
  .map(s => s.trim().replace(/[.,;]+$/, ''))
  .filter(Boolean);

const majuscule = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

// Champs utiles à une fiche qui ne sont pas renseignés dans l'appli
export const champsManquants = (test) => {
  const manquants = [];
  if (!texte(test?.full_description)) manquants.push('consignes de réalisation');
  if (!texte(test?.validation)) manquants.push('validation');
  if (!(Array.isArray(test?.material) && test.material.some(m => texte(m)))) manquants.push('matériel');
  return manquants;
};

const A_COMPLETER = (champ) =>
  `<span class="vide">Non renseigné dans l’appli (${esc(champ)}) — à compléter avec le bouton « Modifier » du test.</span>`;

const CHECK = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#14532d" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 12 10 18 20 6"/></svg>';

const pageFiche = (test, numero) => {
  const c = COULEURS[test.category] || '#111111';
  const cat = NOMS_CAT[test.category] || texte(test.category);
  const materiel = (Array.isArray(test.material) ? test.material : []).map(texte).filter(Boolean);
  const essais = texte(test.trials);
  const unite = texte(test.unit);
  const evaluation = texte(test.evaluation);
  const mesure = texte(test.quality_evaluated);
  const description = texte(test.description);
  const etapes = enPhrases(test.full_description);
  const criteres = enCriteres(test.validation);

  const blocEtapes = etapes.length
    ? `<ol>${etapes.map((s, k) => `<li class="etape"><span class="num" style="background:${c}">${k + 1}</span><span>${esc(s)}</span></li>`).join('')}</ol>`
    : A_COMPLETER('consignes de réalisation');

  const blocCriteres = criteres.length
    ? `<ul>${criteres.map(s => `<li class="ok">${CHECK}<span>${esc(majuscule(s))}</span></li>`).join('')}</ul>`
    : A_COMPLETER('validation');

  return `
<section class="page">
  <header class="bandeau" style="background:${c}">
    <div>
      <div class="sur">${esc(cat)} · Test Sport Santé</div>
      <h1>${esc(test.name)}</h1>
      ${mesure ? `<div class="mesure">Qualité évaluée : ${esc(mesure)}</div>` : ''}
    </div>
    <div class="pastille" style="color:${c}"><small>ATELIER</small><b>${numero}</b></div>
  </header>
  <div class="infos">
    <div class="info" style="border-color:${c}"><small style="color:${c}">Matériel</small><div>${materiel.length ? esc(materiel.join(' · ')) : '—'}</div></div>
    <div class="info" style="border-color:${c}"><small style="color:${c}">Nombre d’essais</small><div>${essais ? esc(essais) : '—'}</div></div>
    <div class="info" style="border-color:${c}"><small style="color:${c}">On note</small><div>${evaluation ? esc(evaluation) : '—'}${unite ? ` <span class="unite">(${esc(unite)})</span>` : ''}</div></div>
  </div>
  ${description ? `<p class="description">${esc(description)}</p>` : ''}
  <div><h2 style="color:${c}">Consignes de réalisation</h2>${blocEtapes}</div>
  <div class="must"><h2>Validation — l’essai compte seulement si :</h2>${blocCriteres}</div>
  <footer><span><strong>Rôles :</strong> testé · juge · chrono/mesureur · secrétaire — on tourne après chaque passage.</span><span>Un doute ? On appelle le prof.</span></footer>
</section>`;
};

const pageAccueil = () => {
  const roles = [
    ['L’élève testé', 'Il réalise le test en suivant les consignes de la fiche.'],
    ['Le juge', 'Il a la fiche en main et vérifie la partie « Validation » pendant tout le test.'],
    ['Le chrono / mesureur', 'Il donne le départ, chronomètre ou mesure, et annonce le résultat à voix haute.'],
    ['Le secrétaire', 'Il écrit le résultat tout de suite, au bon nom, avec l’unité.']
  ];
  const etapes = [
    'Arrivez à l’atelier et lisez la fiche ENSEMBLE, à voix haute.',
    'Installez le matériel indiqué sur la fiche.',
    'Répartissez les 4 rôles.',
    'Le premier passe le test. Le juge vérifie la partie « Validation ».',
    'Le secrétaire note le résultat. Puis on tourne les rôles jusqu’à ce que tout le monde soit passé.',
    'Rangez le matériel comme vous l’avez trouvé et attendez le signal pour changer d’atelier.'
  ];
  const regles = [
    'On respecte exactement les consignes de la fiche : pas d’adaptation.',
    'Un doute sur un essai ? On lève la main et on appelle le prof.',
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
.page { --fs: 16px; width: 210mm; height: 297mm; margin: 16px auto; background: #fff; padding: 10mm 11mm; display: flex; flex-direction: column; gap: 14px; overflow: hidden; page-break-after: always; break-after: page; font-size: var(--fs); }
.bandeau { color: #fff; border-radius: 14px; padding: 16px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.sur { font-size: 12px; font-weight: 700; letter-spacing: .12em; text-transform: uppercase; }
h1 { margin: 2px 0; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 46px; line-height: 1; text-transform: uppercase; }
.mesure { font-size: 15px; font-weight: 500; }
.pastille { flex: none; width: 86px; height: 86px; border-radius: 50%; background: #fff; display: flex; flex-direction: column; align-items: center; justify-content: center; }
.pastille small { font-size: 11px; font-weight: 700; letter-spacing: .1em; }
.pastille b { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-size: 42px; line-height: 1; }
.infos { display: flex; gap: 10px; }
.info { flex: 1; border: 2px solid; border-radius: 10px; padding: 8px 12px; font-size: 0.875em; font-weight: 600; line-height: 1.35; }
.info small { display: block; font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; margin-bottom: 3px; }
.unite { font-weight: 500; }
.description { margin: 0; font-size: 1em; font-style: italic; line-height: 1.4; }
h2 { margin: 0 0 8px; font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-weight: 800; font-size: 21px; letter-spacing: .04em; text-transform: uppercase; }
ol, ul { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 7px; }
.etape { display: flex; gap: 12px; align-items: flex-start; font-size: 1em; line-height: 1.4; }
.num { flex: none; width: 26px; height: 26px; border-radius: 50%; color: #fff; font-weight: 700; font-size: 14px; display: flex; align-items: center; justify-content: center; }
.etape span:last-child { padding-top: 3px; }
.must { background: #fff4c7; border: 3px solid #111; border-radius: 14px; padding: 12px 16px; }
.ok { display: flex; gap: 10px; align-items: flex-start; font-size: 1.05em; font-weight: 600; line-height: 1.35; }
.ok svg { flex: none; margin-top: 1px; }
.vide { display: block; color: #92400e; font-style: italic; font-size: 0.9em; }
footer { margin-top: auto; border-top: 2px solid #111; padding-top: 8px; font-size: 13px; display: flex; justify-content: space-between; gap: 16px; }
footer span:last-child { flex: none; }
.accueil { gap: 22px; }
.accueil h1 { font-size: 56px; }
.roles { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.roles li { border: 2px solid #111; border-radius: 12px; padding: 12px 16px; display: flex; flex-direction: column; gap: 4px; font-size: 15px; line-height: 1.4; }
.roles b { font-family: 'Barlow Condensed', 'Arial Narrow', sans-serif; font-size: 22px; text-transform: uppercase; }
@media print { body { background: #fff; } .barre { display: none; } .page { margin: 0; } }
`;

// Réduit la taille du texte d'une fiche trop longue pour qu'elle tienne sur une page A4
const SCRIPT_AJUSTE = `
function ajuster() {
  document.querySelectorAll('.page').forEach(function (p) {
    var fs = 16;
    while (p.scrollHeight > p.clientHeight + 1 && fs > 10) {
      fs -= 0.5;
      p.style.setProperty('--fs', fs + 'px');
    }
  });
}
(document.fonts ? document.fonts.ready : Promise.resolve()).then(function () {
  ajuster();
  setTimeout(function () { window.print(); }, 300);
});
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
<script>${SCRIPT_AJUSTE}</script>
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
