/* Server component — sem 'use client' */

export function AuthBrandPanel() {
  return (
    <div className="relative hidden overflow-hidden lg:flex lg:flex-col lg:items-center lg:justify-center lg:px-12">
      {/* ── Fundo aurora (claro) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: 'var(--surface-2)' }}
      >
        <div
          className="absolute left-[-10%] top-[-5%] h-[500px] w-[500px] rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--brand-1), transparent 70%)',
            filter: 'blur(100px)',
            opacity: 0.18,
            animation: 'aurora 18s ease-in-out infinite alternate',
          }}
        />
        <div
          className="absolute right-[-5%] top-[20%] h-[420px] w-[420px] rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--brand-2), transparent 70%)',
            filter: 'blur(100px)',
            opacity: 0.18,
            animation: 'aurora 22s ease-in-out infinite alternate-reverse',
            animationDelay: '-8s',
          }}
        />
        <div
          className="absolute bottom-[-10%] left-[20%] h-[460px] w-[460px] rounded-full"
          style={{
            background: 'radial-gradient(circle, var(--brand-3), transparent 70%)',
            filter: 'blur(100px)',
            opacity: 0.15,
            animation: 'aurora 26s ease-in-out infinite alternate',
            animationDelay: '-14s',
          }}
        />
        {/* Grid texture — linhas escuras sutis sobre fundo claro */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.05) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
      </div>

      {/* ── Conteúdo principal ── */}
      <div className="relative z-10 flex w-full max-w-md flex-col items-center gap-8 text-center">
        {/* 1. Logo + Wordmark */}
        <div style={{ animation: 'fade-up 0.5s ease both 0ms', opacity: 0 }}>
          <div className="flex items-center justify-center gap-3">
            <OperumLogo />
            <span className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Operum
            </span>
          </div>
        </div>

        {/* 2. Headline */}
        <div style={{ animation: 'fade-up 0.5s ease both 60ms', opacity: 0 }}>
          <h2
            className="text-3xl font-bold leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            Do escopo à entrega,
            <br />
            tudo em um lugar.
          </h2>
        </div>

        {/* 3. Feature list */}
        <div className="flex w-full flex-col gap-5 text-left">
          <FeatureItem
            delay={120}
            icon={<IconWbs />}
            title="EAP / WBS interativa"
            desc="Estruture o escopo do projeto em uma árvore visual e colaborativa."
          />
          <FeatureItem
            delay={180}
            icon={<IconKanban />}
            title="Board Kanban por sprint"
            desc="Gerencie tarefas, prioridades e entregas sprint a sprint."
          />
          <FeatureItem
            delay={240}
            icon={<IconClock />}
            title="Rastreamento de tempo e custo"
            desc="Acompanhe horas, custos e performance de cada membro."
          />
        </div>

        {/* 4. WBS diagram decorativo */}
        <div
          className="opacity-70"
          style={{ animation: 'fade-up 0.5s ease both 300ms', opacity: 0 }}
        >
          <WbsDiagramLight />
        </div>
      </div>

      {/* 5. Footer — powered by Mavellium */}
      <div className="absolute bottom-6 left-0 right-0 flex items-center justify-center gap-2">
        <span
          className="text-xs uppercase tracking-widest"
          style={{ color: 'var(--text-secondary)' }}
        >
          powered by
        </span>
        <MavelliumWordmark />
      </div>
    </div>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function OperumLogo() {
  return (
    <svg
      width="40"
      height="40"
      viewBox="0 0 40 40"
      fill="none"
      aria-hidden="true"
    >
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        stroke="var(--brand-2)"
        strokeWidth="2"
        fill="rgba(79,70,229,0.06)"
      />
      <text
        x="20"
        y="25"
        textAnchor="middle"
        fill="var(--brand-2)"
        fontSize="13"
        fontWeight="700"
        fontFamily="ui-sans-serif,system-ui,sans-serif"
      >
        O
      </text>
    </svg>
  )
}

function FeatureItem({
  delay,
  icon,
  title,
  desc,
}: {
  delay: number
  icon: React.ReactNode
  title: string
  desc: string
}) {
  return (
    <div
      className="flex items-start gap-4"
      style={{ animation: `fade-up 0.5s ease both ${delay}ms`, opacity: 0 }}
    >
      <div
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{
          background: 'rgba(79,70,229,0.08)',
          color: 'var(--brand-2)',
        }}
      >
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </p>
        <p className="mt-0.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {desc}
        </p>
      </div>
    </div>
  )
}

function IconWbs() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="5" rx="1" />
      <line x1="12" y1="7" x2="12" y2="11" />
      <line x1="5" y1="11" x2="19" y2="11" />
      <line x1="5" y1="11" x2="5" y2="14" />
      <line x1="19" y1="11" x2="19" y2="14" />
      <rect x="1" y="14" width="8" height="5" rx="1" />
      <rect x="15" y="14" width="8" height="5" rx="1" />
    </svg>
  )
}

