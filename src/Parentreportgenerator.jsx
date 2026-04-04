// ParentReportGenerator.jsx
// Génération du bilan A4 pour les familles — annuel ou bilan de fin de 3ème
import React, { useState } from 'react';
import { FileText, Loader, ChevronDown } from 'lucide-react';
import { supabase } from './lib/supabase.js';

// ─── Constantes ────────────────────────────────────────────────────────────────

const LEVEL_ORDER = ['6ème', '5ème', '4ème', '3ème'];

const LEVEL_STYLES = {
  '6ème': { color: '#2563eb', light: '#dbeafe', label: 'Sixième' },
  '5ème': { color: '#16a34a', light: '#dcfce7', label: 'Cinquième' },
  '4ème': { color: '#ea580c', light: '#ffedd5', label: 'Quatrième' },
  '3ème': { color: '#9333ea', light: '#f3e8ff', label: 'Troisième' },
};

const CATEGORIES = {
  ENDURANCE:    { name: 'Endurance',    color: '#2563eb', icon: '🏃' },
  FORCE:        { name: 'Force',        color: '#dc2626', icon: '💪' },
  VITESSE:      { name: 'Vitesse',      color: '#ca8a04', icon: '⚡' },
  COORDINATION: { name: 'Coordination', color: '#9333ea', icon: '🎯' },
  EQUILIBRE:    { name: 'Équilibre',    color: '#4f46e5', icon: '⚖️' },
  SOUPLESSE:    { name: 'Souplesse',    color: '#16a34a', icon: '🤸' },
};

// ─── Scoring (identique à IndividualFitnessCard) ───────────────────────────────

const getTestDirection = (testName) => {
  const timeBased = ['SPRINTS 10 x 5', '30 mètres', 'FLAMINGO'];
  return !timeBased.some(t => testName.toUpperCase().includes(t.toUpperCase()));
};

const calcPercentiles = (vals) => {
  const s = [...vals].sort((a, b) => a - b);
  const n = s.length;
  return {
    p10: s[Math.floor(n * 0.10)] ?? s[0],
    p25: s[Math.floor(n * 0.25)] ?? s[0],
    p50: s[Math.floor(n * 0.50)] ?? s[0],
    p75: s[Math.floor(n * 0.75)] ?? s[n - 1],
    p90: s[Math.floor(n * 0.90)] ?? s[n - 1],
  };
};

const calcScore = (value, percentiles, higherIsBetter, min, max) => {
  const v = parseFloat(value);
  if (isNaN(v)) return null;
  if (higherIsBetter) {
    if (v >= percentiles.p90) { const r = max - percentiles.p90; if (!r) return 100; return Math.round(85 + (v - percentiles.p90) / r * 15); }
    if (v >= percentiles.p75) { const r = percentiles.p90 - percentiles.p75; if (!r) return 77; return Math.round(70 + (v - percentiles.p75) / r * 14); }
    if (v >= percentiles.p50) { const r = percentiles.p75 - percentiles.p50; if (!r) return 62; return Math.round(55 + (v - percentiles.p50) / r * 14); }
    if (v >= percentiles.p25) { const r = percentiles.p50 - percentiles.p25; if (!r) return 47; return Math.round(40 + (v - percentiles.p25) / r * 14); }
    const r = percentiles.p25 - min; if (!r) return 25; return Math.round(10 + Math.max(0, (v - min) / r) * 29);
  } else {
    if (v <= percentiles.p10) { const r = percentiles.p10 - min; if (!r) return 100; return Math.round(85 + (percentiles.p10 - v) / r * 15); }
    if (v <= percentiles.p25) { const r = percentiles.p25 - percentiles.p10; if (!r) return 77; return Math.round(70 + (percentiles.p25 - v) / r * 14); }
    if (v <= percentiles.p50) { const r = percentiles.p50 - percentiles.p25; if (!r) return 62; return Math.round(55 + (percentiles.p50 - v) / r * 14); }
    if (v <= percentiles.p75) { const r = percentiles.p75 - percentiles.p50; if (!r) return 47; return Math.round(40 + (percentiles.p75 - v) / r * 14); }
    const r = max - percentiles.p75; if (!r) return 25; return Math.round(10 + Math.max(0, (max - v) / r) * 29);
  }
};

const getPercentileLabel = (score) => {
  if (score >= 90) return { label: 'Top 10%', rank: 'dans les 10% meilleurs' };
  if (score >= 75) return { label: 'Top 25%', rank: 'dans les 25% meilleurs' };
  if (score >= 50) return { label: 'Top 50%', rank: 'au-dessus de la moyenne' };
  if (score >= 25) return { label: 'Top 75%', rank: 'en-dessous de la moyenne' };
  return { label: 'Bas 25%', rank: 'dans les 25% les plus faibles' };
};

const getScoreLabel = (score) => {
  if (score >= 85) return { text: 'Excellent', color: '#16a34a' };
  if (score >= 70) return { text: 'Bon', color: '#2563eb' };
  if (score >= 55) return { text: 'Correct', color: '#ca8a04' };
  return { text: 'À améliorer', color: '#dc2626' };
};

// ─── Chargement des données ────────────────────────────────────────────────────

