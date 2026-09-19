// EnergyAvatar.jsx
// Avatar dynamique "Cartes d'Énergie Santé" — remplace les photos de profil vides

import React from 'react';

// ─── Niveaux d'énergie ─────────────────────────────────────────────────────────

export const ENERGY_LEVELS = [
  {
    min: 0, max: 30,
    label: 'Vitalité Faible', icon: '🔋',
    from: '#94a3b8', to: '#64748b',
    ring: '#cbd5e1', text: '#f8fafc',
    glow: 'rgba(148,163,184,0.4)',
    pulse: false,
  },
  {
    min: 31, max: 50,
    label: 'En Forme', icon: '💚',
    from: '#4ade80', to: '#16a34a',
    ring: '#86efac', text: '#f0fdf4',
    glow: 'rgba(74,222,128,0.4)',
    pulse: false,
  },
  {
    min: 51, max: 65,
    label: 'Dynamique', icon: '⚡',
    from: '#fbbf24', to: '#d97706',
    ring: '#fde68a', text: '#fefce8',
    glow: 'rgba(251,191,36,0.5)',
    pulse: false,
  },
  {
    min: 66, max: 80,
    label: 'Endurant', icon: '🔥',
    from: '#fb923c', to: '#dc2626',
    ring: '#fed7aa', text: '#fff7ed',
    glow: 'rgba(251,146,60,0.5)',
    pulse: false,
  },
  {
    min: 81, max: 90,
    label: 'Surpuissant', icon: '💪',
    from: '#f43f5e', to: '#9f1239',
    ring: '#fda4af', text: '#fff1f2',
    glow: 'rgba(244,63,94,0.5)',
    pulse: true,
  },
  {
    min: 91, max: 100,
    label: 'Légendaire', icon: '🌟',
    from: '#a78bfa', to: '#6d28d9',
    ring: '#ddd6fe', text: '#faf5ff',
    glow: 'rgba(167,139,250,0.6)',
    pulse: true,
  },
];

// Niveau neutre utilisé quand il n'y a tout simplement pas encore assez de
// résultats pour calculer un score - à ne pas confondre avec une "vraie"
// faible performance (score 0-30), qui reste dans ENERGY_LEVELS.
export const NO_DATA_LEVEL = {
  min: null, max: null,
  label: 'Pas encore évalué', icon: '➖',
  from: '#cbd5e1', to: '#94a3b8',
  ring: '#e2e8f0', text: '#f8fafc',
  glow: 'rgba(203,213,225,0.3)',
  pulse: false,
  isNoData: true,
};

export const getEnergyLevel = (score) => {
  if (score === null || score === undefined) return NO_DATA_LEVEL;
  return ENERGY_LEVELS.find(l => score >= l.min && score <= l.max) || ENERGY_LEVELS[0];
};

// ─── Composant EnergyAvatar ────────────────────────────────────────────────────

/**
 * Props:
 * - firstName, lastName : string
 * - score : number (0-100) ou null
 * - size : 'sm' (48px) | 'md' (80px) | 'lg' (128px)
 * - showLabel : boolean (affiche le label sous l'avatar)
 * - showScore : boolean (affiche le score dans le badge)
 */
const EnergyAvatar = ({
  firstName = '?',
  lastName = '?',
  score = null,
  size = 'md',
  showLabel = false,
  showScore = false,
}) => {
  const level = getEnergyLevel(score);
  const initials = `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const dimensions = {
    sm: { box: 48, font: 16, badge: 18, badgeFont: 10, ring: 3 },
    md: { box: 80, font: 26, badge: 24, badgeFont: 13, ring: 4 },
    lg: { box: 128, font: 40, badge: 34, badgeFont: 16, ring: 5 },
  }[size] || { box: 80, font: 26, badge: 24, badgeFont: 13, ring: 4 };

  const { box, font, badge, badgeFont, ring } = dimensions;
  const cx = box / 2;
  const cy = box / 2;
  const r = box / 2 - ring;
  const circumference = 2 * Math.PI * r;
  const scoreProgress = score !== null ? (score / 100) * circumference : 0;

  const gradId = `grad-${firstName}-${lastName}-${size}`.replace(/\s/g, '');
  const glowId = `glow-${firstName}-${lastName}-${size}`.replace(/\s/g, '');

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: box, height: box }}>

        {/* Pulse animation pour les hauts niveaux */}
        {level.pulse && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-30"
            style={{ backgroundColor: level.from }}
          />
        )}

        {/* SVG principal */}
        <svg width={box} height={box} viewBox={`0 0 ${box} ${box}`} className="drop-shadow-md">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={level.from} />
              <stop offset="100%" stopColor={level.to} />
            </linearGradient>
            <filter id={glowId}>
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Fond cercle */}
          <circle cx={cx} cy={cy} r={cx - 1} fill={`url(#${gradId})`} />

          {/* Anneau de progression du score */}
          {score !== null && (
            <>
              <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(255,255,255,0.2)" strokeWidth={ring} />
              <circle cx={cx} cy={cy} r={r} fill="none"
                stroke="rgba(255,255,255,0.85)" strokeWidth={ring}
                strokeLinecap="round"
                strokeDasharray={`${scoreProgress} ${circumference}`}
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            </>
          )}

          {/* Initiales */}
          <text
            x={cx} y={cy + font * 0.38}
            textAnchor="middle"
            fontSize={font}
            fontWeight="800"
            fontFamily="Arial, sans-serif"
            fill="white"
            filter={`url(#${glowId})`}
            opacity="0.95"
          >
            {initials}
          </text>
        </svg>

        {/* Badge énergie en bas à droite */}
        <div
          className="absolute -bottom-1 -right-1 rounded-full flex items-center justify-center border-2 border-white shadow-md"
          style={{
            width: badge,
            height: badge,
            background: `linear-gradient(135deg, ${level.from}, ${level.to})`,
            fontSize: badgeFont,
          }}
          title={level.label}
        >
          <span style={{ lineHeight: 1 }}>{level.icon}</span>
        </div>

        {/* Score dans le badge si demandé */}
        {showScore && score !== null && (
          <div
            className="absolute -top-1 -left-1 rounded-full flex items-center justify-center border-2 border-white shadow-md text-white font-bold"
            style={{
              width: badge,
              height: badge,
              background: `linear-gradient(135deg, ${level.to}, ${level.from})`,
              fontSize: badgeFont - 1,
            }}
          >
            {score}
          </div>
        )}
      </div>

      {/* Label optionnel */}
      {showLabel && (
        <div className="text-center">
          <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{
              background: `linear-gradient(135deg, ${level.from}22, ${level.to}22)`,
              color: level.to,
              border: `1px solid ${level.from}55`,
            }}
          >
            {level.icon} {level.label}
          </span>
        </div>
      )}
    </div>
  );
};

export default EnergyAvatar;
