import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'

export interface FaqEntry {
  q: string
  a: string
}

/**
 * The FAQ, and the single source for the FAQPage JSON-LD.
 *
 * The visible text and the structured data come from the SAME array, so
 * they cannot drift — Google treats a mismatch between them as
 * deceptive markup, and it is a manual-action risk.
 */
export function FaqAccordion({ entries }: { entries: FaqEntry[] }) {
  return (
    <Accordion type="single" collapsible className="faq">
      {entries.map((entry, i) => (
        <AccordionItem key={entry.q} value={`faq-${i}`}>
          <AccordionTrigger>{entry.q}</AccordionTrigger>
          <AccordionContent>{entry.a}</AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}

export function faqJsonLd(entries: FaqEntry[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.q,
      acceptedAnswer: { '@type': 'Answer', text: entry.a },
    })),
  }
}
