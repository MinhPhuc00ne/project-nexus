import { useTranslation } from 'react-i18next';
import { Rotate3d, CheckCircle, ShieldAlert, SquareCheckBig, Shield } from 'lucide-react';
import { formatCurrency } from '../../i18n/formatters';

export default function AuthHeroSection() {
  const { t, i18n } = useTranslation('auth');
  return (
    <div className="[grid-column:span_7_/_span_7] flex flex-col justify-center max-[1024px]:[grid-column:1_/_-1] max-[1024px]:min-w-0">
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 [background-color:#eaf0ff] [border:1px_solid_#d2e0ff] [padding:0.375rem_0.875rem] rounded-full mb-6">
          <div className="w-2 h-2 rounded-full bg-blue-600"></div>
          <span className="text-xs font-bold text-blue-600 [letter-spacing:0.025em] uppercase">
            {t('hero.badge')}
          </span>
        </div>
        <h2 className="[font-size:2.75rem] font-black text-slate-900 [line-height:1.15] mb-4 max-[768px]:[font-size:2rem]">
          {t('hero.titleLine1')}
          <br />
          <span className="[color:#3b5bdb]">{t('hero.titleLine2')}</span>
        </h2>
        <p className="text-slate-500 text-base [max-width:36rem] leading-relaxed">
          {t('hero.subtitle')}
        </p>
      </div>

      <div className="bg-white rounded-2xl [box-shadow:0_10px_25px_-5px_rgba(226,_232,_240,_0.8),_0_8px_10px_-6px_rgba(226,_232,_240,_0.8)] overflow-hidden [border:1px_solid_#f1f5f9] flex mb-10 max-[768px]:flex-col">
        <div className="[background-color:#0b1329] relative [width:40%] p-5 flex flex-col justify-between items-center text-center overflow-hidden [min-height:250px] max-[768px]:w-full">
          <div className="absolute [inset:0] [background:radial-gradient(_ellipse_at_center,_rgba(8,_145,_178,_0.25)_0%,_rgba(15,_23,_42,_0.8)_60%,_#0b1329_100%_)]"></div>

          <div className="relative z-10 w-full flex justify-between items-center">
            <span className="[background-color:rgba(0,_0,_0,_0.45)] [backdrop-filter:blur(8px)] [border:1px_solid_rgba(255,_255,_255,_0.15)] text-white text-[10px] font-semibold [padding:0.25rem_0.625rem] rounded-full flex items-center gap-1">
              {t('hero.live')}
            </span>
            <span className="[background-color:rgba(16,_185,_129,_0.15)] [color:#34d399] [border:1px_solid_rgba(16,_185,_129,_0.3)] text-[10px] font-bold [padding:0.125rem_0.5rem] rounded-full flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full [background-color:#34d399] [animation:pulse-glow_2s_cubic-bezier(0.4,_0,_0.6,_1)_infinite]"></div>{' '}
              {t('hero.liveBid')}
            </span>
          </div>

          <div className="relative z-10 [margin:auto_0] [padding:0.5rem_0]">
            <div className="relative [width:6rem] [height:6rem] [margin:0_auto] flex items-center justify-center">
              <div className="absolute [inset:0] rounded-full [border:2px_dashed_rgba(6,_182,_212,_0.35)] [animation:rotate-360_20s_linear_infinite]"></div>
              <div className="absolute [inset:0.5rem] rounded-full [border:1px_solid_rgba(34,_211,_238,_0.5)]"></div>
              <div className="absolute [inset:1rem] rounded-full [border:2px_solid_rgba(99,_102,_241,_0.4)]"></div>
              <div className="w-8 h-8 rounded-full [background-color:rgba(6,_182,_212,_0.2)] flex items-center justify-center [box-shadow:0_0_15px_rgba(6,_182,_212,_0.6)]">
                <div className="w-3 h-3 rounded-full [background-color:#22d3ee]"></div>
              </div>
            </div>
          </div>

          <div className="relative z-10 w-full">
            <p className="text-slate-400 text-xs font-medium mb-1">Skeleton Tourbillon 3D</p>
            <p className="text-white text-xs font-medium">
              {t('hero.currentPriceLabel')}{' '}
              <span className="[color:#22d3ee] font-bold text-sm">
                {formatCurrency(128500000, i18n.language)}
              </span>
            </p>
          </div>
        </div>

        <div className="p-6 [width:60%] flex flex-col justify-between max-[768px]:w-full">
          <div>
            <div className="flex justify-between items-start mb-2">
              <span className="[background-color:#eef2ff] [color:#3b5bdb] text-[11px] font-bold [padding:0.125rem_0.625rem] rounded uppercase [letter-spacing:0.05em]">
                {t('hero.vipSession')}
              </span>
              <span className="text-xs font-medium text-slate-400 [&_strong]:text-slate-600">
                {t('hero.codeLabel')} <strong>#NX-9982</strong>
              </span>
            </div>

            <h3 className="font-bold text-lg text-slate-900 [line-height:1.35] mb-2">
              {t('hero.sampleTitle')}
            </h3>

            <p className="text-xs text-slate-500 mb-4 leading-relaxed">{t('hero.sampleDesc')}</p>
          </div>

          <div className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-2.5 mb-4 [padding:0.5rem_0.75rem] bg-slate-50 rounded-xl [border:1px_solid_#f1f5f9]">
            <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0]">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {t('hero.bidsLabel')}
              </p>
              <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600">
                {t('hero.bidsValue')}
              </p>
            </div>
            <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0] bordered">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {t('hero.remainingLabel')}
              </p>
              <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600 danger">
                04:18m
              </p>
            </div>
            <div className="text-center [&.bordered]:[border-left:1px_solid_#e2e8f0] [&.bordered]:[border-right:1px_solid_#e2e8f0]">
              <p className="text-[10px] text-slate-400 font-semibold mb-0.5">
                {t('hero.depositLabel')}
              </p>
              <p className="font-bold text-sm text-slate-900 [&.danger]:text-blue-600 [&.success]:text-xs [&.success]:text-emerald-600 success">
                {t('hero.depositValue')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
            <CheckCircle className="w-3.5 h-3.5 text-blue-600 [flex-shrink:0]" />
            <span>{t('hero.loginPrompt')}</span>
          </div>
        </div>
      </div>

      <div className="grid [grid-template-columns:repeat(3,_minmax(0,_1fr))] gap-4 max-[768px]:[grid-template-columns:minmax(0,_1fr)]">
        <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 blue">
            <Rotate3d />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mb-1">{t('hero.feature1Title')}</h4>
          <p className="text-xs text-slate-500 leading-normal">{t('hero.feature1Desc')}</p>
        </div>
        <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 red">
            <ShieldAlert />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mb-1">{t('hero.feature2Title')}</h4>
          <p className="text-xs text-slate-500 leading-normal">{t('hero.feature2Desc')}</p>
        </div>
        <div className="bg-white p-4 rounded-xl [border:1px_solid_#e2e8f0] shadow-sm">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3 [&.blue]:bg-blue-50 [&.blue]:text-blue-600 [&.red]:bg-red-50 [&.red]:text-red-500 [&.green]:bg-green-50 [&.green]:text-green-600 [&_svg]:w-4 [&_svg]:h-4 green">
            <SquareCheckBig />
          </div>
          <h4 className="font-bold text-sm text-slate-900 mb-1">{t('hero.feature3Title')}</h4>
          <p className="text-xs text-slate-500 leading-normal">{t('hero.feature3Desc')}</p>
        </div>
      </div>

      <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
        <Shield className="w-4 h-4 text-slate-400 [flex-shrink:0]" />
        <span>{t('hero.sslFooter')}</span>
      </div>
    </div>
  );
}