const fetchCohortData = async (testName, level, gender, schoolYear) => {
  const { data } = await supabase
    .from('results')
    .select('value, tests!inner(name), students!inner(gender, school_year, classes!inner(level))')
    .eq('tests.name', testName)
    .eq('students.gender', gender)
    .eq('students.classes.level', level)
    .eq('students.school_year', schoolYear)
    .not('value', 'is', null);

  if (!data || data.length < 5) return null;
  const values = data.map(r => parseFloat(r.value)).filter(v => !isNaN(v));
  if (values.length < 5) return null;

  const higherIsBetter = getTestDirection(testName);
  const percentiles = calcPercentiles(values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  return { percentiles, higherIsBetter, min: Math.min(...values), max: Math.max(...values), avg, n: values.length };
};

const computeYearData = async (record, onProgress) => {
  const { data: results } = await supabase
    .from('results')
    .select('value, test_id, absent, dispensed, tests(id, name, category, unit)')
    .eq('student_id', record.id);

  const { data: allTests } = await supabase.from('tests').select('id, name, category, unit');
  const level = record.classes?.level;
  const gender = record.gender;
  const schoolYear = record.school_year;
  const totalTests = allTests?.length || 0;
  const validResults = (results || []).filter(r => !r.absent && !r.dispensed && r.value !== null);

  const categoryData = {};
  const testDetails = [];

  for (const catKey of Object.keys(CATEGORIES)) {
    const catResults = validResults.filter(r => r.tests?.category === catKey);
    let totalScore = 0, validCount = 0;
    const catTestDetails = [];

    for (const res of catResults) {
      const cohort = await fetchCohortData(res.tests.name, level, gender, schoolYear);
      if (!cohort) continue;
      const score = calcScore(res.value, cohort.percentiles, cohort.higherIsBetter, cohort.min, cohort.max);
      if (score === null) continue;

      // Position percentile précise (0-100) pour la barre
      const numVal = parseFloat(res.value);
      let pctPosition = 50;
      const allVals = [];
      if (cohort.percentiles) {
        const pts = [cohort.min, cohort.percentiles.p10, cohort.percentiles.p25,
          cohort.percentiles.p50, cohort.percentiles.p75, cohort.percentiles.p90, cohort.max];
        const pcts = [0, 10, 25, 50, 75, 90, 100];
        for (let i = 0; i < pts.length - 1; i++) {
          if (cohort.higherIsBetter ? (numVal >= pts[i] && numVal <= pts[i + 1]) : (numVal <= pts[i] && numVal >= pts[i + 1])) {
            const frac = pts[i + 1] - pts[i] !== 0 ? (numVal - pts[i]) / (pts[i + 1] - pts[i]) : 0.5;
            pctPosition = cohort.higherIsBetter
              ? pcts[i] + frac * (pcts[i + 1] - pcts[i])
              : pcts[i + 1] + (1 - frac) * (pcts[i] - pcts[i + 1]);
          }
        }
      }

      const detail = {
        name: res.tests.name,
        unit: res.tests.unit,
        value: res.value,
        score,
        percentilePos: Math.round(Math.min(100, Math.max(0, score))),
        avgValue: cohort.avg ? cohort.avg.toFixed(1) : '—',
        cohortN: cohort.n,
        category: catKey,
      };
      catTestDetails.push(detail);
      testDetails.push(detail);
      totalScore += score;
      validCount++;
    }

    categoryData[catKey] = {
      score: validCount > 0 ? Math.round(totalScore / validCount) : null,
      testsCompleted: catResults.length,
      totalTests: allTests?.filter(t => t.category === catKey).length || 0,
      details: catTestDetails,
    };
  }

  const validCatScores = Object.values(categoryData).map(c => c.score).filter(s => s !== null);
  const globalScore = validCatScores.length > 0
    ? Math.round(validCatScores.reduce((a, b) => a + b, 0) / validCatScores.length) : null;

  // Score de la cohorte complète (moyenne de tous les élèves du même niveau/genre)
  const { data: cohortStudents } = await supabase
    .from('students')
    .select('id')
    .eq('school_year', schoolYear)
    .eq('gender', gender)
    .match({ 'classes.level': level });

  return {
    schoolYear,
    level,
    className: record.classes?.name,
    gender,
    firstName: record.first_name,
    lastName: record.last_name,
    globalScore,
    categoryData,
    testDetails,
    testsCompleted: validResults.length,
    totalTests,
    reliability: totalTests > 0 ? validResults.length / totalTests : 0,
  };
};

// ─── Générateurs SVG inline pour l'impression ─────────────────────────────────

const svgRadar = (scores, size = 200) => {
  const cx = size / 2, cy = size / 2, r = size * 0.38;
  const keys = Object.keys(CATEGORIES);
  const n = keys.length;
  const pts = keys.map((k, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const val = (scores[k] || 0) / 100;
    return { x: cx + Math.cos(angle) * r * val, y: cy + Math.sin(angle) * r * val };
  });
  const gridPts = keys.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    return { x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r };
  });

  const polyPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  const gridStr = gridPts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  const gridLines = keys.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const gx = cx + Math.cos(angle) * r;
    const gy = cy + Math.sin(angle) * r;
    return `<line x1="${cx}" y1="${cy}" x2="${gx.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
  }).join('');

  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const rpts = keys.map((_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${(cx + Math.cos(angle) * r * f).toFixed(1)},${(cy + Math.sin(angle) * r * f).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${rpts}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }).join('');

  const labels = keys.map((k, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const lx = cx + Math.cos(angle) * (r + 22);
    const ly = cy + Math.sin(angle) * (r + 22);
    const meta = CATEGORIES[k];
    return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="${meta.color}">${meta.icon} ${meta.name.slice(0, 4)}</text>`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${rings}${gridLines}
    <polygon points="${polyPts}" fill="#6366f1" fill-opacity="0.25" stroke="#6366f1" stroke-width="2"/>
    ${labels}
  </svg>`;
};

const svgRadarMulti = (yearsData, size = 220) => {
  const cx = size / 2, cy = size / 2, r = size * 0.36;
  const keys = Object.keys(CATEGORIES);
  const n = keys.length;
  const colors = Object.values(LEVEL_STYLES).map(s => s.color);

  const rings = [0.25, 0.5, 0.75, 1].map(f => {
    const rpts = keys.map((_, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      return `${(cx + Math.cos(angle) * r * f).toFixed(1)},${(cy + Math.sin(angle) * r * f).toFixed(1)}`;
    }).join(' ');
    return `<polygon points="${rpts}" fill="none" stroke="#e5e7eb" stroke-width="1"/>`;
  }).join('');

  const gridLines = keys.map((_, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const gx = cx + Math.cos(angle) * r;
    const gy = cy + Math.sin(angle) * r;
    return `<line x1="${cx}" y1="${cy}" x2="${gx.toFixed(1)}" y2="${gy.toFixed(1)}" stroke="#e5e7eb" stroke-width="1"/>`;
  }).join('');

  const polys = yearsData.map((y, yi) => {
    const color = LEVEL_STYLES[y.level]?.color || colors[yi % colors.length];
    const pts = keys.map((k, i) => {
      const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
      const val = ((y.categoryData[k]?.score || 0)) / 100;
      return `${(cx + Math.cos(angle) * r * val).toFixed(1)},${(cy + Math.sin(angle) * r * val).toFixed(1)}`;
    }).join(' ');
    const dashArray = yi < yearsData.length - 1 ? 'stroke-dasharray="4 2"' : '';
    return `<polygon points="${pts}" fill="${color}" fill-opacity="${0.08 + yi * 0.04}" stroke="${color}" stroke-width="2" ${dashArray}/>`;
  }).join('');

  const labels = keys.map((k, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const lx = cx + Math.cos(angle) * (r + 20);
    const ly = cy + Math.sin(angle) * (r + 20);
    const meta = CATEGORIES[k];
    return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="8" font-weight="bold" fill="${meta.color}">${meta.name.slice(0, 5)}</text>`;
  }).join('');

  const legend = yearsData.map((y, i) => {
    const color = LEVEL_STYLES[y.level]?.color || '#666';
    return `<rect x="${5 + i * 55}" y="${size - 14}" width="8" height="8" fill="${color}" rx="2"/>
    <text x="${15 + i * 55}" y="${size - 7}" font-size="8" fill="${color}" font-weight="bold">${y.level}</text>`;
  }).join('');

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    ${rings}${gridLines}${polys}${labels}${legend}
  </svg>`;
};

const svgLineChart = (yearsData, w = 380, h = 120) => {
  if (yearsData.length < 1) return '';
  const pad = { t: 15, r: 20, b: 30, l: 35 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const xStep = yearsData.length > 1 ? iw / (yearsData.length - 1) : iw / 2;

  const pts = yearsData.map((y, i) => ({
    x: pad.l + (yearsData.length > 1 ? i * xStep : iw / 2),
    y: pad.t + ih - ((y.globalScore || 0) / 100) * ih,
    score: y.globalScore,
    level: y.level,
  }));

  const polyline = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Grid horizontale
  const gridH = [25, 50, 75, 100].map(v => {
    const gy = pad.t + ih - (v / 100) * ih;
    return `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${w - pad.r}" y2="${gy.toFixed(1)}" stroke="#f3f4f6" stroke-width="1"/>
    <text x="${pad.l - 4}" y="${(gy + 3).toFixed(1)}" text-anchor="end" font-size="8" fill="#9ca3af">${v}</text>`;
  }).join('');

  const dots = pts.map(p => {
    const color = LEVEL_STYLES[p.level]?.color || '#6366f1';
    const scoreLabel = p.score !== null ? p.score : '—';
    return `<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="5" fill="${color}" stroke="white" stroke-width="2"/>
    <text x="${p.x.toFixed(1)}" y="${(p.y - 9).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="${color}">${scoreLabel}</text>`;
  }).join('');

  const xLabels = pts.map(p =>
    `<text x="${p.x.toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="9" font-weight="bold" fill="${LEVEL_STYLES[p.level]?.color || '#374151'}">${p.level}</text>`
  ).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${gridH}
    <polyline points="${polyline}" fill="none" stroke="#6366f1" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}${xLabels}
  </svg>`;
};

const svgBarCategory = (yearsData, w = 380, h = 130) => {
  const cats = Object.keys(CATEGORIES);
  const nCats = cats.length;
  const nYears = yearsData.length;
  const pad = { t: 10, r: 10, b: 30, l: 10 };
  const iw = w - pad.l - pad.r, ih = h - pad.t - pad.b;
  const groupW = iw / nCats;
  const barW = Math.min(18, (groupW - 4) / nYears);
  const barGap = 2;

  const bars = cats.map((cat, ci) => {
    const gx = pad.l + ci * groupW;
    const catBars = yearsData.map((y, yi) => {
      const score = y.categoryData[cat]?.score || 0;
      const barH = (score / 100) * ih;
      const bx = gx + (groupW - (nYears * (barW + barGap) - barGap)) / 2 + yi * (barW + barGap);
      const by = pad.t + ih - barH;
      const color = LEVEL_STYLES[y.level]?.color || '#6366f1';
      return `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW}" height="${barH.toFixed(1)}" fill="${color}" rx="2" opacity="0.85"/>
      <text x="${(bx + barW / 2).toFixed(1)}" y="${(by - 2).toFixed(1)}" text-anchor="middle" font-size="7" fill="${color}" font-weight="bold">${score || ''}</text>`;
    }).join('');

    const catMeta = CATEGORIES[cat];
    return `${catBars}
    <text x="${(gx + groupW / 2).toFixed(1)}" y="${h - 2}" text-anchor="middle" font-size="8" fill="${catMeta.color}" font-weight="bold">${catMeta.icon}</text>
    <text x="${(gx + groupW / 2).toFixed(1)}" y="${h - 12}" text-anchor="middle" font-size="7" fill="#6b7280">${catMeta.name.slice(0, 6)}</text>`;
  }).join('');

  // Grid
  const gridH = [25, 50, 75, 100].map(v => {
    const gy = pad.t + ih - (v / 100) * ih;
    return `<line x1="${pad.l}" y1="${gy.toFixed(1)}" x2="${w - pad.r}" y2="${gy.toFixed(1)}" stroke="#f3f4f6" stroke-width="1"/>`;
  }).join('');

  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg">
    ${gridH}${bars}
  </svg>`;
};

