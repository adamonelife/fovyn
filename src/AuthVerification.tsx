import {ArrowRight,Leaf} from 'lucide-react';
import {useTranslation} from 'react-i18next';
import {forestAssetFallback} from './forestAssets';

export default function AuthVerification({session,continueToFovyn}:{session:unknown;continueToFovyn:()=>void}){
  const{t}=useTranslation(),params=new URLSearchParams(location.search),technicalError=params.get('error_description')||params.get('error');
  const background=forestAssetFallback('forest.environment.area.health')?.url;
  if(session===undefined)return <main className="auth-verification auth-verification-loading"><p>{t('auth.accountCreated.loading')}</p></main>;
  if(!session||technicalError)return <main className="auth-verification auth-verification-error"><section><img src="/brand/forbair-mark.png" alt=""/><h1>{t('auth.verificationError.title')}</h1><p>{t('auth.verificationError.message')}</p><button onClick={continueToFovyn}>{t('common.returnHome')}</button></section></main>;
  return <main className="auth-verification auth-verification-success" style={background?{'--auth-forest':`url("${background}")`} as React.CSSProperties:undefined}>
    {import.meta.env.VITE_FOVYN_ENVIRONMENT==='development'&&<div className="development-environment-banner">DEVELOPMENT · DEV DATA</div>}
    <section className="auth-verification-content">
      <header><img src="/brand/forbair-mark.png" alt=""/><strong>{t('brand.name')}</strong><span>{t('brand.successTagline')}</span></header>
      <p className="auth-verification-eyebrow">{t('auth.accountCreated.eyebrow')}</p>
      <h1>{t('auth.accountCreated.title')}</h1>
      <div className="auth-botanical-divider"><i/><Leaf/><i/></div>
      <h2>{t('auth.accountCreated.growthMessage')}</h2>
      <p>{t('auth.accountCreated.supporting')}</p>
      <button onClick={continueToFovyn}>{t('auth.accountCreated.continue')} <ArrowRight/></button>
    </section>
    <footer><Leaf/><span>{t('auth.accountCreated.footerTop')}</span><span>{t('auth.accountCreated.footerBottom')}</span></footer>
  </main>;
}
