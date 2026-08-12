'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { formatMoney } from '@/lib/money'
import { formatWallTime } from '@/lib/datetime'
import { MAX_UPLOAD_BYTES, ALLOWED_UPLOAD_TYPES } from '@/lib/schema/cake-order'
import type {
  AvailabilityResult,
  CakeOption,
  CakeSize,
  Locale,
  UnavailableReason,
} from '@/lib/data/types'
import type { Action, ConfiguratorState } from './state'
import { leadDays } from '@/lib/cakes'

type StepProps = {
  state: ConfiguratorState
  dispatch: React.Dispatch<Action>
  locale: Locale
  sizes: CakeSize[]
  options: CakeOption[]
}

/* ---- 1 · Occasion ---------------------------------------------------- */

const OCCASIONS = ['quinceanera', 'cumpleanos', 'boda', 'otro'] as const

export function StepOccasion({ state, dispatch }: StepProps) {
  const t = useTranslations('configurator')
  return (
    <fieldset className="cfg-field">
      <legend className="cfg-legend">{t('step.occasion')}</legend>
      <div className="cfg-cards">
        {OCCASIONS.map((o) => (
          <button
            key={o}
            type="button"
            className="cfg-card"
            aria-pressed={state.occasion === o}
            onClick={() => dispatch({ type: 'set', patch: { occasion: o } })}
          >
            {t(`occasion.${o}`)}
          </button>
        ))}
      </div>
      {state.occasion === 'boda' && <p className="cfg-note">{t('occasion.bodaNote')}</p>}
    </fieldset>
  )
}

/* ---- 2 · Size -------------------------------------------------------- */

export function StepSize({ state, dispatch, locale, sizes }: StepProps) {
  const t = useTranslations('configurator')
  const cakes = useTranslations('cakes')

  return (
    <fieldset className="cfg-field">
      <legend className="cfg-legend">{t('step.size')}</legend>
      <div className="cfg-cards cfg-cards--wide">
        {sizes.map((size) => (
          <button
            key={size.id}
            type="button"
            className="cfg-card cfg-card--size"
            aria-pressed={state.sizeId === size.id}
            onClick={() =>
              dispatch({
                type: 'set',
                patch: {
                  sizeId: size.id,
                  // Two- and three-tier sizes imply their tier count.
                  tiers: size.maxTiers,
                },
              })
            }
          >
            <span className="cfg-card__title">{size.label}</span>
            <span className="cfg-card__meta">
              {t('serves', { min: size.servingsMin, max: size.servingsMax })}
            </span>
            <span className="cfg-card__price tabular" data-provisional="true">
              {cakes('fromPrice', { price: formatMoney(size.basePriceCents, locale) })}
            </span>
            <span className="cfg-card__lead">
              {cakes('noticeDays', { days: leadDays(size.minLeadHours) })}
            </span>
          </button>
        ))}
      </div>
    </fieldset>
  )
}

/* ---- 3 · Flavour and filling ---------------------------------------- */

