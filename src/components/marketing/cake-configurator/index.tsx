'use client'

import { useEffect, useReducer, useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'motion/react'
import { useReducedMotion } from '@/components/motion/use-reduced-motion'
import { submitCakeOrder, type SubmitResult } from '@/app/[locale]/pasteles/pedir/actions'
import type { CakeOption, CakeSize, Locale } from '@/lib/data/types'
import {
  STEPS,
  canAdvance,
  clearPersisted,
  initialState,
  persist,
  reducer,
  restore,
  selectedSlugs,
} from './state'
import {
  StepOccasion,
  StepSize,
  StepFlavor,
  StepDecoration,
  StepPickup,
  StepContact,
  StepReview,
  useAvailability,
} from './steps'
import { PriceSummary } from './price-summary'

/**
 * The seven-step configurator.
 *
 * State lives in one reducer and is mirrored to sessionStorage, so a
 * phone call mid-order does not lose the work. The step change is
 * announced to screen readers through a live region, and the active step
 * carries `aria-current="step"`.
 *
 * Under reduced motion the stepper still advances — it just does not
 * slide. DESIGN.md §7: every move needs an off-ramp, and "no animation"
 * is not the same as "no progress".
 */
export function CakeConfigurator({
  locale,
  sizes,
  options,
  taxRate,
  depositPct,
  cancelFullHours,
  cancelPartialHours,
  partialPct,
}: {
  locale: Locale
  sizes: CakeSize[]
  options: CakeOption[]
  taxRate: number
  depositPct: number
  cancelFullHours: number
  cancelPartialHours: number
  partialPct: number
}) {
  const t = useTranslations('configurator')
  const router = useRouter()
  const reduced = useReducedMotion()
  const [state, dispatch] = useReducer(reducer, initialState)
  const [hydrated, setHydrated] = useState(false)
  const [result, setResult] = useState<SubmitResult | null>(null)
  const [pending, startTransition] = useTransition()
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Restore before first paint of the interactive steps.
  useEffect(() => {
    const saved = restore()
    if (saved) dispatch({ type: 'restore', state: saved })
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated) persist(state)
  }, [state, hydrated])

  // Move focus to the step heading so a keyboard user is not stranded.
  useEffect(() => {
    if (hydrated) headingRef.current?.focus()
  }, [state.step, hydrated])

  const slugs = selectedSlugs(state)
  const { data: availability, loading } = useAvailability({
    sizeId: state.sizeId,
    tiers: state.tiers,
    optionSlugs: slugs,
    enabled: STEPS[state.step] === 'pickup' || STEPS[state.step] === 'review',
  })

  const stepId = STEPS[state.step]
  const isLast = state.step === STEPS.length - 1
  const stepProps = { state, dispatch, locale, sizes, options }

  function submit() {
    startTransition(async () => {
      const payload = {
        occasion: state.occasion,
        sizeId: state.sizeId,
        tiers: state.tiers,
        optionSlugs: slugs,
        inscription: state.inscription || null,
        inscriptionLang: state.inscriptionLang,
        colorNotes: state.colorNotes || null,
        referenceImageName: state.referenceImageName,
        pickupAt: state.pickupAt,
        contactName: state.contactName,
        contactPhone: state.contactPhone,
        contactEmail: state.contactEmail || null,
        allergyNote: state.allergyNote || null,
        smsOptIn: state.smsOptIn,
        locale,
      }

      const res = await submitCakeOrder(payload)
      setResult(res)

      if (res.ok) {
        clearPersisted()
        // A wedding is a quote: no charge, straight to the status page.
        router.push(res.isQuote ? `/${locale}/pedido/${res.orderNumber}` : res.payHref)
      }
    })
  }

  return (
    <div className="cfg">
      <div className="cfg__main">
        {/* Progress. `aria-current` marks the active step. */}
        <ol className="cfg-steps" aria-label={t('progress')}>
          {STEPS.map((id, i) => (
            <li
              key={id}
              className="cfg-steps__item"
              aria-current={i === state.step ? 'step' : undefined}
              data-done={i < state.step || undefined}
            >
              <span className="visually-hidden">{t(`step.${id}`)}</span>
              <span aria-hidden="true">{i + 1}</span>
            </li>
          ))}
        </ol>

        <p className="visually-hidden" aria-live="polite">
          {t('stepAnnounce', {
            current: state.step + 1,
            total: STEPS.length,
            name: t(`step.${stepId}`),
          })}
        </p>

        <h2 ref={headingRef} tabIndex={-1} className="cfg__heading">
          {t(`step.${stepId}`)}
        </h2>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={stepId}
            initial={reduced ? false : { opacity: 0, x: state.direction * 24 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduced ? undefined : { opacity: 0, x: state.direction * -24 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            {stepId === 'occasion' && <StepOccasion {...stepProps} />}
            {stepId === 'size' && <StepSize {...stepProps} />}
            {stepId === 'flavor' && <StepFlavor {...stepProps} />}
            {stepId === 'decoration' && <StepDecoration {...stepProps} />}
            {stepId === 'pickup' && (
              <StepPickup {...stepProps} availability={availability} loading={loading} />
            )}
            {stepId === 'contact' && <StepContact {...stepProps} />}
            {stepId === 'review' && (
              <StepReview
                {...stepProps}
                depositPct={depositPct}
                cancelFullHours={cancelFullHours}
                cancelPartialHours={cancelPartialHours}
                partialPct={partialPct}
              />
            )}
          </motion.div>
        </AnimatePresence>

        {result && !result.ok && (
          <div className="cfg-error" role="alert">
            {result.error === 'slot_taken' && (
              <>
                <p>{t('error.slotTaken')}</p>
                <ul className="cfg-alts">
                  {result.alternatives.map((alt) => (
                    <li key={alt.startsAtUtc}>
                      <button
                        type="button"
                        className="cfg-slot"
                        onClick={() => {
                          dispatch({ type: 'set', patch: { pickupAt: alt.startsAtUtc } })
                          setResult(null)
                        }}
                      >
                        {alt.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {result.error === 'lead_time' && (
              <p>{t('error.leadTime', { days: Math.ceil(result.requiredHours / 24) })}</p>
            )}
            {result.error === 'invalid' && <p>{t('error.invalid')}</p>}
          </div>
        )}

        <div className="cfg-nav">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => dispatch({ type: 'back' })}
            disabled={state.step === 0 || pending}
          >
            {t('back')}
          </button>

          {isLast ? (
            <button
              type="button"
              className="btn btn--primary"
              onClick={submit}
              disabled={pending || !canAdvance(state)}
            >
              {pending
                ? t('submitting')
                : state.occasion === 'boda'
                  ? t('requestQuote')
                  : t('payDeposit')}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => dispatch({ type: 'next' })}
              disabled={!canAdvance(state)}
            >
              {t('next')}
            </button>
          )}
        </div>
      </div>

      <PriceSummary
        state={state}
        sizes={sizes}
        options={options}
        locale={locale}
        taxRate={taxRate}
        depositPct={depositPct}
      />
    </div>
  )
}