// ─── Génération HTML ───────────────────────────────────────────────────────────

const generateHTML = (yearsData, reportType, collegeName) => {
  const student = yearsData[0];
  const isMultiYear = reportType === 'final' && yearsData.length > 1;
  const currentYear = yearsData[yearsData.length - 1];
  const dateNow = new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
  const genderLabel = student.gender === 'M' ? 'Garçon' : 'Fille';

  const cssGlobal = `
    @page { size: A4; margin: 14mm 12mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Arial', sans-serif; font-size: 10px; color: #1f2937; background: white; }
    h1 { font-size: 20px; } h2 { font-size: 14px; } h3 { font-size: 11px; }
    .page-break { page-break-before: always; }
    .avoid-break { page-break-inside: avoid; }

    /* Header */
    .doc-header { background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; border-radius: 10px; padding: 14px 18px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; }
    .doc-header .school { font-size: 9px; opacity: 0.8; margin-top: 2px; }
    .doc-header .date { font-size: 9px; opacity: 0.75; text-align: right; }

    /* Score badge */
    .score-badge { display: inline-flex; flex-direction: column; align-items: center; justify-content: center; width: 80px; height: 80px; border-radius: 50%; border: 5px solid; }
    .score-big { font-size: 24px; font-weight: 900; line-height: 1; }
    .score-sub { font-size: 9px; opacity: 0.8; }

    /* Sections */
    .section { margin-bottom: 12px; }
    .section-title { font-size: 11px; font-weight: bold; color: #4f46e5; border-bottom: 2px solid #e0e7ff; padding-bottom: 4px; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }

    /* Cards */
    .card { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
    .card-grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
    .card-grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; }

    /* Cat summary */
    .cat-row { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px solid #f3f4f6; }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
    .cat-name { width: 90px; font-size: 9px; font-weight: bold; }
    .cat-bar-bg { flex: 1; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; }
    .cat-bar-fill { height: 100%; border-radius: 4px; }
    .cat-score { width: 40px; text-align: right; font-size: 9px; font-weight: bold; }
    .cat-rank { width: 80px; text-align: right; font-size: 8px; color: #6b7280; }

    /* Test detail */
    .test-row { display: flex; align-items: center; gap: 6px; padding: 4px 0; border-bottom: 1px solid #f9fafb; }
    .test-name { width: 140px; font-size: 8.5px; color: #374151; }
    .test-val { width: 60px; font-size: 9px; font-weight: bold; color: #1f2937; text-align: center; }
    .test-avg { width: 55px; font-size: 8px; color: #9ca3af; text-align: center; }
    .pct-bar-bg { flex: 1; height: 7px; background: #f3f4f6; border-radius: 4px; overflow: hidden; position: relative; }
    .pct-bar-fill { height: 100%; border-radius: 4px; }
    .pct-marker { position: absolute; top: 0; height: 100%; width: 1.5px; background: #d1d5db; }
    .test-score { width: 32px; text-align: right; font-size: 8.5px; font-weight: bold; }

    /* Evolution table */
    .evo-table { width: 100%; border-collapse: collapse; font-size: 9px; }
    .evo-table th { background: #f9fafb; padding: 5px 8px; text-align: center; font-weight: bold; border: 1px solid #e5e7eb; }
    .evo-table td { padding: 5px 8px; text-align: center; border: 1px solid #e5e7eb; }
    .evo-table tr:nth-child(even) td { background: #fafafa; }

    /* Delta */
    .delta-up { color: #16a34a; font-weight: bold; }
    .delta-dn { color: #dc2626; font-weight: bold; }
    .delta-eq { color: #6b7280; }

    /* Advice */
    .advice-box { background: #f0f9ff; border-left: 3px solid #0ea5e9; padding: 8px 10px; border-radius: 0 6px 6px 0; font-size: 9px; line-height: 1.5; margin-top: 6px; }
    .advice-title { font-weight: bold; color: #0284c7; margin-bottom: 3px; font-size: 9px; }

    /* Highlights */
    .highlight-box { border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; }
    .highlight-green { background: #f0fdf4; border: 1px solid #86efac; }
    .highlight-red { background: #fef2f2; border: 1px solid #fca5a5; }
    .highlight-blue { background: #eff6ff; border: 1px solid #93c5fd; }

    /* Footer */
    .doc-footer { margin-top: 14px; padding-top: 8px; border-top: 1px solid #e5e7eb; font-size: 8px; color: #9ca3af; display: flex; justify-content: space-between; }

    /* OMS box */
    .oms-box { background: #fefce8; border: 1px solid #fde68a; border-radius: 8px; padding: 10px; font-size: 9px; }
    .oms-title { font-weight: bold; color: #92400e; margin-bottom: 4px; }

    /* Participation */
    .parti-bar { display: flex; gap: 2px; margin: 4px 0; }
    .parti-dot { width: 10px; height: 10px; border-radius: 2px; }

    /* Year section title */
    .year-header { display: flex; align-items: center; gap: 10px; padding: 10px 14px; border-radius: 8px; margin-bottom: 10px; }
    .year-badge { font-size: 18px; font-weight: 900; color: white; background: var(--yc); padding: 4px 12px; border-radius: 20px; }
  `;

  // ── HELPER : une page annuelle ──
  const annualPage = (y, idx, total) => {
    const ls = LEVEL_STYLES[y.level] || LEVEL_STYLES['6ème'];
    const radarSvg = svgRadar(Object.fromEntries(Object.entries(y.categoryData).map(([k, v]) => [k, v.score || 0])), 180);
    const scoreInfo = getScoreLabel(y.globalScore || 0);
    const pctInfo = getPercentileLabel(y.globalScore || 0);
    const participation = Math.round((y.reliability || 0) * 100);

    // Tri des catégories par score
    const catsSorted = Object.entries(y.categoryData)
      .filter(([, v]) => v.score !== null)
      .sort((a, b) => (b[1].score || 0) - (a[1].score || 0));
    const bestCats = catsSorted.slice(0, 2);
    const worstCats = catsSorted.slice(-2).reverse();

    const pageBreak = idx > 0 ? '<div class="page-break"></div>' : '';

    return `
    ${pageBreak}
    <!-- PAGE ANNUELLE : ${y.level} ${y.schoolYear} -->

    <div class="doc-header avoid-break">
      <div>
        <h1>Bilan de Condition Physique</h1>
        <div class="school">${collegeName || 'Collège'} · ${genderLabel} · Année ${y.schoolYear}</div>
      </div>
      <div style="text-align:center; color:white;">
        <div style="font-size:22px; font-weight:900;">${y.firstName} ${y.lastName}</div>
        <div style="font-size:12px; font-weight:bold; opacity:0.9; margin-top:2px; background:rgba(255,255,255,0.2); border-radius:20px; padding:2px 10px; display:inline-block;">
          ${y.level} ${y.className ? y.level.charAt(0) + y.className : ''}
        </div>
      </div>
      <div class="date">Document généré le<br>${dateNow}<br><br>${total > 1 ? `Année ${idx + 1}/${total}` : ''}</div>
    </div>

    <!-- Score global + Radar -->
    <div class="avoid-break" style="display:flex; gap:14px; margin-bottom:12px; align-items:flex-start;">

      <!-- Score global -->
      <div class="card" style="min-width:160px; text-align:center; padding:14px;">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">Score Global</div>
        <div style="font-size:52px; font-weight:900; color:${scoreInfo.color}; line-height:1;">${y.globalScore ?? '—'}</div>
        <div style="font-size:11px; color:${scoreInfo.color}; margin:2px 0;">/100</div>
        <div style="display:inline-block; background:${scoreInfo.color}20; color:${scoreInfo.color}; border-radius:20px; padding:3px 10px; font-size:9px; font-weight:bold; margin:4px 0;">${scoreInfo.text}</div>
        <div style="font-size:8.5px; color:#6b7280; margin-top:6px; line-height:1.4;">
          Votre enfant se situe<br><strong>${pctInfo.rank}</strong><br>de sa cohorte (${y.gender === 'M' ? 'garçons' : 'filles'} de ${y.level})
        </div>
        <div style="margin-top:8px; font-size:8px; color:#9ca3af;">
          Participation : <strong>${participation}%</strong> des tests (${y.testsCompleted}/${y.totalTests})
        </div>
      </div>

      <!-- Radar -->
      <div class="card" style="flex:1; display:flex; flex-direction:column; align-items:center; padding:10px;">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Profil par Qualité Physique</div>
        ${radarSvg}
        <div style="font-size:8px; color:#9ca3af; text-align:center; margin-top:4px;">Plus le polygone est grand, meilleur est le profil</div>
      </div>

      <!-- Synthèse catégories -->
      <div class="card" style="min-width:200px;">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Synthèse</div>
        ${Object.entries(y.categoryData).map(([k, v]) => {
          const meta = CATEGORIES[k];
          const score = v.score;
          const sl = score !== null ? getScoreLabel(score) : { color: '#d1d5db', text: '—' };
          return `<div class="cat-row">
            <div class="cat-dot" style="background:${meta.color}"></div>
            <div class="cat-name">${meta.icon} ${meta.name}</div>
            <div class="cat-bar-bg"><div class="cat-bar-fill" style="width:${score || 0}%; background:${meta.color}"></div></div>
            <div class="cat-score" style="color:${sl.color}">${score ?? '—'}</div>
          </div>`;
        }).join('')}
      </div>
    </div>

    <!-- Points forts & axes de progrès -->
    <div class="avoid-break" style="display:flex; gap:10px; margin-bottom:12px;">
      <div class="highlight-box highlight-green" style="flex:1;">
        <div style="font-weight:bold; color:#15803d; font-size:10px; margin-bottom:5px;">✅ Points forts</div>
        ${bestCats.map(([k, v]) => `<div style="font-size:9px; margin-bottom:3px; color:#166534;">
          ${CATEGORIES[k].icon} <strong>${CATEGORIES[k].name}</strong> — ${v.score}/100 · ${getScoreLabel(v.score).text}
        </div>`).join('')}
      </div>
      <div class="highlight-box highlight-red" style="flex:1;">
        <div style="font-weight:bold; color:#dc2626; font-size:10px; margin-bottom:5px;">📌 À travailler en priorité</div>
        ${worstCats.map(([k, v]) => `<div style="font-size:9px; margin-bottom:3px; color:#991b1b;">
          ${CATEGORIES[k].icon} <strong>${CATEGORIES[k].name}</strong> — ${v.score}/100 · ${getScoreLabel(v.score).text}
        </div>`).join('')}
      </div>
    </div>

    <!-- Détail par catégorie -->
    <div class="section avoid-break">
      <div class="section-title">Détail des Tests — Position dans la Cohorte</div>
      <div style="display:flex; gap:6px; margin-bottom:4px; font-size:8px; color:#9ca3af; padding: 0 0 0 148px;">
        <span style="width:60px; text-align:center">Résultat</span>
        <span style="width:55px; text-align:center">Moy. cohorte</span>
        <span style="flex:1; text-align:center">Position dans la cohorte</span>
        <span style="width:32px; text-align:right">Score</span>
      </div>
      <!-- Repères sur barre -->
      <div style="display:flex; gap:6px; margin-bottom:2px; padding: 0 0 0 265px; flex:1; position:relative;">
        <div style="flex:1; position:relative; height:6px;">
          <span style="position:absolute; left:25%; font-size:7px; color:#d1d5db; transform:translateX(-50%);">P25</span>
          <span style="position:absolute; left:50%; font-size:7px; color:#d1d5db; transform:translateX(-50%);">P50</span>
          <span style="position:absolute; left:75%; font-size:7px; color:#d1d5db; transform:translateX(-50%);">P75</span>
        </div>
      </div>

      ${Object.entries(y.categoryData).map(([catKey, catData]) => {
        const meta = CATEGORIES[catKey];
        if (catData.details.length === 0) return '';
        return `<div style="margin-bottom:8px; avoid-break:inside;">
          <div style="font-size:9px; font-weight:bold; color:${meta.color}; background:${meta.color}10; padding:3px 8px; border-radius:4px; margin-bottom:4px;">
            ${meta.icon} ${meta.name} — Score : ${catData.score ?? '—'}/100
          </div>
          ${catData.details.map(d => {
            const sl = getScoreLabel(d.score);
            const fillPct = Math.min(100, Math.max(0, d.percentilePos));
            return `<div class="test-row">
              <div class="test-name">${d.name}</div>
              <div class="test-val">${d.value} <span style="font-size:7px;color:#9ca3af;">${d.unit}</span></div>
              <div class="test-avg">${d.avgValue} ${d.unit}</div>
              <div class="pct-bar-bg">
                <div class="pct-bar-fill" style="width:${fillPct}%; background:${sl.color}"></div>
                <div class="pct-marker" style="left:25%"></div>
                <div class="pct-marker" style="left:50%"></div>
                <div class="pct-marker" style="left:75%"></div>
              </div>
              <div class="test-score" style="color:${sl.color}">${d.score}</div>
            </div>`;
          }).join('')}
        </div>`;
      }).join('')}
    </div>

    <!-- OMS + recommandations -->
    <div class="avoid-break">
      <div class="oms-box" style="margin-bottom:8px;">
        <div class="oms-title">📋 Recommandations OMS (Organisation Mondiale de la Santé)</div>
        <p>Les jeunes de 10 à 18 ans devraient pratiquer au moins <strong>60 minutes d'activité physique modérée à intense par jour</strong>. Des activités de renforcement musculaire sont recommandées au moins 3 fois par semaine.</p>
        ${y.globalScore >= 70
          ? `<p style="margin-top:4px; color:#15803d;"><strong>✅ ${y.firstName} présente un bon niveau de condition physique, cohérent avec une pratique régulière.</strong></p>`
          : `<p style="margin-top:4px; color:#dc2626;"><strong>⚠️ Des progrès sont possibles. Encouragez une activité physique quotidienne de 60 min.</strong></p>`
        }
      </div>

      <div class="doc-footer">
        <span>${collegeName || 'Collège'} · Bilan EPS ${y.schoolYear} · ${y.firstName} ${y.lastName}</span>
        <span>Document confidentiel — à destination des familles</span>
        <span>Score calculé sur ${y.testsCompleted} test${y.testsCompleted > 1 ? 's' : ''} · Cohorte ${y.level} ${y.gender === 'M' ? 'garçons' : 'filles'}</span>
      </div>
    </div>
    `;
  };

  // ── PAGE RÉCAP FINALE (bilan 4 ans) ──
  const finalPage = (yearsData) => {
    const first = yearsData[0];
    const last = yearsData[yearsData.length - 1];
    const deltaGlobal = last.globalScore !== null && first.globalScore !== null
      ? last.globalScore - first.globalScore : null;

    const radarMulti = svgRadarMulti(yearsData, 200);
    const lineChart = svgLineChart(yearsData, 340, 120);
    const barChart = svgBarCategory(yearsData, 340, 120);

    // Catégorie la plus progressée et la plus en baisse
    const catDeltas = Object.keys(CATEGORIES).map(k => {
      const scores = yearsData.map(y => y.categoryData[k]?.score).filter(s => s !== null);
      if (scores.length < 2) return null;
      return { cat: k, delta: scores[scores.length - 1] - scores[0] };
    }).filter(Boolean).sort((a, b) => b.delta - a.delta);
    const bestProgress = catDeltas[0];
    const worstProgress = catDeltas[catDeltas.length - 1];

    // Meilleure performance absolue
    const allTests = yearsData.flatMap(y => y.testDetails.map(t => ({ ...t, level: y.level, schoolYear: y.schoolYear })));
    const bestTests = [...allTests].sort((a, b) => b.score - a.score).slice(0, 3);

    return `
    <div class="page-break"></div>
    <!-- BILAN FINAL 4 ANS -->

    <div class="doc-header avoid-break" style="background:linear-gradient(135deg, #1e1b4b, #4f46e5);">
      <div>
        <h1 style="font-size:18px;">Bilan de Parcours — Collège Complet</h1>
        <div class="school">${collegeName || 'Collège'} · ${yearsData.map(y => y.schoolYear).join(' → ')}</div>
      </div>
      <div style="text-align:center; color:white;">
        <div style="font-size:22px; font-weight:900;">${first.firstName} ${first.lastName}</div>
        <div style="font-size:11px; opacity:0.8; margin-top:2px;">De la ${yearsData[0].level} à la ${last.level}</div>
      </div>
      <div class="date">Bilan de fin de collège<br>${dateNow}</div>
    </div>

    <!-- Scores annuels + courbe -->
    <div class="avoid-break" style="display:flex; gap:14px; margin-bottom:12px; align-items:flex-start;">

      <!-- Tableau scores annuels -->
      <div class="card" style="flex:1;">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; margin-bottom:8px;">Score Global par Année</div>
        <table class="evo-table">
          <tr>
            <th>Niveau</th>
            <th>Année</th>
            <th>Score</th>
            <th>Niveau</th>
            <th>Évolution</th>
            <th>Participation</th>
          </tr>
          ${yearsData.map((y, i) => {
            const sl = y.globalScore !== null ? getScoreLabel(y.globalScore) : { text: '—', color: '#9ca3af' };
            const prev = i > 0 ? yearsData[i - 1] : null;
            const delta = prev && prev.globalScore !== null && y.globalScore !== null ? y.globalScore - prev.globalScore : null;
            const ls = LEVEL_STYLES[y.level] || {};
            return `<tr>
              <td style="color:${ls.color}; font-weight:bold;">${y.level}</td>
              <td style="color:#6b7280;">${y.schoolYear}</td>
              <td style="font-size:14px; font-weight:900; color:${sl.color};">${y.globalScore ?? '—'}</td>
              <td><span style="background:${sl.color}20; color:${sl.color}; border-radius:10px; padding:2px 6px; font-size:8px; font-weight:bold;">${sl.text}</span></td>
              <td class="${delta === null ? '' : delta >= 0 ? 'delta-up' : 'delta-dn'}">${delta === null ? '—' : (delta >= 0 ? '▲ +' : '▼ ') + delta}</td>
              <td>${Math.round(y.reliability * 100)}% (${y.testsCompleted}/${y.totalTests})</td>
            </tr>`;
          }).join('')}
        </table>

        ${deltaGlobal !== null ? `
        <div style="margin-top:8px; padding:8px; background:${deltaGlobal >= 0 ? '#f0fdf4' : '#fef2f2'}; border-radius:6px; font-size:9px; text-align:center;">
          <strong style="color:${deltaGlobal >= 0 ? '#15803d' : '#dc2626'}; font-size:12px;">${deltaGlobal >= 0 ? '▲' : '▼'} ${Math.abs(deltaGlobal)} points</strong>
          de progression globale sur l'ensemble du collège
        </div>` : ''}
      </div>

      <!-- Courbe -->
      <div class="card" style="min-width:360px;">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; margin-bottom:6px;">Courbe d'Évolution du Score Global</div>
        ${lineChart}
      </div>
    </div>

    <!-- Radar multi + barres catégories -->
    <div class="avoid-break card-grid2" style="margin-bottom:12px; display:grid; gap:12px;">
      <div class="card">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; margin-bottom:6px;">Profil Physique — Superposition des Années</div>
        <div style="display:flex; justify-content:center;">${radarMulti}</div>
        <div style="font-size:8px; color:#9ca3af; text-align:center; margin-top:4px;">Trait plein = dernière année · Pointillés = années précédentes</div>
      </div>
      <div class="card">
        <div style="font-size:9px; font-weight:bold; color:#6b7280; text-transform:uppercase; margin-bottom:6px;">Évolution par Catégorie</div>
        ${barChart}
        <div style="display:flex; gap:8px; justify-content:center; margin-top:6px; flex-wrap:wrap;">
          ${yearsData.map(y => `<span style="font-size:8px; color:${LEVEL_STYLES[y.level]?.color}; font-weight:bold;">■ ${y.level}</span>`).join(' ')}
        </div>
        <!-- Tableau évolution catégories -->
        <table class="evo-table" style="margin-top:10px; font-size:8px;">
          <tr>
            <th style="text-align:left;">Catégorie</th>
            ${yearsData.map(y => `<th style="color:${LEVEL_STYLES[y.level]?.color}">${y.level}</th>`).join('')}
            <th>Évolution</th>
          </tr>
          ${Object.entries(CATEGORIES).map(([k, meta]) => {
            const scores = yearsData.map(y => y.categoryData[k]?.score ?? null);
            const first = scores.find(s => s !== null);
            const last2 = [...scores].reverse().find(s => s !== null);
            const delta = first !== null && last2 !== null ? last2 - first : null;
            return `<tr>
              <td style="text-align:left; color:${meta.color}; font-weight:bold;">${meta.icon} ${meta.name}</td>
              ${scores.map(s => `<td>${s ?? '—'}</td>`).join('')}
              <td class="${delta === null ? 'delta-eq' : delta >= 0 ? 'delta-up' : 'delta-dn'}">${delta === null ? '—' : (delta >= 0 ? '▲ +' : '▼ ') + delta}</td>
            </tr>`;
          }).join('')}
        </table>
      </div>
    </div>

    <!-- Faits marquants + meilleures perfs -->
    <div class="avoid-break" style="display:flex; gap:10px; margin-bottom:12px;">
      <div style="flex:1;">
        <div class="section-title">🏆 Faits Marquants du Parcours</div>

        ${bestProgress ? `<div class="highlight-box highlight-green" style="margin-bottom:8px;">
          <div style="font-weight:bold; color:#15803d; font-size:9.5px;">📈 Catégorie la plus progressée</div>
          <div style="font-size:9px; margin-top:3px; color:#166534;">
            ${CATEGORIES[bestProgress.cat].icon} <strong>${CATEGORIES[bestProgress.cat].name}</strong>
            — Progression de <strong>+${bestProgress.delta} points</strong> sur le collège
          </div>
        </div>` : ''}

        ${worstProgress && worstProgress.delta < 0 ? `<div class="highlight-box highlight-red" style="margin-bottom:8px;">
          <div style="font-weight:bold; color:#dc2626; font-size:9.5px;">📉 Point de vigilance</div>
          <div style="font-size:9px; margin-top:3px; color:#991b1b;">
            ${CATEGORIES[worstProgress.cat].icon} <strong>${CATEGORIES[worstProgress.cat].name}</strong>
            — Recul de <strong>${worstProgress.delta} points</strong> — à travailler en priorité
          </div>
        </div>` : ''}

        <div class="highlight-box highlight-blue">
          <div style="font-weight:bold; color:#1d4ed8; font-size:9.5px;">⭐ Meilleures performances sur 4 ans</div>
          ${bestTests.map(t => `<div style="font-size:8.5px; margin-top:3px; color:#1e40af;">
            ${CATEGORIES[t.category]?.icon || ''} <strong>${t.name}</strong> — ${t.value} ${t.unit}
            (${t.level} · ${t.schoolYear}) — Score : ${t.score}/100
          </div>`).join('')}
        </div>
      </div>

      <div style="min-width:200px;">
        <div class="section-title">✅ Recommandations Finales</div>
        <div class="advice-box">
          <div class="advice-title">Activité physique quotidienne</div>
          <p>Les recommandations OMS préconisent 60 minutes d'activité modérée à intense par jour pour les 10-18 ans. ${first.firstName} devrait ${last.globalScore >= 70 ? 'maintenir sa pratique actuelle' : 'augmenter progressivement sa pratique quotidienne'}.</p>
        </div>
        ${bestProgress ? `<div class="advice-box" style="margin-top:6px; background:#f0fdf4; border-color:#86efac;">
          <div class="advice-title" style="color:#15803d;">Capitaliser sur les points forts</div>
          <p>La ${CATEGORIES[bestProgress.cat].name.toLowerCase()} est le point fort de ${first.firstName}. Encouragez des activités qui développent cette qualité (${bestProgress.cat === 'ENDURANCE' ? 'course, natation, vélo' : bestProgress.cat === 'FORCE' ? 'gym, escalade, sports collectifs' : bestProgress.cat === 'VITESSE' ? 'sprint, sports de raquette' : bestProgress.cat === 'SOUPLESSE' ? 'yoga, danse, natation' : bestProgress.cat === 'COORDINATION' ? 'danse, arts martiaux, sport co' : 'équitation, yoga, surf'}).`}</p>
        </div>` : ''}
        ${worstProgress && worstProgress.delta < 0 ? `<div class="advice-box" style="margin-top:6px; background:#fef2f2; border-color:#fca5a5;">
          <div class="advice-title" style="color:#dc2626;">Axes de progrès</div>
          <p>La ${CATEGORIES[worstProgress.cat].name.toLowerCase()} nécessite une attention particulière. Des exercices simples au quotidien permettront de progresser.</p>
        </div>` : ''}
      </div>
    </div>

    <div class="doc-footer avoid-break">
      <span>${collegeName || 'Collège'} · Bilan de fin de collège · ${first.firstName} ${first.lastName}</span>
      <span>Document confidentiel — à destination des familles</span>
      <span>Généré le ${dateNow}</span>
    </div>
    `;
  };

  // ── Assemblage final ──
  let body = '';
  if (reportType === 'annual') {
    body = annualPage(currentYear, 0, 1);
  } else {
    // Bilan final : page récap d'abord, puis une page annuelle par année
    body = finalPage(yearsData);
    yearsData.forEach((y, i) => {
      body += annualPage(y, i + 1, yearsData.length);
    });
  }

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan EPS — ${student.firstName} ${student.lastName}</title>
  <style>${cssGlobal}</style>
</head>
<body>
${body}
</body>
</html>`;
};

