import { BadgeCheck, LockKeyhole, Scan, ShieldCheck, Truck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import RegisterForm from '../../components/register/registerForm';

const benefitDefs = [
  {
    icon: Scan,
    titleKey: 'register.benefit1Title',
    descKey: 'register.benefit1Desc',
  },
  {
    icon: ShieldCheck,
    titleKey: 'register.benefit2Title',
    descKey: 'register.benefit2Desc',
  },
  {
    icon: Truck,
    titleKey: 'register.benefit3Title',
    descKey: 'register.benefit3Desc',
  },
] as const;

export default function RegisterPage() {
  const { t } = useTranslation('auth');
  return (
    <div className="flex min-h-screen flex-col">
      <main className="flex flex-1 items-center justify-center bg-[linear-gradient(135deg,#eaf0fb_0%,#f3f7fb_60%,#f0f2fc_100%)] px-5 py-8 text-slate-900 sm:px-9">
        <div className="grid w-full max-w-[1100px] items-center gap-8 min-[900px]:grid-cols-[0.82fr_1.18fr] min-[900px]:gap-12">
          <section
            className="mx-auto w-full max-w-[440px] min-[900px]:mx-0"
            aria-labelledby="register-intro-title"
          >
            <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold tracking-wide text-blue-600">
              <span className="size-1.5 rounded-full bg-blue-600" aria-hidden="true" />
              {t('register.badge')}
            </span>
            <h1
              id="register-intro-title"
              className="mt-3 mb-2 text-[30px] leading-tight font-bold sm:text-4xl"
            >
              {t('register.titlePrefix')} <span className="text-blue-600">NEXUS</span>
            </h1>
            <p className="max-w-[380px] text-sm leading-[1.65] text-slate-600">
              {t('register.subtitle')}
            </p>

            <div className="mt-8 flex flex-col gap-4">
              {benefitDefs.map(({ icon: Icon, titleKey, descKey }) => (
                <div className="flex items-start gap-4" key={titleKey}>
                  <span className="flex h-8 w-7 shrink-0 items-center justify-center text-blue-600">
                    <Icon size={17} strokeWidth={1.8} aria-hidden="true" />
                  </span>
                  <div>
                    <h2 className="mb-0.5 text-sm leading-5 font-semibold">{t(titleKey)}</h2>
                    <p className="max-w-[325px] text-xs leading-[1.65] text-slate-500">
                      {t(descKey)}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-slate-200 pt-4 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <LockKeyhole size={12} className="text-emerald-600" aria-hidden="true" />
                {t('register.sslBadge')}
              </span>
              <span className="text-slate-300" aria-hidden="true">
                •
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck size={13} className="text-blue-600" aria-hidden="true" />
                {t('register.securityBadge')}
              </span>
            </div>
          </section>

          <RegisterForm />
        </div>
      </main>
    </div>
  );
}
