import type en from '../messages/en.json'

/**
 * English is the source catalogue and the default locale (client
 * direction — see the note in `routing.ts`). Typing the message keys off
 * `en.json` makes a missing Spanish string a build error.
 *
 * Neither catalogue is machine-translated from the other, and neither is
 * allowed to fall behind.
 */
export type Messages = typeof en

declare module 'next-intl' {
  interface AppConfig {
    Messages: Messages
  }
}
