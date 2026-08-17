import {
  ShieldCheck,
  UserPlus,
  Bell,
  Megaphone,
  Fingerprint,
  Mail,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import { getSettings, getEnabledProviders } from '@/lib/settings'
import { emailConfigured } from '@/lib/email/send'
import { AdminPageHeader, Card, SectionHead } from '@/components/admin/ui'
import {
  VerificationPicker,
  SocialToggles,
  AnnouncementForm,
  RegistrationSwitch,
  HomeworkSwitch,
  FeedbackSwitch,
  OwnerSaleSwitch,
} from '@/components/admin/settings-forms'
import { site } from '@/lib/site'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Settings', robots: { index: false } }

export default async function AdminSettings() {
  const [settings, providers] = await Promise.all([getSettings(), getEnabledProviders()])
  const mailReady = emailConfigured()

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        subtitle="Change how the site behaves — no developer needed."
      />

      {!mailReady && (
        <div className="flex items-start gap-3 rounded-2xl border border-gold/40 bg-tile-amber px-5 py-4">
          <Mail className="mt-0.5 h-4 w-4 shrink-0 text-gold-deep" aria-hidden />
          <p className="text-sm text-ink-soft">
            <strong className="text-ink">Email is not connected.</strong> Codes,
            links and notifications will not send until the Resend key is set on
            the server. Everything below still saves.
          </p>
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <Card>
            <SectionHead title="First time a parent signs in" />
            <VerificationPicker current={settings.firstLoginVerification} />
          </Card>

          <Card>
            <SectionHead title="Social sign-in" />
            <SocialToggles chosen={settings.socialProviders} available={providers} />
          </Card>
        </div>

        <div className="space-y-5">
          <Card>
            <SectionHead title="Accounts" />
            <div className="divide-y divide-line">
              <RegistrationSwitch checked={settings.allowRegistration} />
            </div>
          </Card>

          <Card>
            <SectionHead title="Email notifications" />
            <div className="divide-y divide-line">
              <HomeworkSwitch checked={settings.notifyHomework} />
              <FeedbackSwitch checked={settings.notifyFeedback} />
              <OwnerSaleSwitch checked={settings.notifyOwnerSale} />
            </div>
          </Card>

          <Card>
            <SectionHead title="Announcement bar" />
            <AnnouncementForm
              enabled={settings.announcementEnabled}
              text={settings.announcementText}
            />
          </Card>
        </div>
      </div>

      {/* What is wired up, stated plainly rather than assumed. */}
      <Card>
        <SectionHead title="How sign-in works now" />
        <ul className="divide-y divide-line">
          {[
            {
              icon: ShieldCheck,
              tile: 'bg-tile-sky text-teal',
              title: 'One check, once',
              body:
                settings.firstLoginVerification === 'off'
                  ? 'Turned off — new accounts work immediately.'
                  : `A new parent ${
                      settings.firstLoginVerification === 'code'
                        ? 'enters a code from their email'
                        : 'taps a link in their email'
                    }. After that, every sign-in is just email and password.`,
            },
            {
              icon: Mail,
              tile: 'bg-tile-mint text-success',
              title: 'Your emails, not Supabase’s',
              body: `Codes, sign-in links and password resets are sent from ${site.contact.email} using your own template, and the links point at your domain.`,
            },
            {
              icon: Fingerprint,
              tile: 'bg-tile-violet text-ink-soft',
              title: 'Social accounts skip the check',
              body:
                providers.length > 0
                  ? 'Google and Facebook already prove the address, so those accounts go straight in.'
                  : 'Nothing configured yet — enable a provider in Supabase to use this.',
            },
            {
              icon: UserPlus,
              tile: 'bg-tile-rose text-coral',
              title: 'Invite codes still work',
              body:
                'A code entered at sign-up is held safely and redeemed the moment the account is verified, so it is never lost along the way.',
            },
          ].map((r) => (
            <li key={r.title} className="flex items-start gap-3 px-5 py-4">
              <span className={`tile h-9 w-9 shrink-0 ${r.tile}`}>
                <r.icon className="h-4 w-4" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">{r.title}</span>
                <span className="mt-0.5 block text-xs leading-relaxed text-ink-soft">
                  {r.body}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionHead title="Connections" />
        <ul className="divide-y divide-line">
          {[
            { label: 'Transactional email (Resend)', on: mailReady },
            {
              label: 'Google sign-in configured in Supabase',
              on: providers.includes('google'),
            },
            {
              label: 'Facebook sign-in configured in Supabase',
              on: providers.includes('facebook'),
            },
            { label: 'Announcement bar showing', on: settings.announcementEnabled },
            { label: 'New sign-ups open', on: settings.allowRegistration },
          ].map((r) => (
            <li key={r.label} className="flex items-center gap-3 px-5 py-3">
              {r.on ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />
              ) : (
                <XCircle className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden />
              )}
              <span className="flex-1 text-sm text-ink-soft">{r.label}</span>
              <span
                className={`text-xs font-bold ${r.on ? 'text-success' : 'text-ink-muted'}`}
              >
                {r.on ? 'Yes' : 'No'}
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="flex items-start gap-3 rounded-2xl border border-line bg-surface px-5 py-4">
        <Megaphone className="mt-0.5 h-4 w-4 shrink-0 text-teal" aria-hidden />
        <p className="text-xs leading-relaxed text-ink-soft">
          <strong className="text-ink">A note on the &ldquo;no check&rdquo; option.</strong>{' '}
          Supabase is set to require a confirmed email address. Choosing
          &ldquo;no check&rdquo; works around that by marking new accounts
          confirmed as they are created — so it genuinely skips the step, but a
          parent who mistypes their address will never receive homework emails
          and there is no way to tell. Leave it on &ldquo;enter a code&rdquo;
          unless you have a reason not to.
        </p>
      </div>
    </div>
  )
}
