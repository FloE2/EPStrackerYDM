// IndividualFitnessCard.jsx - VERSION INTÉGRÉE AVEC BILAN PARENTS
import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  Target, 
  GitBranch, 
  Users, 
  Zap, 
  Clock,
  Star,
  TrendingUp,
  Heart,
  Award,
  ChevronRight,
  Info,
  User,
  Search,
  Calendar,
  BookOpen,
  Home,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Minimize2,
  ChevronLeft,
  Download,
  ArrowLeft,
  FileText,
  Loader,
  ChevronDown
} from 'lucide-react';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  Tooltip
} from "recharts";

import { supabase } from './lib/supabase.js';
import { useSchoolYear } from './contexts/SchoolYearContext.jsx';
import StudentEvolutionPanel from './StudentEvolutionPanel.jsx';
import EnergyAvatar from './EnergyAvatar.jsx';


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
  const pad = 32; // padding for labels
  const total = size + pad * 2;
  const cx = total / 2, cy = total / 2, r = size * 0.38;
  const keys = Object.keys(CATEGORIES);
  const n = keys.length;
  const pts = keys.map((k, i) => {
    const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
    const val = (scores[k] || 0) / 100;
    return { x: cx + Math.cos(angle) * r * val, y: cy + Math.sin(angle) * r * val };
  });

  const polyPts = pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

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
    const lx = cx + Math.cos(angle) * (r + 20);
    const ly = cy + Math.sin(angle) * (r + 20);
    const meta = CATEGORIES[k];
    return `<text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="middle" font-size="9" font-weight="bold" fill="${meta.color}">${meta.icon} ${meta.name.slice(0, 4)}</text>`;
  }).join('');

  return `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">
    ${rings}${gridLines}
    <polygon points="${polyPts}" fill="#6366f1" fill-opacity="0.25" stroke="#6366f1" stroke-width="2"/>
    ${labels}
  </svg>`;
};

