// Decorative inline SVG illustrations for the premium calculator (no external assets).

export const ShieldHero = ({ className = '' }) => (
  <svg viewBox='0 0 170 110' className={className} aria-hidden='true'>
    <defs>
      <linearGradient id='heroShield' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#3b82f6' />
        <stop offset='1' stopColor='#1d4ed8' />
      </linearGradient>
      <linearGradient id='heroLeaf' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#99f6e4' />
        <stop offset='1' stopColor='#5eead4' />
      </linearGradient>
    </defs>
    {/* cloud */}
    <g fill='#e0ecff'>
      <circle cx='138' cy='22' r='9' />
      <circle cx='150' cy='19' r='12' />
      <circle cx='162' cy='24' r='8' />
      <rect x='130' y='22' width='38' height='10' rx='5' />
    </g>
    {/* leaves */}
    <path d='M48 100 C30 88 26 66 36 48 C48 62 54 82 48 100 Z' fill='url(#heroLeaf)' />
    <path d='M58 102 C46 96 40 84 44 72 C54 80 60 90 58 102 Z' fill='#5eead4' opacity='0.7' />
    <path d='M122 100 C140 88 144 66 134 48 C122 62 116 82 122 100 Z' fill='url(#heroLeaf)' />
    <path d='M112 102 C124 96 130 84 126 72 C116 80 110 90 112 102 Z' fill='#5eead4' opacity='0.7' />
    {/* shield */}
    <path d='M85 8 L118 20 V48 C118 72 104 90 85 100 C66 90 52 72 52 48 V20 Z' fill='#bfdbfe' />
    <path d='M85 14 L113 24 V48 C113 69 101 85 85 94 C69 85 57 69 57 48 V24 Z' fill='url(#heroShield)' />
    <path d='M70 52 L81 63 L101 41' fill='none' stroke='#fff' strokeWidth='7' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)

export const CarShield = ({ className = '' }) => (
  <svg viewBox='0 0 260 140' className={className} aria-hidden='true'>
    <defs>
      <linearGradient id='carBody' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#3b82f6' />
        <stop offset='1' stopColor='#1d4ed8' />
      </linearGradient>
      <linearGradient id='carShield' x1='0' y1='0' x2='0' y2='1'>
        <stop offset='0' stopColor='#60a5fa' />
        <stop offset='1' stopColor='#2563eb' />
      </linearGradient>
    </defs>
    {/* skyline */}
    <g fill='#e8f0fe'>
      <rect x='20' y='50' width='22' height='70' rx='2' />
      <rect x='46' y='30' width='18' height='90' rx='2' />
      <rect x='68' y='58' width='20' height='62' rx='2' />
      <rect x='172' y='40' width='20' height='80' rx='2' />
      <rect x='196' y='22' width='16' height='98' rx='2' />
      <rect x='216' y='54' width='24' height='66' rx='2' />
    </g>
    {/* ground */}
    <ellipse cx='130' cy='124' rx='118' ry='9' fill='#e0ecff' />
    {/* trees */}
    <rect x='31' y='96' width='3' height='24' fill='#5eead4' />
    <ellipse cx='32.5' cy='90' rx='9' ry='15' fill='#99f6e4' />
    <rect x='226' y='96' width='3' height='24' fill='#5eead4' />
    <ellipse cx='227.5' cy='90' rx='9' ry='15' fill='#99f6e4' />
    {/* car */}
    <path d='M82 78 L96 50 Q100 43 108 43 H150 Q158 43 162 50 L176 78 Z' fill='url(#carBody)' />
    <path d='M93 76 L104 54 Q106 50 111 50 H147 Q152 50 154 54 L165 76 Z' fill='#dbeafe' />
    <rect x='66' y='74' width='126' height='38' rx='13' fill='url(#carBody)' />
    <rect x='60' y='72' width='12' height='7' rx='3' fill='#1d4ed8' />
    <rect x='186' y='72' width='12' height='7' rx='3' fill='#1d4ed8' />
    <rect x='76' y='84' width='24' height='9' rx='4.5' fill='#fff' />
    <rect x='158' y='84' width='24' height='9' rx='4.5' fill='#fff' />
    <rect x='108' y='86' width='42' height='12' rx='3' fill='#1e3a8a' />
    <g stroke='#3b82f6' strokeWidth='1.5'>
      <line x1='112' y1='90' x2='146' y2='90' />
      <line x1='112' y1='94' x2='146' y2='94' />
    </g>
    <rect x='74' y='108' width='20' height='14' rx='4' fill='#1e293b' />
    <rect x='164' y='108' width='20' height='14' rx='4' fill='#1e293b' />
    {/* shield */}
    <path d='M200 6 L226 16 V38 C226 56 215 68 200 76 C185 68 174 56 174 38 V16 Z' fill='#fff' />
    <path d='M200 10 L222 18.5 V38 C222 54 212 65 200 72 C188 65 178 54 178 38 V18.5 Z' fill='url(#carShield)' />
    <path d='M189 39 L197 47 L212 31' fill='none' stroke='#fff' strokeWidth='5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
)