function OptionGroup({
  group,
  label,
  value,
  onChange,
  options,
  locale,
}: {
  group: string
  label: string
  value: string | null
  onChange: (slug: string) => void
  options: CakeOption[]
  locale: Locale
}) {
  const t = useTranslations('configurator')
  const inGroup = options.filter((o) => o.optionGroup === group)

  return (
    <fieldset className="cfg-group">
      <legend className="cfg-group__legend">{label}</legend>
      <div className="cfg-chips">
        {inGroup.map((o) => (
          <label key={o.id} className="cfg-chip">
            <input
              type="radio"
              name={group}
              value={o.slug}
              checked={value === o.slug}
              onChange={() => onChange(o.slug)}
            />
            <span className="cfg-chip__label">{o.label}</span>
            {o.priceDeltaCents > 0 && (
              <span className="cfg-chip__delta tabular">
                +{formatMoney(o.priceDeltaCents, locale)}
              </span>
            )}
            {o.extraLeadHours > 0 && (
              <span className="cfg-chip__lead">
                {t('extraDays', { days: leadDays(o.extraLeadHours) })}
              </span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

export function StepFlavor({ state, dispatch, options, locale }: StepProps) {
  const t = useTranslations('configurator')
  return (
    <div className="cfg-field">
      <OptionGroup
        group="flavor"
        label={t('group.flavor')}
        value={state.flavor}
        onChange={(slug) => dispatch({ type: 'set', patch: { flavor: slug } })}
        options={options}
        locale={locale}
      />
      <OptionGroup
        group="filling"
        label={t('group.filling')}
        value={state.filling}
        onChange={(slug) => dispatch({ type: 'set', patch: { filling: slug } })}
        options={options}
        locale={locale}
      />
    </div>
  )
}

/* ---- 4 · Decoration -------------------------------------------------- */

export function StepDecoration({ state, dispatch, options, locale }: StepProps) {
  const t = useTranslations('configurator')
  const [uploadError, setUploadError] = useState<string | null>(null)

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // First line of defence only. The real check is server-side MIME
    // sniffing — a .pdf renamed to .jpg passes this and fails there.
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(t('upload.tooBig'))
      e.target.value = ''
      return
    }
    if (!ALLOWED_UPLOAD_TYPES.includes(file.type as (typeof ALLOWED_UPLOAD_TYPES)[number])) {
      setUploadError(t('upload.wrongType'))
      e.target.value = ''
      return
    }
    setUploadError(null)
    dispatch({ type: 'set', patch: { referenceImageName: file.name } })
  }

  return (
    <div className="cfg-field">
      <OptionGroup
        group="frosting"
        label={t('group.frosting')}
        value={state.frosting}
        onChange={(slug) => dispatch({ type: 'set', patch: { frosting: slug } })}
        options={options}
        locale={locale}
      />
      <OptionGroup
        group="finish"
        label={t('group.finish')}
        value={state.finish}
        onChange={(slug) => dispatch({ type: 'set', patch: { finish: slug } })}
        options={options}
        locale={locale}
      />

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-inscription">
          {t('inscription')}
        </label>
        <input
          id="cfg-inscription"
          className="cfg-input"
          maxLength={120}
          value={state.inscription}
          onChange={(e) => dispatch({ type: 'set', patch: { inscription: e.target.value } })}
          placeholder={t('inscriptionPlaceholder')}
          /* The language of the inscription, so accents render on the
             ticket and a screen reader pronounces it correctly. */
          lang={state.inscriptionLang}
        />
        <p className="cfg-counter tabular" aria-live="polite">
          {state.inscription.length} / 120
        </p>

        <div className="cfg-inline">
          <span className="cfg-label">{t('inscriptionLang')}</span>
          {(['es', 'en'] as const).map((l) => (
            <label key={l} className="cfg-chip cfg-chip--sm">
              <input
                type="radio"
                name="inscriptionLang"
                checked={state.inscriptionLang === l}
                onChange={() => dispatch({ type: 'set', patch: { inscriptionLang: l } })}
              />
              <span className="cfg-chip__label">{l.toUpperCase()}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-colors">
          {t('colorNotes')}
        </label>
        <input
          id="cfg-colors"
          className="cfg-input"
          maxLength={300}
          value={state.colorNotes}
          onChange={(e) => dispatch({ type: 'set', patch: { colorNotes: e.target.value } })}
          placeholder={t('colorNotesPlaceholder')}
        />
      </div>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-ref">
          {t('upload.label')}
        </label>
        <input
          id="cfg-ref"
          className="cfg-input"
          type="file"
          accept={ALLOWED_UPLOAD_TYPES.join(',')}
          onChange={onFile}
        />
        <p className="cfg-help">{t('upload.help')}</p>
        {state.referenceImageName && (
          <p className="cfg-help">{state.referenceImageName}</p>
        )}
        {uploadError && (
          <p className="cfg-error" role="alert">
            {uploadError}
          </p>
        )}
      </div>
    </div>
  )
}

/* ---- 5 · Pickup ------------------------------------------------------ */

function reasonText(
  reasons: UnavailableReason[],
  t: ReturnType<typeof useTranslations<'configurator'>>,
): string | null {
  const r = reasons[0]
  if (!r) return null
  switch (r.code) {
    case 'lead':
      return t('reason.lead', { days: r.days })
    case 'blackout':
      return t('reason.blackout')
    case 'closed':
      return t('reason.closed')
    case 'tooFar':
      return t('reason.tooFar', { days: r.maxAdvanceDays })
    case 'full':
      return t('reason.full')
  }
}

export function StepPickup({
  state,
  dispatch,
  locale,
  availability,
  loading,
}: StepProps & { availability: AvailabilityResult | null; loading: boolean }) {
  const t = useTranslations('configurator')

  if (loading || !availability) {
    return <p className="cfg-loading">{t('loadingSlots')}</p>
  }

  return (
    <fieldset className="cfg-field">
      <legend className="cfg-legend">{t('step.pickup')}</legend>
      {/* Say the timezone out loud, once. */}
      <p className="cfg-note">{t('richmondTime')}</p>
      <p className="cfg-note">
        {t('leadSummary', { days: Math.ceil(availability.requiredLeadHours / 24) })}
      </p>

      <ul className="cfg-days">
        {availability.dates.map((day) => {
          const reason = reasonText(day.reasons, t)
          const open = day.slots.filter((s) => s.isAvailable)
          return (
            <li key={day.date} className="cfg-day" data-unavailable={reason ? '' : undefined}>
              <h3 className="cfg-day__date">
                {new Date(`${day.date}T12:00:00Z`).toLocaleDateString(
                  locale === 'es' ? 'es-US' : 'en-US',
                  { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' },
                )}
              </h3>
              {/* Never grey out a date without saying why. */}
              {reason ? (
                <p className="cfg-day__reason">{reason}</p>
              ) : (
                <ul className="cfg-slots">
                  {open.map((slot) => (
                    <li key={slot.startsAtUtc}>
                      <button
                        type="button"
                        className="cfg-slot"
                        aria-pressed={state.pickupAt === slot.startsAtUtc}
                        onClick={() =>
                          dispatch({ type: 'set', patch: { pickupAt: slot.startsAtUtc } })
                        }
                      >
                        {formatWallTime(slot.startsAt, locale)}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </fieldset>
  )
}

/* ---- 6 · Contact ----------------------------------------------------- */

export function StepContact({ state, dispatch }: StepProps) {
  const t = useTranslations('configurator')

  return (
    <fieldset className="cfg-field">
      <legend className="cfg-legend">{t('step.contact')}</legend>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-name">
          {t('name')}
        </label>
        <input
          id="cfg-name"
          className="cfg-input"
          required
          autoComplete="name"
          value={state.contactName}
          onChange={(e) => dispatch({ type: 'set', patch: { contactName: e.target.value } })}
        />
      </div>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-phone">
          {t('phone')}
        </label>
        <input
          id="cfg-phone"
          className="cfg-input"
          type="tel"
          required
          autoComplete="tel"
          value={state.contactPhone}
          onChange={(e) => dispatch({ type: 'set', patch: { contactPhone: e.target.value } })}
        />
      </div>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-email">
          {t('email')}
        </label>
        <input
          id="cfg-email"
          className="cfg-input"
          type="email"
          autoComplete="email"
          value={state.contactEmail}
          onChange={(e) => dispatch({ type: 'set', patch: { contactEmail: e.target.value } })}
        />
      </div>

      <div className="cfg-group">
        <label className="cfg-label" htmlFor="cfg-allergy">
          {t('allergy')}
        </label>
        <input
          id="cfg-allergy"
          className="cfg-input"
          value={state.allergyNote}
          onChange={(e) => dispatch({ type: 'set', patch: { allergyNote: e.target.value } })}
        />
      </div>

      {/* TCPA: unchecked by default, disclosure visible, not behind a link. */}
      <div className="cfg-group cfg-optin">
        <label className="cfg-optin__row">
          <input
            type="checkbox"
            checked={state.smsOptIn}
            onChange={(e) => dispatch({ type: 'set', patch: { smsOptIn: e.target.checked } })}
          />
          <span>{t('smsOptIn')}</span>
        </label>
        <p className="cfg-help">{t('smsDisclosure')}</p>
      </div>
    </fieldset>
  )
}

/* ---- 7 · Review ------------------------------------------------------ */

export function StepReview({
  state,
  locale,
  sizes,
  options,
  depositPct,
  cancelFullHours,
  cancelPartialHours,
  partialPct,
}: StepProps & {
  depositPct: number
  cancelFullHours: number
  cancelPartialHours: number
  partialPct: number
}) {
  const t = useTranslations('configurator')
  const size = sizes.find((s) => s.id === state.sizeId)
  const chosen = [state.flavor, state.filling, state.frosting, state.finish]
    .map((slug) => options.find((o) => o.slug === slug)?.label)
    .filter(Boolean)

  return (
    <div className="cfg-field">
      <h2 className="cfg-legend">{t('step.review')}</h2>
      <dl className="cfg-review">
        <div>
          <dt>{t('step.occasion')}</dt>
          <dd>{state.occasion ? t(`occasion.${state.occasion}`) : '—'}</dd>
        </div>
        <div>
          <dt>{t('step.size')}</dt>
          <dd>{size?.label ?? '—'}</dd>
        </div>
        <div>
          <dt>{t('summaryOptions')}</dt>
          <dd>{chosen.join(' · ') || '—'}</dd>
        </div>
        {state.inscription && (
          <div>
            <dt>{t('inscription')}</dt>
            <dd lang={state.inscriptionLang}>{state.inscription}</dd>
          </div>
        )}
        {state.colorNotes && (
          <div>
            <dt>{t('colorNotes')}</dt>
            <dd>{state.colorNotes}</dd>
          </div>
        )}
        <div>
          <dt>{t('step.pickup')}</dt>
          <dd>
            {state.pickupAt
              ? new Date(state.pickupAt).toLocaleString(locale === 'es' ? 'es-US' : 'en-US', {
                  timeZone: 'America/New_York',
                  dateStyle: 'full',
                  timeStyle: 'short',
                })
              : '—'}
          </dd>
        </div>
        <div>
          <dt>{t('step.contact')}</dt>
          <dd>
            {state.contactName} · {state.contactPhone}
            {state.contactEmail ? ` · ${state.contactEmail}` : ''}
          </dd>
        </div>
      </dl>

      {/* The policy in plain language, above the button. */}
      <p className="cfg-policy">
        {state.occasion === 'boda'
          ? t('quotePolicy')
          : t('policy', {
              pct: depositPct,
              fullHours: cancelFullHours,
              partialHours: cancelPartialHours,
              partialPct,
            })}
      </p>
    </div>
  )
}

/** Re-run availability whenever anything that moves the lead time changes. */
export function useAvailability({
  sizeId,
  tiers,
  optionSlugs,
  enabled,
}: {
  sizeId: string | null
  tiers: number
  optionSlugs: string[]
  enabled: boolean
}) {
  const [data, setData] = useState<AvailabilityResult | null>(null)
  const [loading, setLoading] = useState(false)
  const key = `${sizeId}|${tiers}|${optionSlugs.join(',')}`

  useEffect(() => {
    if (!enabled || !sizeId) return
    let cancelled = false
    setLoading(true)

    const params = new URLSearchParams({
      orderType: 'cake',
      days: '21',
      sizeId,
      tiers: String(tiers),
      options: optionSlugs.join(','),
    })

    void fetch(`/api/availability?${params}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (!cancelled) setData(json)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
    // `key` collapses the dependency set into one comparable string.
  }, [key, enabled, sizeId, tiers, optionSlugs])

  return { data, loading }
}