const svgRadarMulti = (yearsData, size = 220) => {
  const pad = 30;
  const total = size + pad * 2;
  const cx = total / 2, cy = total / 2, r = size * 0.36;
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

  return `<svg width="${total}" height="${total}" viewBox="0 0 ${total} ${total}" xmlns="http://www.w3.org/2000/svg">
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
          <p>La ${CATEGORIES[bestProgress.cat].name.toLowerCase()} est le point fort de ${first.firstName}. Encouragez des activités qui développent cette qualité.</p>
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

  // Bouton flottant minimal : déclenche l'impression NATIVE du navigateur,
  // uniquement au clic (jamais automatiquement). C'est le moteur d'impression
  // du navigateur lui-même qui respecte @page, les marges et les sauts de
  // page définis dans cssGlobal - contrairement à une capture d'écran, il
  // produit une mise en page fidèle à 100%, sans bibliothèque externe.
  // Dans la boîte de dialogue, il suffit de choisir "Enregistrer au format
  // PDF" comme destination.
  const downloadWidget = `
<button id="pdf-dl-btn" class="no-print" title="Télécharger en PDF (imprimer → Enregistrer au format PDF)" onclick="window.print()" style="position:fixed;top:16px;right:16px;z-index:9999;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#059669;color:white;border:none;border-radius:50%;cursor:pointer;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,0.25);">⬇</button>
<style>@media print { .no-print { display: none !important; } }</style>`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <title>Bilan EPS — ${student.firstName} ${student.lastName}</title>
  <style>${cssGlobal}</style>
</head>
<body>
${downloadWidget}
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
      // generateHTML intègre elle-même un bouton "Télécharger en PDF" flottant
      // dans le document ouvert : l'utilisateur consulte d'abord l'aperçu,
      // et choisit ensuite, ou non, de le télécharger - rien n'est automatique.
      const html = generateHTML(yearsData, reportType, collegeName);

      const win = window.open('', '_blank');
      win.document.open();
      win.document.write(html);
      win.document.close();

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
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-xl z-50 overflow-hidden min-w-[240px]">
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

const IndividualFitnessCard = () => {
  const { selectedSchoolYear, currentSchoolYear } = useSchoolYear();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [studentResults, setStudentResults] = useState(null);
  const [studentsCount, setStudentsCount] = useState({});
  
  // États pour le chargement dynamique
  const [allTests, setAllTests] = useState([]);
  const [categories, setCategories] = useState({});
  const [testsLoading, setTestsLoading] = useState(true);
  
  // État pour les statistiques du graphique radar
  const [radarStatistics, setRadarStatistics] = useState(null);
  const [showEvolution, setShowEvolution] = useState(false);

  // ============================================================================
  // SYSTÈME DE NOTATION DYNAMIQUE DÉTERMINISTE
  // ============================================================================

  const calculatePercentiles = (values) => {
    const sorted = values.sort((a, b) => a - b);
    const n = sorted.length;
    
    return {
      p10: sorted[Math.floor(n * 0.10)],
      p25: sorted[Math.floor(n * 0.25)], 
      p50: sorted[Math.floor(n * 0.50)],
      p75: sorted[Math.floor(n * 0.75)],
      p90: sorted[Math.floor(n * 0.90)]
    };
  };

  const getTestDirection = (testName) => {
    const timeBasedTests = ['SPRINTS 10 x 5', '30 mètres','FLAMINGO'];
    const speedBasedTests = ['36"-24"', 'VITESSE'];
    const higherIsBetterTests = [
      'COOPER', 'DEMI-COOPER', 'NAVETTE', 'RECTANGLE MAGIQUE', 
      'SAUT', 'LANCER', 'CHAISE', 'PLANCHE', 'SUSPENSION', 'POIGNÉE',
      'FOULÉES', 'TRIPLE SAUT', 'MONOPODAL', 'SOUPLESSE'
    ];

    if (timeBasedTests.some(test => testName.includes(test))) return false;
    if (speedBasedTests.some(test => testName.includes(test))) return true;
    if (higherIsBetterTests.some(test => testName.includes(test))) return true;
    
    return true;
  };

  const getTestData = async (testName, studentLevel, studentGender) => {
    try {
      const { data: results, error } = await supabase
        .from('results')
        .select(`
          value,
          tests!inner(name),
          students!inner(gender, school_year, classes!inner(level))
        `)
        .eq('tests.name', testName)
        .eq('students.gender', studentGender)
        .eq('students.classes.level', studentLevel)
        .eq('students.school_year', selectedSchoolYear)
        .not('value', 'is', null);

      if (error) {
        console.error('Erreur Supabase:', error);
        return null;
      }

      if (!results || results.length < 5) {
        return {
          sampleSize: results?.length || 0,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      // Filtrer les valeurs "DISP" et "dispensé" avant l'analyse
      const values = results
        .map(r => r.value)
        .filter(v => v !== 'DISP' && v !== 'dispensé')
        .map(v => parseFloat(v))
        .filter(v => !isNaN(v));
      
      if (values.length < 5) {
        return {
          sampleSize: values.length,
          insufficientData: true,
          message: "Échantillon trop faible pour proposer une note"
        };
      }

      const percentiles = calculatePercentiles(values);
      const higherIsBetter = getTestDirection(testName);
      const bestPerformance = higherIsBetter 
        ? Math.max(...values) 
        : Math.min(...values);
      
      return {
        sampleSize: values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        moyenne: values.reduce((a, b) => a + b, 0) / values.length,
        percentiles,
        bestPerformance,
        higherIsBetter,
        insufficientData: false,
        allValues: values
      };

    } catch (error) {
      console.error('Erreur lors de la récupération des données:', error);
      return null;
    }
  };

  const calculateDeterministicScore = (value, percentiles, higherIsBetter, min, max) => {
    const numericValue = parseFloat(value);
    
    if (higherIsBetter) {
      if (numericValue >= percentiles.p90) {
        const range = max - percentiles.p90;
        if (range === 0) return 100;
        const position = (numericValue - percentiles.p90) / range;
        return Math.round(85 + position * 15);
      } else if (numericValue >= percentiles.p75) {
        const range = percentiles.p90 - percentiles.p75;
        if (range === 0) return 77;
        const position = (numericValue - percentiles.p75) / range;
        return Math.round(70 + position * 14);
      } else if (numericValue >= percentiles.p50) {
        const range = percentiles.p75 - percentiles.p50;
        if (range === 0) return 62;
        const position = (numericValue - percentiles.p50) / range;
        return Math.round(55 + position * 14);
      } else if (numericValue >= percentiles.p25) {
        const range = percentiles.p50 - percentiles.p25;
        if (range === 0) return 47;
        const position = (numericValue - percentiles.p25) / range;
        return Math.round(40 + position * 14);
      } else {
        const range = percentiles.p25 - min;
        if (range === 0) return 25;
        const position = Math.max(0, (numericValue - min) / range);
        return Math.round(10 + position * 29);
      }
    } else {
      if (numericValue <= percentiles.p10) {
        const range = percentiles.p10 - min;
        if (range === 0) return 100;
        const position = (percentiles.p10 - numericValue) / range;
        return Math.round(85 + position * 15);
      } else if (numericValue <= percentiles.p25) {
        const range = percentiles.p25 - percentiles.p10;
        if (range === 0) return 77;
        const position = (percentiles.p25 - numericValue) / range;
        return Math.round(70 + position * 14);
      } else if (numericValue <= percentiles.p50) {
        const range = percentiles.p50 - percentiles.p25;
        if (range === 0) return 62;
        const position = (percentiles.p50 - numericValue) / range;
        return Math.round(55 + position * 14);
      } else if (numericValue <= percentiles.p75) {
        const range = percentiles.p75 - percentiles.p50;
        if (range === 0) return 47;
        const position = (percentiles.p75 - numericValue) / range;
        return Math.round(40 + position * 14);
      } else {
        const range = max - percentiles.p75;
        if (range === 0) return 25;
        const position = Math.max(0, (max - numericValue) / range);
        return Math.round(10 + position * 29);
      }
    }
  };

  const getPercentilePosition = (value, percentiles, higherIsBetter) => {
    if (higherIsBetter) {
      if (value >= percentiles.p90) return "90e percentile et plus";
      if (value >= percentiles.p75) return "Entre 75e et 90e percentile";
      if (value >= percentiles.p50) return "Entre 50e et 75e percentile";
      if (value >= percentiles.p25) return "Entre 25e et 50e percentile";
      return "Moins de 25e percentile";
    } else {
      if (value <= percentiles.p10) return "10e percentile et moins";
      if (value <= percentiles.p25) return "Entre 10e et 25e percentile";
      if (value <= percentiles.p50) return "Entre 25e et 50e percentile";
      if (value <= percentiles.p75) return "Entre 50e et 75e percentile";
      return "Plus de 75e percentile";
    }
  };

  const scoreTestWithDynamicBareme = async (value, testName, studentLevel, studentGender) => {
    const testData = await getTestData(testName, studentLevel, studentGender);
    
    if (!testData) {
      return {
        score: 50,
        message: "Données insuffisantes",
        method: "score_defaut"
      };
    }

    if (testData.insufficientData) {
      return {
        score: null,
        message: testData.message,
        method: "echantillon_insuffisant",
        sampleSize: testData.sampleSize
      };
    }

    const numericValue = parseFloat(value);
    if (isNaN(numericValue)) return { score: 0, message: "Valeur invalide", method: "erreur" };

    const { percentiles, higherIsBetter, bestPerformance, min, max } = testData;
    
    const score = calculateDeterministicScore(numericValue, percentiles, higherIsBetter, min, max);
    
    let level;
    if (score >= 85) level = "Excellent";
    else if (score >= 70) level = "Bon";
    else if (score >= 55) level = "Correct";
    else if (score >= 40) level = "Faible";
    else level = "Très faible";

    return {
      score,
      level,
      message: `Calculé sur ${testData.sampleSize} élèves`,
      method: "bareme_dynamique_deterministe",
      percentilePosition: getPercentilePosition(numericValue, percentiles, higherIsBetter),
      bestPerformance,
      testData
    };
  };

  // FONCTION CORRIGÉE : Calcul des scores de catégorie SANS les dispenses
  const calculateCategoryScoreWithDynamicBaremes = async (tests, studentLevel, studentGender) => {
    if (tests.length === 0) return { score: 0, details: [], hasInsufficientData: false };

    let totalScore = 0;
    let validTests = 0;
    let hasInsufficientData = false;
    const details = [];

    for (const test of tests) {
      // Vérifier si le test est dispensé
      const isDispensed = test.value === 'DISP' || test.value === 'dispensé';
      
      let result;
      if (isDispensed) {
        // Pour les dispensés, on crée un résultat spécial sans score
        result = {
          score: null,
          message: "Dispensé",
          method: "dispense"
        };
      } else {
        // Calcul normal pour les tests non-dispensés
        result = await scoreTestWithDynamicBareme(
          test.value, 
          test.name, 
          studentLevel, 
          studentGender
        );
      }
      
      details.push({
        testName: test.name,
        value: test.value,
        unit: test.unit,
        result
      });

      // On ne compte que les tests non-dispensés avec un score valide
      if (!isDispensed && result.score !== null && result.method !== "echantillon_insuffisant") {
        totalScore += result.score;
        validTests++;
      } else if (!isDispensed && result.method === "echantillon_insuffisant") {
        hasInsufficientData = true;
      }
    }

    return {
      score: validTests > 0 ? Math.round(totalScore / validTests) : 0,
      details,
      hasInsufficientData,
      validTests,
      totalTests: tests.length
    };
  };

  // FONCTION OPTIMISÉE : Calcul rapide des statistiques pour le graphique radar
  const calculateRadarStatistics = async (studentLevel, studentGender) => {
    try {
      const statistics = {};
      
      for (const [categoryKey, category] of Object.entries(categories)) {
        if (!category.tests || category.tests.length === 0) {
          statistics[categoryKey] = { average: 0, best: 0 };
          continue;
        }
        
        let avgSum = 0;
        let bestSum = 0;
        let validTests = 0;
        
        // Pour chaque test de la catégorie, utiliser les percentiles
        for (const test of category.tests) {
          const testData = await getTestData(test.name, studentLevel, studentGender);
          
          if (testData && !testData.insufficientData && testData.percentiles) {
            // Moyenne: score au percentile 50 (médiane)
            const avgScore = calculateDeterministicScore(
              testData.percentiles.p50,
              testData.percentiles,
              testData.higherIsBetter,
              testData.min,
              testData.max
            );
            
            // Meilleur: score au percentile 90
            const bestPercentile = testData.higherIsBetter ? testData.percentiles.p90 : testData.percentiles.p10;
            const bestScore = calculateDeterministicScore(
              bestPercentile,
              testData.percentiles,
              testData.higherIsBetter,
              testData.min,
              testData.max
            );
            
            avgSum += avgScore;
            bestSum += bestScore;
            validTests++;
          }
        }
        
        statistics[categoryKey] = {
          average: validTests > 0 ? Math.round(avgSum / validTests) : 0,
          best: validTests > 0 ? Math.round(bestSum / validTests) : 0
        };
      }
      
      return statistics;

    } catch (error) {
      console.error('Erreur calcul statistiques radar:', error);
      return null;
    }
  };

  // Configuration de base des catégories
  const baseCategoryConfig = {
    ENDURANCE: {
      name: "Endurance",
      shortName: "END",
      icon: Activity,
      color: "#3b82f6",
      bgColor: "from-blue-50 to-blue-100",
      borderColor: "border-blue-200"
    },
    FORCE: {
      name: "Force",
      shortName: "FOR",
      icon: Target,
      color: "#ef4444",
      bgColor: "from-red-50 to-red-100",
      borderColor: "border-red-200"
    },
    VITESSE: {
      name: "Vitesse",
      shortName: "VIT",
      icon: Zap,
      color: "#eab308",
      bgColor: "from-yellow-50 to-yellow-100",
      borderColor: "border-yellow-200"
    },
    COORDINATION: {
      name: "Coordination",
      shortName: "COO",
      icon: GitBranch,
      color: "#a855f7",
      bgColor: "from-purple-50 to-purple-100",
      borderColor: "border-purple-200"
    },
    EQUILIBRE: {
      name: "Équilibre",
      shortName: "EQU",
      icon: Users,
      color: "#6366f1",
      bgColor: "from-indigo-50 to-indigo-100",
      borderColor: "border-indigo-200"
    },
    SOUPLESSE: {
      name: "Souplesse",
      shortName: "SOU",
      icon: Minimize2,
      color: "#22c55e",
      bgColor: "from-green-50 to-green-100",
      borderColor: "border-green-200"
    }
  };

  // Composant Tooltip personnalisé pour le graphique radar
  const CustomRadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white border-2 border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-bold text-gray-800 mb-2 text-sm">
            {payload[0].payload.fullName}
          </p>
          {payload.map((entry, index) => (
            <div key={index} className="flex items-center justify-between space-x-3 text-xs">
              <span style={{ color: entry.stroke }} className="font-semibold">
                {entry.name}:
              </span>
              <span className="font-bold text-gray-900">
                {entry.value}/100
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  // Composant personnalisé pour afficher les icônes sur les axes du radar
  const CustomAxisTick = ({ payload, x, y }) => {
    const iconMap = {
      'ENDURANCE': Activity,
      'FORCE': Target,
      'VITESSE': Zap,
      'COORDINATION': GitBranch,
      'EQUILIBRE': Users,
      'SOUPLESSE': Minimize2
    };

    const colorMap = {
      'ENDURANCE': '#3b82f6',
      'FORCE': '#ef4444',
      'VITESSE': '#eab308',
      'COORDINATION': '#a855f7',
      'EQUILIBRE': '#6366f1',
      'SOUPLESSE': '#22c55e'
    };

    const IconComponent = iconMap[payload.value];
    const color = colorMap[payload.value];

    if (!IconComponent) return null;

    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-12} y={-12} width={24} height={24}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            backgroundColor: color,
            borderRadius: '6px',
            padding: '3px'
          }}>
            <IconComponent size={16} color="white" strokeWidth={2.5} />
          </div>
        </foreignObject>
      </g>
    );
  };

  // Composant Graphique Radar
  const CategoryRadarChart = ({ studentScores, statistics }) => {
    if (!studentScores || !statistics) {
      return (
        <div className="flex items-center justify-center w-80 h-40 bg-gray-50 rounded-lg border-2 border-gray-200">
          <div className="text-center">
            <RefreshCw className="animate-spin mx-auto text-gray-400 mb-2" size={24} />
            <p className="text-xs text-gray-600 font-medium">Calcul des statistiques...</p>
          </div>
        </div>
      );
    }

    const categoryNames = {
      ENDURANCE: 'Endurance',
      FORCE: 'Force',
      VITESSE: 'Vitesse',
      COORDINATION: 'Coordination',
      EQUILIBRE: 'Équilibre',
      SOUPLESSE: 'Souplesse'
    };

    const data = [
      {
        category: 'ENDURANCE',
        fullName: categoryNames.ENDURANCE,
        Élève: studentScores.ENDURANCE || 0,
        Moyenne: statistics.ENDURANCE?.average || 0,
        Meilleur: statistics.ENDURANCE?.best || 0,
      },
      {
        category: 'FORCE',
        fullName: categoryNames.FORCE,
        Élève: studentScores.FORCE || 0,
        Moyenne: statistics.FORCE?.average || 0,
        Meilleur: statistics.FORCE?.best || 0,
      },
      {
        category: 'VITESSE',
        fullName: categoryNames.VITESSE,
        Élève: studentScores.VITESSE || 0,
        Moyenne: statistics.VITESSE?.average || 0,
        Meilleur: statistics.VITESSE?.best || 0,
      },
      {
        category: 'COORDINATION',
        fullName: categoryNames.COORDINATION,
        Élève: studentScores.COORDINATION || 0,
        Moyenne: statistics.COORDINATION?.average || 0,
        Meilleur: statistics.COORDINATION?.best || 0,
      },
      {
        category: 'EQUILIBRE',
        fullName: categoryNames.EQUILIBRE,
        Élève: studentScores.EQUILIBRE || 0,
        Moyenne: statistics.EQUILIBRE?.average || 0,
        Meilleur: statistics.EQUILIBRE?.best || 0,
      },
      {
        category: 'SOUPLESSE',
        fullName: categoryNames.SOUPLESSE,
        Élève: studentScores.SOUPLESSE || 0,
        Moyenne: statistics.SOUPLESSE?.average || 0,
        Meilleur: statistics.SOUPLESSE?.best || 0,
      },
    ];

    return (
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-xl p-2 border-2 border-purple-200 shadow-md">
        <ResponsiveContainer width={320} height={160}>
          <RadarChart data={data}>
            <PolarGrid stroke="#d1d5db" strokeWidth={1} />
            <PolarAngleAxis 
              dataKey="category" 
              tick={<CustomAxisTick />}
            />
            <PolarRadiusAxis 
              angle={90} 
              domain={[0, 100]} 
              tick={{ fill: '#9ca3af', fontSize: 9 }}
              tickCount={6}
            />
            <Radar 
              name="Élève" 
              dataKey="Élève" 
              stroke="#8b5cf6" 
              fill="#8b5cf6" 
              fillOpacity={0.35}
              strokeWidth={2}
            />
            <Radar 
              name="Moyenne classe" 
              dataKey="Moyenne" 
              stroke="#3b82f6" 
              fill="#3b82f6" 
              fillOpacity={0.15}
              strokeWidth={1.5}
              strokeDasharray="5 5"
            />
            <Radar 
              name="Meilleur" 
              dataKey="Meilleur" 
              stroke="#22c55e" 
              fill="#22c55e" 
              fillOpacity={0.1}
              strokeWidth={1.5}
              strokeDasharray="3 3"
            />
            <Tooltip content={<CustomRadarTooltip />} />
          </RadarChart>
        </ResponsiveContainer>
        
        {/* Légende manuelle en bas */}
        <div className="flex justify-center space-x-3 text-xs mt-1 pb-1">
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-2.5 rounded-full bg-purple-600"></div>
            <span className="text-gray-700 font-medium">Élève</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-0.5 bg-blue-500"></div>
            <span className="text-gray-700 font-medium">Moyenne</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="w-2.5 h-0.5 bg-green-500"></div>
            <span className="text-gray-700 font-medium">Meilleur</span>
          </div>
        </div>
      </div>
    );
  };

  const loadAllTests = async () => {
    try {
      setTestsLoading(true);

      const { data: testsData, error } = await supabase
        .from('tests')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;

      setAllTests(testsData || []);

      const dynamicCategories = {};
      
      Object.keys(baseCategoryConfig).forEach(categoryKey => {
        dynamicCategories[categoryKey] = {
          ...baseCategoryConfig[categoryKey],
          tests: []
        };
      });

      testsData?.forEach(test => {
        if (dynamicCategories[test.category]) {
          dynamicCategories[test.category].tests.push({
            id: test.id,
            name: test.name,
            shortName: test.name.length > 15 ? test.name.substring(0, 12) + '...' : test.name,
            unit: test.unit || ''
          });
        }
      });

      setCategories(dynamicCategories);

    } catch (err) {
      console.error('Erreur lors du chargement des tests:', err);
      setError(`Erreur lors du chargement des tests: ${err.message}`);
    } finally {
      setTestsLoading(false);
    }
  };

  const getLevelColors = (level) => {
    const colors = {
      '6ème': { 
        primary: 'bg-blue-500', 
        light: 'bg-blue-50', 
        border: 'border-blue-200', 
        text: 'text-blue-700',
        gradient: 'from-blue-500 to-blue-600',
        accent: 'bg-blue-600',
        hover: 'hover:bg-blue-100'
      },
      '5ème': { 
        primary: 'bg-emerald-500', 
        light: 'bg-emerald-50', 
        border: 'border-emerald-200', 
        text: 'text-emerald-700',
        gradient: 'from-emerald-500 to-emerald-600',
        accent: 'bg-emerald-600',
        hover: 'hover:bg-emerald-100'
      },
      '4ème': { 
        primary: 'bg-orange-500', 
        light: 'bg-orange-50', 
        border: 'border-orange-200', 
        text: 'text-orange-700',
        gradient: 'from-orange-500 to-orange-600',
        accent: 'bg-orange-600',
        hover: 'hover:bg-orange-100'
      },
      '3ème': { 
        primary: 'bg-purple-500', 
        light: 'bg-purple-50', 
        border: 'border-purple-200', 
        text: 'text-purple-700',
        gradient: 'from-purple-500 to-purple-600',
        accent: 'bg-purple-600',
        hover: 'hover:bg-purple-100'
      }
    };
    return colors[level] || colors['6ème'];
  };

  const getEvaluationColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 55) return "#eab308";
    return "#ef4444";
  };

  const getScoreLevel = (score) => {
    if (score >= 85) return "Excellent";
    if (score >= 70) return "Bon";
    if (score >= 55) return "Correct";
    return "À améliorer";
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "#22c55e";
    if (score >= 70) return "#3b82f6";
    if (score >= 55) return "#eab308";
    return "#ef4444";
  };

  const getCategoryAdvice = (category, score, testsCompleted, totalTests, hasEnoughData = true) => {
    const completionRate = totalTests > 0 ? (testsCompleted / totalTests) * 100 : 0;

    if (testsCompleted > 0 && !hasEnoughData) {
      return "Les résultats ont bien été enregistrés, mais pas encore assez d'élèves du même niveau ont passé ces tests cette année pour calculer un score comparatif fiable. Le score apparaîtra automatiquement dès que davantage de résultats seront saisis dans l'établissement.";
    }
    
    const adviceMap = {
      ENDURANCE: {
        excellent: "Excellent niveau d'endurance ! Continue la pratique d'activités cardio (course, vélo, natation) 3-4 fois par semaine.",
        bon: "Bonne endurance ! Augmente progressivement la durée de tes activités cardio pour atteindre l'excellence.",
        correct: "Endurance correcte. Pratique régulièrement des activités d'endurance (marche rapide, jogging léger) 2-3 fois par semaine.",
        faible: "Travaille ton endurance avec des activités progressives : marche, montée d'escaliers, puis course légère."
      },
      FORCE: {
        excellent: "Force remarquable ! Maintiens ton niveau avec des exercices variés (pompes, tractions, gainage).",
        bon: "Bonne force musculaire ! Ajoute quelques exercices de renforcement pour progresser davantage.",
        correct: "Force correcte. Intègre des exercices simples : pompes sur genoux, gainage, squats au poids du corps.",
        faible: "Développe ta force avec des exercices adaptés : gainage facile, pompes inclinées, étirements actifs."
      },
      VITESSE: {
        excellent: "Vitesse exceptionnelle ! Continue les exercices de réactivité et les sprints courts.",
        bon: "Bonne vitesse ! Travaille la coordination avec des exercices d'agilité et de réactivité.",
        correct: "Vitesse correcte. Améliore-toi avec des petites accélérations et des exercices de coordination.",
        faible: "Développe ta vitesse avec des exercices de coordination simples et des déplacements variés."
      },
      COORDINATION: {
        excellent: "Coordination parfaite ! Continue avec des activités techniques variées (jonglage, danse, sports de raquette).",
        bon: "Bonne coordination ! Essaie de nouveaux mouvements complexes pour progresser encore.",
        correct: "Coordination correcte. Pratique des exercices d'équilibre dynamique et de précision.",
        faible: "Améliore ta coordination avec des exercices simples : marche sur ligne, lancer/rattraper, équilibres."
      },
      EQUILIBRE: {
        excellent: "Équilibre remarquable ! Maintiens ce niveau avec des défis d'équilibre plus complexes.",
        bon: "Bon équilibre ! Ajoute des variantes : yeux fermés, surfaces instables, mouvements combinés.",
        correct: "Équilibre correct. Pratique régulièrement des positions d'équilibre statique puis dynamique.",
        faible: "Travaille ton équilibre avec des exercices simples : tenir sur un pied, marcher sur une ligne."
      },
      SOUPLESSE: {
        excellent: "Souplesse exceptionnelle ! Continue les étirements quotidiens pour maintenir cette mobilité.",
        bon: "Bonne souplesse ! Étire-toi régulièrement, surtout après l'effort physique.",
        correct: "Souplesse correcte. Intègre 10-15 minutes d'étirements doux dans ta routine quotidienne.",
        faible: "Améliore ta souplesse avec des étirements doux et progressifs, 5-10 minutes par jour."
      }
    };

    let level;
    if (score >= 85) level = 'excellent';
    else if (score >= 70) level = 'bon';
    else if (score >= 55) level = 'correct';
    else level = 'faible';

    let advice = adviceMap[category]?.[level] || "Continue tes efforts dans cette catégorie !";
    
    if (completionRate < 50) {
      advice += " Complète d'abord tous les tests de cette catégorie pour un bilan plus précis.";
    }
    
    return advice;
  };

  const getCategoryAdviceShort = (category, score) => {
    const shortAdvice = {
      ENDURANCE: {
        excellent: "Continue cardio 3-4x/sem.",
        bon: "Augmente durée progressivement.",
        correct: "Jogging léger 2-3x/sem.",
        faible: "Marche, escaliers, course légère."
      },
      FORCE: {
        excellent: "Maintiens avec exercices variés.",
        bon: "Ajoute renforcement.",
        correct: "Pompes, gainage, squats.",
        faible: "Gainage facile, pompes inclinées."
      },
      VITESSE: {
        excellent: "Continue réactivité, sprints.",
        bon: "Travaille agilité.",
        correct: "Petites accélérations.",
        faible: "Coordination simple."
      },
      COORDINATION: {
        excellent: "Activités techniques variées.",
        bon: "Nouveaux mouvements complexes.",
        correct: "Équilibre dynamique.",
        faible: "Marche ligne, équilibres."
      },
      EQUILIBRE: {
        excellent: "Défis équilibre complexes.",
        bon: "Yeux fermés, surfaces instables.",
        correct: "Équilibre statique/dynamique.",
        faible: "Un pied, marche ligne."
      },
      SOUPLESSE: {
        excellent: "Étirements quotidiens.",
        bon: "Étirements après effort.",
        correct: "10-15 min étirements/jour.",
        faible: "Étirements doux 5-10 min."
      }
    };

    let level;
    if (score >= 85) level = 'excellent';
    else if (score >= 70) level = 'bon';
    else if (score >= 55) level = 'correct';
    else level = 'faible';

    return shortAdvice[category]?.[level] || "Continue tes efforts !";
  };

  // Fonction pour générer le HTML optimisé A4 avec gestion des dispenses
  const generateOptimizedHTML = (student, results, globalScore) => {
    const currentDate = new Date().toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric'
    });

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fiche EPS - ${student.first_name} ${student.last_name}</title>
    <style>
        @page { size: A4; margin: 8mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 10px; line-height: 1.3; color: #333; background: #f9fafb; }
        
        .header { background: white; border-radius: 8px; padding: 12px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
        .student-info h1 { font-size: 20px; color: #1f2937; margin-bottom: 4px; }
        .student-details { font-size: 9px; color: #6b7280; }
        .global-score-badge { text-align: center; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 8px 16px; border-radius: 8px; }
        .global-score-badge .score { font-size: 24px; font-weight: bold; }
        .global-score-badge .label { font-size: 8px; opacity: 0.9; text-transform: uppercase; }
        
        .categories-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        
        .category-card { border-radius: 8px; padding: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .category-card.endurance { background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%); border-left: 4px solid #3b82f6; }
        .category-card.force { background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%); border-left: 4px solid #ef4444; }
        .category-card.vitesse { background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-left: 4px solid #eab308; }
        .category-card.coordination { background: linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%); border-left: 4px solid #a855f7; }
        .category-card.equilibre { background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%); border-left: 4px solid #6366f1; }
        .category-card.souplesse { background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%); border-left: 4px solid #22c55e; }
        
        .category-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
        .category-title-section { display: flex; align-items: center; gap: 8px; }
        .category-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 14px; }
        .endurance .category-icon { background: #3b82f6; }
        .force .category-icon { background: #ef4444; }
        .vitesse .category-icon { background: #eab308; }
        .coordination .category-icon { background: #a855f7; }
        .equilibre .category-icon { background: #6366f1; }
        .souplesse .category-icon { background: #22c55e; }
        
        .category-info h3 { font-size: 12px; font-weight: bold; color: #1f2937; margin-bottom: 2px; }
        .category-info p { font-size: 8px; color: #6b7280; }
        
        .circular-gauge { position: relative; width: 60px; height: 60px; display: inline-block; }
        .gauge-text { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; width: 100%; }
        .gauge-score { font-size: 16px; font-weight: bold; display: block; line-height: 1; }
        .gauge-label { font-size: 7px; color: #6b7280; display: block; }
        
        .tests-list { margin-bottom: 8px; }
        .test-row { margin-bottom: 6px; }
        .test-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 3px; }
        .test-name { font-size: 9px; font-weight: 500; color: #374151; }
        .test-value { font-size: 9px; color: #1f2937; font-weight: 600; }
        .test-value.dispensed { color: #f59e0b; font-style: italic; }
        
        .progress-bar { width: 100%; height: 6px; background: rgba(0,0,0,0.1); border-radius: 3px; overflow: hidden; }
        .progress-fill { height: 100%; border-radius: 3px; transition: width 0.3s ease; }
        
        .advice-box { background: rgba(255,255,255,0.7); border-radius: 6px; padding: 8px; display: flex; gap: 6px; align-items: start; }
        .advice-icon { width: 16px; height: 16px; border-radius: 50%; background: rgba(59,130,246,0.2); display: flex; align-items: center; justify-content: center; font-size: 10px; color: #3b82f6; flex-shrink: 0; }
        .advice-content h4 { font-size: 8px; font-weight: bold; color: #1f2937; margin-bottom: 2px; }
        .advice-content p { font-size: 8px; color: #4b5563; line-height: 1.4; }
        
        .footer { background: white; border-radius: 8px; padding: 10px; margin-top: 10px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); page-break-inside: avoid; }
        .footer h3 { font-size: 11px; font-weight: bold; color: #1f2937; margin-bottom: 4px; }
        .footer p { font-size: 9px; color: #6b7280; line-height: 1.4; }
        .footer-meta { font-size: 7px; color: #9ca3af; margin-top: 6px; padding-top: 6px; border-top: 1px solid #e5e7eb; }
    </style>
</head>
<body>
    <div class="header">
        <div class="student-info">
            <h1>${student.first_name} ${student.last_name}</h1>
            <div class="student-details">
                ${student.classes.level}${student.classes.name} • ${student.gender === 'M' ? 'Garçon' : 'Fille'} • 
                Année ${selectedSchoolYear} • Collège Yves du Manoir
            </div>
        </div>
        <div class="global-score-badge">
            <div class="score">${globalScore}/100</div>
            <div class="label">Score Global</div>
        </div>
    </div>
    
    <div class="categories-grid">
        ${Object.entries(categories).map(([key, category]) => {
          const result = results?.[key] || { 
            score: 0, 
            tests: [], 
            testsCompleted: 0, 
            totalTests: category.tests?.length || 0,
            details: [],
            level: "Non évalué"
          };
          
          const categoryClass = key.toLowerCase();
          const scoreColor = getEvaluationColor(result.score);
          const circumference = 2 * Math.PI * 22;
          const strokeDashoffset = circumference - (result.score / 100) * circumference;
          
          return `
          <div class="category-card ${categoryClass}">
            <div class="category-header">
              <div class="category-title-section">
                <div class="category-icon">${category.shortName}</div>
                <div class="category-info">
                  <h3>${category.name}</h3>
                  <p>${result.testsCompleted}/${result.totalTests} • ${result.level}</p>
                </div>
              </div>
              
              <div class="circular-gauge">
                <svg width="60" height="60" viewBox="0 0 60 60">
                  <circle cx="30" cy="30" r="22" fill="none" stroke="#e5e7eb" stroke-width="6"/>
                  <circle cx="30" cy="30" r="22" fill="none" 
                    stroke="${scoreColor}" 
                    stroke-width="6" 
                    stroke-linecap="round"
                    stroke-dasharray="${circumference}"
                    stroke-dashoffset="${strokeDashoffset}"
                    transform="rotate(-90 30 30)"/>
                </svg>
                <div class="gauge-text">
                  <span class="gauge-score" style="color: ${scoreColor}">${result.score}</span>
                  <span class="gauge-label">/100</span>
                </div>
              </div>
            </div>
            
            <div class="tests-list">
              ${category.tests?.slice(0, 4).map(test => {
                const testDetail = result.details?.find(d => d.testName === test.name);
                const hasResult = !!testDetail;
                const isDispensed = hasResult && (testDetail.value === 'DISP' || testDetail.value === 'dispensé');
                
                let testScore = 0;
                
                if (hasResult && testDetail.result && !isDispensed) {
                  if (testDetail.result.method !== "echantillon_insuffisant") {
                    testScore = testDetail.result.score || 0;
                  }
                }
                
                const testColor = hasResult && testScore > 0 ? getEvaluationColor(testScore) : "#d1d5db";
                const displayValue = hasResult ? 
                  (isDispensed ? 'Dispensé' : `${testDetail.value} ${testDetail.unit}`) : 
                  '-';
                
                return `
                <div class="test-row">
                  <div class="test-header">
                    <span class="test-name">${test.shortName}</span>
                    <span class="test-value ${isDispensed ? 'dispensed' : ''}">${displayValue}</span>
                  </div>
                  <div class="progress-bar">
                    <div style="height: 100%; width: ${testScore}%; background: ${testColor}; border-radius: 3px;"></div>
                  </div>
                </div>
                `;
              }).join('') || '<div class="test-row"><span class="test-name">Aucun test</span></div>'}
            </div>
            
            <div class="advice-box">
              <div class="advice-icon">i</div>
              <div class="advice-content">
                <h4>Conseil personnalisé</h4>
                <p>${getCategoryAdviceShort(key, result.score)}</p>
              </div>
            </div>
          </div>
          `;
        }).join('')}
    </div>
    
    <div class="footer">
        <h3>Recommandation pour ${student.first_name}</h3>
        <p>
            ${globalScore >= 85 ? 
              "Excellente condition physique ! Maintiens ce niveau avec 60 min d'activité quotidienne (OMS)." :
            globalScore >= 70 ? 
              "Bon niveau ! Quelques efforts supplémentaires pour atteindre 60 min/jour (OMS)." :
            globalScore >= 55 ? 
              "Bonnes bases ! Avec de la régularité, tu atteindras les 60 min recommandées." :
              "Chaque effort compte ! Commence progressivement vers 60 min/jour."}
        </p>
        <div class="footer-meta">
            Système de notation déterministe • Généré le ${currentDate} • EPS Tracker YDM
        </div>
    </div>
</body>
</html>
    `;
  };

  const exportToPDF = () => {
    if (!selectedStudent || !studentResults) {
      alert('Aucune donnée à exporter pour cet élève.');
      return;
    }

    const globalScore = (() => {
      const categoriesWithResults = Object.values(studentResults).filter(cat => cat.score > 0);
      if (categoriesWithResults.length === 0) return 0;
      return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
    })();

    const printContent = generateOptimizedHTML(selectedStudent, studentResults, globalScore);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.open();
    printWindow.document.write(printContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    };
  };

  const exportAllClassPDFs = async () => {
    if (!students || students.length === 0) {
      alert('Aucun élève dans cette classe.');
      return;
    }

    try {
      setLoading(true);
      
      const allPagesHTML = [];
      
      for (const student of students) {
        const { data: results, error: resultsError } = await supabase
          .from('results')
          .select(`
            *,
            tests!inner(name, category, unit),
            students!inner(school_year)
          `)
          .eq('student_id', student.id)
          .eq('students.school_year', selectedSchoolYear);

        if (resultsError) {
          console.error(`Erreur pour ${student.first_name} ${student.last_name}:`, resultsError);
          continue;
        }

        const processedResults = await processStudentResultsWithDynamicBaremes(results || [], student);
        
        const globalScore = (() => {
          const categoriesWithResults = Object.values(processedResults).filter(cat => cat.score > 0);
          if (categoriesWithResults.length === 0) return 0;
          return Math.round(categoriesWithResults.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithResults.length);
        })();

        const studentHTML = generateOptimizedHTML(student, processedResults, globalScore);
        
        const bodyMatch = studentHTML.match(/<body>([\s\S]*)<\/body>/);
        if (bodyMatch) {
          allPagesHTML.push(`
            <div class="student-page" style="page-break-after: always;">
              ${bodyMatch[1]}
            </div>
          `);
        }
      }

      const currentDate = new Date().toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric'
      });

      const fullHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Fiches EPS - ${selectedClass.level}${selectedClass.name} - ${selectedSchoolYear}</title>
    <style>
        @page { size: A4; margin: 10mm; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; font-size: 9px; line-height: 1.2; color: #333; background: white; }
        .student-page { min-height: 100vh; position: relative; }
        @media print { .no-print { display: none !important; } }
    </style>
</head>
<body>
    <button class="no-print" title="Télécharger en PDF (imprimer → Enregistrer au format PDF)" onclick="window.print()" style="position:fixed;top:16px;right:16px;z-index:9999;width:44px;height:44px;display:flex;align-items:center;justify-content:center;background:#059669;color:white;border:none;border-radius:50%;cursor:pointer;font-size:18px;box-shadow:0 4px 14px rgba(0,0,0,0.25);">⬇</button>
    ${allPagesHTML.join('\n')}
    
    <div style="page-break-before: always; padding: 20px; text-align: center;">
        <h1 style="font-size: 24px; margin-bottom: 10px; color: #1f2937;">
          Fiches EPS - ${selectedClass.level}${selectedClass.name}
        </h1>
        <p style="font-size: 14px; color: #6b7280; margin-bottom: 20px;">
          Année scolaire ${selectedSchoolYear} • Collège Yves du Manoir
        </p>
        <p style="font-size: 12px; color: #9ca3af;">
          Document généré le ${currentDate} • ${students.length} élève${students.length > 1 ? 's' : ''} • 
          Système de notation déterministe
        </p>
    </div>
</body>
</html>
      `;

      const printWindow = window.open('', '_blank');
      printWindow.document.open();
      printWindow.document.write(fullHTML);
      printWindow.document.close();

    } catch (err) {
      console.error('Erreur lors de l\'export des fiches:', err);
      alert(`Erreur lors de l'export: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedSchoolYear) {
      loadAllTests();
      loadClassesAndCounts();
    }
  }, [selectedSchoolYear]);

  useEffect(() => {
    if (selectedClass && selectedSchoolYear) {
      loadStudentsForClass(selectedClass.id);
    }
  }, [selectedClass, selectedSchoolYear]);

  const loadClassesAndCounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .eq('school_year', selectedSchoolYear)
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (classesError) throw classesError;
      setClasses(classesData || []);

      if (selectedClass && !classesData.find(c => c.id === selectedClass.id)) {
        setSelectedClass(null);
        setSelectedStudent(null);
        setStudents([]);
        setStudentResults(null);
      }

      const counts = {};
      for (const classe of classesData) {
        const { count, error } = await supabase
          .from('students')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', classe.id)
          .eq('school_year', selectedSchoolYear);
        
        if (!error) {
          counts[classe.id] = count || 0;
        }
      }
      setStudentsCount(counts);

    } catch (err) {
      console.error('Erreur lors du chargement:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadStudentsForClass = async (classId) => {
    try {
      setLoading(true);
      setError(null);

      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select(`
          *,
          classes!inner(id, name, level)
        `)
        .eq('class_id', classId)
        .eq('school_year', selectedSchoolYear)
        .order('last_name', { ascending: true });

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);

    } catch (err) {
      console.error('Erreur lors du chargement des élèves:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // FONCTION CORRIGÉE : Ne compte que les tests NON dispensés
  const processStudentResultsWithDynamicBaremes = async (results, student) => {
    const categoryScores = {};
    
    Object.keys(categories).forEach(catKey => {
      categoryScores[catKey] = { 
        score: 0, 
        tests: [], 
        level: "Non évalué",
        testsCompleted: 0,
        totalTests: categories[catKey]?.tests?.length || 0,
        completionPercentage: 0,
        hasInsufficientData: false,
        validTests: 0,
        details: []
      };
    });

    results.forEach(result => {
      const testCategory = result.tests.category;
      const isDispensed = result.value === 'DISP' || result.value === 'dispensé';
      
      if (categoryScores[testCategory]) {
        // On ajoute tous les résultats (y compris dispensés) pour l'affichage
        categoryScores[testCategory].tests.push({
          name: result.tests.name,
          value: result.value,
          unit: result.tests.unit
        });
        
        // Mais on ne compte que les tests NON-dispensés pour le compteur
        if (!isDispensed) {
          categoryScores[testCategory].testsCompleted++;
        }
      }
    });

    for (const categoryName of Object.keys(categoryScores)) {
      const categoryData = categoryScores[categoryName];
      const testsCount = categoryData.testsCompleted;
      const totalTests = categoryData.totalTests;
      
      categoryData.completionPercentage = totalTests > 0 
        ? Math.round((testsCount / totalTests) * 100) 
        : 0;

      if (testsCount > 0 || categoryData.tests.length > 0) {
        try {
          const studentLevel = student?.classes?.level;
          const studentGender = student?.gender;
          
          if (studentLevel && studentGender) {
            const result = await calculateCategoryScoreWithDynamicBaremes(
              categoryData.tests, 
              studentLevel, 
              studentGender
            );
            
            categoryData.score = result.score;
            categoryData.hasInsufficientData = result.hasInsufficientData;
            categoryData.validTests = result.validTests || 0;
            categoryData.details = result.details;
            // "Pas assez de données" tant qu'aucun test de la catégorie n'a pu être
            // comparé à une cohorte suffisante, même si l'élève a bien été testé.
            categoryData.level = categoryData.validTests > 0
              ? getScoreLevel(result.score)
              : (testsCount > 0 ? 'Pas assez de données' : 'Non évalué');
          } else {
            categoryData.score = 50;
            categoryData.level = "Correct";
          }
        } catch (error) {
          console.error(`Erreur calcul dynamique pour ${categoryName}:`, error);
          categoryData.score = 50;
          categoryData.level = "Correct";
        }
      }
    }

    return categoryScores;
  };

  const loadStudentResults = async (studentId, student) => {
    try {
      setLoading(true);
  
      const { data: results, error: resultsError } = await supabase
        .from('results')
        .select(`
          *,
          tests!inner(name, category, unit),
          students!inner(school_year)
        `)
        .eq('student_id', studentId)
        .eq('students.school_year', selectedSchoolYear);
  
      if (resultsError) throw resultsError;

      const processedResults = await processStudentResultsWithDynamicBaremes(
        results || [], 
        student
      );
      
      setStudentResults(processedResults);
      
      // Calculer les statistiques pour le graphique radar
      if (student?.classes?.level && student?.gender) {
        const stats = await calculateRadarStatistics(
          student.classes.level,
          student.gender
        );
        setRadarStatistics(stats);
      }
  
    } catch (err) {
      console.error('Erreur lors du chargement des résultats:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const CircularGauge = ({ score, color, size = 100, insufficient = false }) => {
    const radius = 35;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (score / 100) * circumference;

    if (insufficient) {
      return (
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="transform -rotate-90">
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#e5e7eb"
              strokeWidth="6"
              fill="none"
              strokeDasharray="4 5"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-gray-400">—</span>
            <span className="text-[10px] text-gray-400 text-center leading-tight px-1">Pas assez<br/>de données</span>
          </div>
        </div>
      );
    }

    return (
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth="6"
            fill="none"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth="6"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-1000 ease-out"
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold" style={{ color }}>
            {score}
          </span>
          <span className="text-xs text-gray-500">/ 100</span>
        </div>
      </div>
    );
  };

  const ClassSelectionView = () => {
    const classesByLevel = {
      '6ème': classes.filter(c => c.level === '6ème').sort((a, b) => a.name.localeCompare(b.name)),
      '5ème': classes.filter(c => c.level === '5ème').sort((a, b) => a.name.localeCompare(b.name)),
      '4ème': classes.filter(c => c.level === '4ème').sort((a, b) => a.name.localeCompare(b.name)),
      '3ème': classes.filter(c => c.level === '3ème').sort((a, b) => a.name.localeCompare(b.name))
    };

    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-4">Fiches Individuelles - EPS SANTÉ</h1>
            <p className="text-gray-600">Sélectionnez une classe pour consulter les fiches individuelles des élèves</p>
          </div>

          <div className="bg-white rounded-lg shadow-md p-4 mb-8">
            <div className="flex items-center justify-center space-x-3">
              <Calendar className="text-blue-600" size={20} />
              <span className="text-gray-700">Fiches individuelles pour</span>
              <span className="font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                {selectedSchoolYear}
              </span>
              {selectedSchoolYear === currentSchoolYear && (
                <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded-full">
                  Année courante
                </span>
              )}
            </div>
          </div>

          {testsLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center mb-6">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <h3 className="text-lg font-semibold text-blue-800 mb-2">
                Chargement des tests dynamique...
              </h3>
            </div>
          )}

          {!testsLoading && classes.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-12 text-center">
              <BookOpen size={64} className="mx-auto text-yellow-500 mb-6" />
              <h3 className="text-2xl font-semibold text-yellow-800 mb-4">
                Aucune classe pour {selectedSchoolYear}
              </h3>
            </div>
          ) : !testsLoading && (
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
              {Object.entries(classesByLevel).map(([level, levelClasses]) => (
                levelClasses.length > 0 && (
                  <div key={level} className="space-y-6">
                    <div className="text-center">
                      <div className="flex items-center justify-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                        <h2 className={`text-xl font-bold ${getLevelColors(level).text}`}>
                          {level}
                        </h2>
                        <div className={`w-3 h-3 rounded-full ${getLevelColors(level).accent}`}></div>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      {levelClasses.map((classe) => {
                        const colors = getLevelColors(classe.level);
                        const studentCount = studentsCount[classe.id] || 0;
                        
                        return (
                          <button
                            key={classe.id}
                            onClick={() => setSelectedClass(classe)}
                            className={`w-full p-6 rounded-xl border-2 transition-all duration-300 text-center transform hover:scale-105 hover:shadow-lg ${colors.light} ${colors.border} ${colors.hover}`}
                          >
                            <div className={`text-2xl font-bold mb-4 ${colors.text}`}>
                              {classe.level.charAt(0)}{classe.name}
                            </div>
                            
                            <div className={`flex items-center justify-center space-x-2 text-sm ${colors.text} opacity-80 mb-3`}>
                              <Users size={16} />
                              <span>{studentCount} élève{studentCount !== 1 ? 's' : ''}</span>
                            </div>
                            
                            <div className={`text-sm ${colors.text} opacity-75`}>
                              Cliquer pour voir les élèves
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const StudentSelectionView = () => {
    const colors = getLevelColors(selectedClass.level);
    
    const filteredStudents = students.filter(student =>
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => {
                    setSelectedClass(null);
                    setSearchTerm('');
                    setStudents([]);
                  }}
                  className="flex items-center space-x-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  <ArrowLeft size={16} />
                  <span>Retour aux classes</span>
                </button>
                <div className="flex items-center space-x-3">
                  <div className={`p-2 ${colors.accent} rounded-xl shadow-md`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-gray-800">
                      Fiches Individuelles - {selectedClass.level.charAt(0)}{selectedClass.name}
                    </h1>
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-gray-600">Collège Yves du Manoir</span>
                      <span className="text-gray-400">•</span>
                      <Calendar size={14} className="text-blue-600" />
                      <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {selectedSchoolYear}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button
                  onClick={exportAllClassPDFs}
                  disabled={loading || students.length === 0}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg shadow-md transition-all ${
                    loading || students.length === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700 hover:shadow-lg'
                  }`}
                >
                  <Download size={16} />
                  <span>{loading ? 'Export en cours...' : `Exporter toute la classe (${students.length})`}</span>
                </button>
                <div className={`text-sm ${colors.text} font-medium`}>
                  {filteredStudents.length} élève{filteredStudents.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Rechercher un élève..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Chargement des élèves...</p>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <BookOpen className="mx-auto text-gray-400 mb-4" size={32} />
              <p className="text-gray-600 mb-2">Aucun élève trouvé</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredStudents.map(student => (
                <div
                  key={student.id}
                  onClick={() => {
                    setSelectedStudent(student);
                    loadStudentResults(student.id, student);
                  }}
                  className={`bg-white rounded-lg shadow-md p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-105 border-l-4 ${colors.accent}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`w-12 h-12 ${colors.light} rounded-xl flex items-center justify-center`}>
                      <User className={`${colors.text}`} size={20} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-gray-800">
                        {student.first_name} {student.last_name}
                      </h3>
                      <p className={`text-sm ${colors.text} font-medium`}>
                        {student.classes.name} • {student.classes.level}
                      </p>
                    </div>
                    <ChevronRight className="text-gray-400" size={16} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  const StudentFitnessCardView = () => {
    const colors = selectedStudent?.classes ? getLevelColors(selectedStudent.classes.level) : getLevelColors('6ème');
    const categoriesWithValidScore = studentResults
      ? Object.values(studentResults).filter(cat => (cat.validTests || 0) > 0)
      : [];
    const hasAnyValidScore = categoriesWithValidScore.length > 0;
    const globalScore = hasAnyValidScore
      ? Math.round(categoriesWithValidScore.reduce((acc, cat) => acc + cat.score, 0) / categoriesWithValidScore.length)
      : 0;

    if (!selectedStudent || !selectedStudent.classes) {
      return (
        <div className="min-h-screen bg-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-6">
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Chargement des données de l'élève...</p>
            </div>
          </div>
        </div>
      );
    }

    // Préparer les données pour le radar chart
    const studentScores = studentResults ? {
      ENDURANCE: studentResults.ENDURANCE?.score || 0,
      FORCE: studentResults.FORCE?.score || 0,
      VITESSE: studentResults.VITESSE?.score || 0,
      COORDINATION: studentResults.COORDINATION?.score || 0,
      EQUILIBRE: studentResults.EQUILIBRE?.score || 0,
      SOUPLESSE: studentResults.SOUPLESSE?.score || 0
    } : null;

    return (
      <div className="min-h-screen bg-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => {
                setSelectedStudent(null);
                setStudentResults(null);
                setRadarStatistics(null);
              }}
              className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              <ChevronLeft size={16} />
              <span>Retour aux élèves</span>
            </button>

            <div className="flex items-center space-x-3">
              <button
                onClick={exportToPDF}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
              >
                <Download size={16} />
                <span>Exporter en PDF</span>
              </button>

              <button
                onClick={() => setShowEvolution(true)}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all shadow-md"
              >
                <TrendingUp size={16} />
                <span>Évolution 4 ans</span>
              </button>

              <ParentReportGenerator
                student={selectedStudent}
                currentSchoolYear={selectedSchoolYear}
                collegeName="Collège Yves du Manoir de Vaucresson"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-6">
                {/* Badge avec niveau et classe */}
                <div className={`w-20 h-20 bg-gradient-to-br ${colors.gradient} rounded-2xl flex flex-col items-center justify-center text-white shadow-lg`}>
                  <span className="text-lg font-bold">{selectedStudent.classes.level}</span>
                  <span className="text-lg font-bold">{selectedStudent.classes.name}</span>
                </div>
                
                <div>
                  <h1 className="text-2xl font-bold text-gray-800 mb-2">
                    {selectedStudent.first_name} {selectedStudent.last_name}
                  </h1>
                  <div className="flex items-center space-x-4 text-gray-600">
                    <span>{selectedStudent.gender === 'M' ? 'Garçon' : 'Fille'}</span>
                  </div>
                </div>
              </div>
              
              {/* Avatar Énergie Santé */}
              <div className="flex items-center justify-center">
                <EnergyAvatar
                  firstName={selectedStudent.first_name}
                  lastName={selectedStudent.last_name}
                  score={hasAnyValidScore ? globalScore : null}
                  size="lg"
                  showLabel={true}
                  showScore={true}
                />
              </div>
              
              {/* Section Graphique Radar + Score Global */}
              <div className="flex items-center space-x-6">
                {/* Score Global */}
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2" style={{ color: hasAnyValidScore ? getScoreColor(globalScore) : '#9ca3af' }}>
                    {hasAnyValidScore ? globalScore : '—'}<span className="text-2xl">/100</span>
                  </div>
                  <div className="text-sm text-gray-600 uppercase tracking-wide font-semibold mb-1">
                    Score global
                  </div>
                  <div className="mt-2 px-3 py-1 rounded-full text-xs font-bold" 
                       style={{ 
                         backgroundColor: (hasAnyValidScore ? getScoreColor(globalScore) : '#9ca3af') + '20',
                         color: hasAnyValidScore ? getScoreColor(globalScore) : '#6b7280'
                       }}>
                    {hasAnyValidScore ? getScoreLevel(globalScore) : 'Pas assez de données'}
                  </div>
                  {!hasAnyValidScore && (
                    <p className="text-[11px] text-gray-400 mt-1 max-w-[160px] mx-auto leading-tight">
                      Pas encore assez d'élèves testés cette année pour comparer
                    </p>
                  )}
                  <button
                    onClick={() => setShowEvolution(true)}
                    className="mt-3 flex items-center space-x-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors mx-auto"
                  >
                    <TrendingUp size={12} />
                    <span>Voir l'évolution 4 ans</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <RefreshCw className="animate-spin mx-auto text-blue-500 mb-4" size={32} />
              <p className="text-gray-600">Calcul des barèmes dynamiques...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(categories).map(([key, category]) => {
                const result = studentResults?.[key] || { 
                  score: 0, 
                  tests: [], 
                  testsCompleted: 0, 
                  totalTests: category.tests?.length || 0,
                  details: []
                };
                
                const IconComponent = category.icon;
                const hasEnoughData = (result.validTests || 0) > 0;
                const evaluationColor = hasEnoughData ? getEvaluationColor(result.score) : '#9ca3af';
                
                return (
                  <div key={key} className={`bg-gradient-to-br ${category.bgColor} rounded-lg shadow-md border ${category.borderColor} p-4`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="p-2 rounded-lg text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          <IconComponent size={18} />
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-800 text-sm" style={{ color: category.color }}>
                            {category.name}
                          </h3>
                          <p className={`text-xs ${hasEnoughData ? 'text-gray-600' : 'text-gray-400 italic'}`}>{result.level}</p>
                        </div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {result.testsCompleted}/{result.totalTests}
                      </span>
                    </div>

                    <div className="flex justify-center mb-4">
                      <CircularGauge score={result.score} color={evaluationColor} size={80} insufficient={result.testsCompleted > 0 && !hasEnoughData} />
                    </div>

                    <div className="space-y-2 mb-4">
                      {category.tests?.map((test, index) => {
                        const testDetail = result.details?.find(d => d.testName === test.name);
                        const hasResult = !!testDetail;
                        const isDispensed = hasResult && (testDetail.value === 'DISP' || testDetail.value === 'dispensé');
                        
                        let testScore = 0;
                        
                        if (hasResult && testDetail.result && !isDispensed) {
                          if (testDetail.result.method !== "echantillon_insuffisant") {
                            testScore = testDetail.result.score || 0;
                          }
                        }
                        
                        const testEvaluationColor = hasResult && testScore > 0 ? getEvaluationColor(testScore) : "#d1d5db";
                        const displayValue = hasResult ? 
                          (isDispensed ? 'Dispensé' : `${testDetail.value} ${testDetail.unit}`) : 
                          '-';
                        
                        return (
                          <div key={index} className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs font-medium text-gray-700">
                                {test.shortName}
                              </span>
                              <span className={`text-xs ${isDispensed ? 'text-amber-600 italic' : 'text-gray-600'}`}>
                                {displayValue}
                              </span>
                            </div>
                            
                            <div className="w-full bg-gray-200 rounded-full h-1.5">
                              <div 
                                className="h-1.5 rounded-full transition-all duration-1000"
                                style={{ 
                                  width: hasResult && testScore > 0 ? `${testScore}%` : '0%',
                                  backgroundColor: testEvaluationColor
                                }}
                              ></div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="bg-white/70 rounded-lg p-3 backdrop-blur-sm">
                      <div className="flex items-start space-x-2">
                        <Info size={14} className="text-gray-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <h5 className="text-xs font-semibold text-gray-800 mb-1">Conseil personnalisé</h5>
                          <p className="text-xs text-gray-700 leading-relaxed">
                            {getCategoryAdvice(key, result.score, result.testsCompleted, result.totalTests, hasEnoughData)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="mt-6 bg-white rounded-lg shadow-md p-6 text-center">
            <div className="flex items-center justify-center space-x-2 mb-3">
              <Heart className="text-red-500" size={20} />
              <h3 className="text-lg font-bold text-gray-800">
                Recommandations pour {selectedStudent.first_name}
              </h3>
            </div>
            <p className="text-gray-700 max-w-3xl mx-auto">
              {globalScore >= 85 ? 
                "Excellente condition physique ! Continue à pratiquer une activité physique régulière pour maintenir ce niveau exceptionnel selon les recommandations OMS (60 min/jour)." :
              globalScore >= 70 ? 
                "Bon niveau de condition physique. Quelques efforts supplémentaires t'aideront à atteindre les recommandations OMS de 60 minutes d'activité quotidienne." :
              globalScore >= 55 ? 
                "Tu as de bonnes bases ! Avec de la régularité dans tes activités physiques, tu atteindras facilement les 60 minutes recommandées par l'OMS." :
                "Chaque mouvement compte ! Commence par de petites activités quotidiennes pour progresser vers les 60 minutes recommandées par l'OMS."}
            </p>
          </div>

          {showEvolution && selectedStudent && (
            <StudentEvolutionPanel
              student={selectedStudent}
              onClose={() => setShowEvolution(false)}
            />
          )}
        </div>
      </div>
    );
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <AlertCircle className="mx-auto text-red-500 mb-4" size={48} />
          <h2 className="text-lg font-semibold text-red-700 mb-2">Erreur de chargement</h2>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => {
              loadAllTests();
              loadClassesAndCounts();
            }}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  if ((loading || testsLoading) && !selectedClass && !selectedStudent) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="animate-spin text-blue-500 mr-3" size={24} />
          <span className="text-gray-600">
            {testsLoading ? 'Chargement dynamique des tests...' : 'Chargement des classes...'}
          </span>
        </div>
      </div>
    );
  }

  if (!selectedClass) {
    return <ClassSelectionView />;
  }

  if (!selectedStudent) {
    return <StudentSelectionView />;
  }

  return <StudentFitnessCardView />;
};

export default IndividualFitnessCard;