function IconKanban() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="3" width="5" height="18" rx="1.5" />
      <rect x="9.5" y="3" width="5" height="12" rx="1.5" />
      <rect x="17" y="3" width="5" height="15" rx="1.5" />
    </svg>
  )
}

function IconClock() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 3.5" />
    </svg>
  )
}

function WbsDiagramLight() {
  const lineAttrs = (delay: number) => ({
    stroke: 'var(--brand-2)',
    strokeWidth: 1.5,
    fill: 'none',
    opacity: 0.4,
    pathLength: 1 as unknown as string,
    strokeDasharray: '1',
    strokeDashoffset: '1',
    style: { animation: `draw 0.5s ease both ${delay}s` },
  })

  const nodeAnim = (delay: number): React.CSSProperties => ({
    opacity: 0,
    animation: `fade-up 0.35s ease both ${delay}s`,
  })

  return (
    <svg
      viewBox="0 0 360 210"
      className="w-full max-w-[200px]"
      aria-hidden="true"
      style={{ animation: 'float 6s ease-in-out infinite' }}
    >
      {/* Lines */}
      <line x1="180" y1="40" x2="70" y2="95" {...lineAttrs(0.4)} />
      <line x1="180" y1="40" x2="180" y2="95" {...lineAttrs(0.55)} />
      <line x1="180" y1="40" x2="290" y2="95" {...lineAttrs(0.7)} />
      <line x1="70" y1="117" x2="35" y2="168" {...lineAttrs(0.9)} />
      <line x1="70" y1="117" x2="105" y2="168" {...lineAttrs(1.0)} />
      <line x1="290" y1="117" x2="255" y2="168" {...lineAttrs(1.1)} />
      <line x1="290" y1="117" x2="325" y2="168" {...lineAttrs(1.2)} />

      {/* Root */}
      <g style={nodeAnim(0.2)}>
        <rect x="143" y="16" width="74" height="26" rx="7" fill="white" stroke="var(--brand-2)" strokeWidth="1.5" />
        <text x="180" y="33" textAnchor="middle" fill="var(--text-primary)" fontSize="10" fontFamily="ui-monospace,monospace">Projeto</text>
      </g>

      {/* Children */}
      <g style={nodeAnim(0.7)}>
        <rect x="38" y="95" width="64" height="22" rx="6" fill="white" stroke="var(--brand-2)" strokeWidth="1.5" />
        <text x="70" y="110" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontFamily="ui-monospace,monospace">Fase 1</text>
      </g>
      <g style={nodeAnim(0.8)}>
        <rect x="149" y="95" width="62" height="22" rx="6" fill="white" stroke="var(--brand-2)" strokeWidth="1.5" />
        <text x="180" y="110" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontFamily="ui-monospace,monospace">Fase 2</text>
      </g>
      <g style={nodeAnim(0.9)}>
        <rect x="258" y="95" width="64" height="22" rx="6" fill="white" stroke="var(--brand-2)" strokeWidth="1.5" />
        <text x="290" y="110" textAnchor="middle" fill="var(--text-primary)" fontSize="9" fontFamily="ui-monospace,monospace">Fase 3</text>
      </g>

      {/* Grandchildren */}
      <g style={nodeAnim(1.1)}>
        <rect x="10" y="168" width="50" height="18" rx="5" fill="white" stroke="var(--brand-3)" strokeWidth="1.2" />
        <text x="35" y="181" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="ui-monospace,monospace">T 1.1</text>
      </g>
      <g style={nodeAnim(1.2)}>
        <rect x="80" y="168" width="50" height="18" rx="5" fill="white" stroke="var(--brand-3)" strokeWidth="1.2" />
        <text x="105" y="181" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="ui-monospace,monospace">T 1.2</text>
      </g>
      <g style={nodeAnim(1.3)}>
        <rect x="230" y="168" width="50" height="18" rx="5" fill="white" stroke="var(--brand-3)" strokeWidth="1.2" />
        <text x="255" y="181" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="ui-monospace,monospace">T 3.1</text>
      </g>
      <g style={nodeAnim(1.4)}>
        <rect x="300" y="168" width="50" height="18" rx="5" fill="white" stroke="var(--brand-3)" strokeWidth="1.2" />
        <text x="325" y="181" textAnchor="middle" fill="var(--text-primary)" fontSize="8" fontFamily="ui-monospace,monospace">T 3.2</text>
      </g>
    </svg>
  )
}

function MavelliumWordmark() {
  return (
    <div className="flex items-center gap-1.5">
      {/* "M" geométrico: dois chevrons sobrepostos */}
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
        <path d="M2 13L8 4L14 13" stroke="var(--brand-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M5 13L8 8.5L11 13" stroke="var(--brand-1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="text-sm font-semibold" style={{ color: 'var(--brand-1)' }}>
        Mavellium
      </span>
    </div>
  )
}