// ─── Composant React ───────────────────────────────────────────────────────────

const ParentReportGenerator = ({ student, currentSchoolYear, collegeName }) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [showMenu, setShowMenu] = useState(false);

  const generate = async (reportType) => {
    setShowMenu(false);
    setLoading(true);
    try {
      // Charger tous les enregistrements (pour bilan final) ou juste l'année courante
      let records;
      if (reportType === 'final') {
        const { data } = await supabase
          .from('students')
          .select('id, first_name, last_name, gender, school_year, class_id, classes(name, level)')
          .eq('permanent_id', student.permanent_id)
          .order('school_year', { ascending: true });
        records = data || [];
      } else {
        // Année courante uniquement
        const { data } = await supabase
          .from('students')
          .select('id, first_name, last_name, gender, school_year, class_id, classes(name, level)')
          .eq('id', student.id);
        records = data || [];
      }

      if (!records.length) { alert('Aucune donnée trouvée.'); return; }

      const yearsData = [];
      for (const rec of records) {
        setProgress(`Calcul ${rec.classes?.level} (${rec.school_year})...`);
        const yearData = await computeYearData(rec, setProgress);
        yearsData.push(yearData);
      }

      setProgress('Génération du document...');
      const html = generateHTML(yearsData, reportType, collegeName);

      const win = window.open('', '_blank');
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.onload = () => setTimeout(() => win.print(), 600);

    } catch (err) {
      console.error('Erreur génération bilan:', err);
      alert('Erreur : ' + err.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => !loading && setShowMenu(m => !m)}
        disabled={loading}
        className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:bg-gray-400 transition-all shadow-md"
      >
        {loading ? (
          <>
            <Loader size={16} className="animate-spin" />
            <span>{progress || 'Génération...'}</span>
          </>
        ) : (
          <>
            <FileText size={16} />
            <span>Bilan Parents</span>
            <ChevronDown size={14} />
          </>
        )}
      </button>

      {showMenu && !loading && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[220px]">
          <button
            onClick={() => generate('annual')}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100"
          >
            <div className="font-semibold text-gray-800 text-sm">📄 Bilan Annuel</div>
            <div className="text-xs text-gray-500 mt-0.5">Résultats de l'année en cours</div>
          </button>
          <button
            onClick={() => generate('final')}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
          >
            <div className="font-semibold text-gray-800 text-sm">📚 Bilan de Fin de Collège</div>
            <div className="text-xs text-gray-500 mt-0.5">Évolution complète 6ème → 3ème</div>
          </button>
        </div>
      )}
    </div>
  );
};

export default ParentReportGenerator;
