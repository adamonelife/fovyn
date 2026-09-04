import {FormEvent,useState} from 'react';
import {Eye,EyeOff,Leaf,RefreshCw} from 'lucide-react';
import {supabase} from './supabase';
import {friendlyAuthErrorKey,generatePassword,passwordIsValid,passwordPolicy,passwordRequirements} from './authValidation';
import {useTranslation} from 'react-i18next';

export default function AuthHome(){
  const{t}=useTranslation();
  const[mode,setMode]=useState<'signin'|'signup'>('signin');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[confirmationPassword,setConfirmationPassword]=useState('');
  const[showPassword,setShowPassword]=useState(false);
  const[confirmation,setConfirmation]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  const signIn=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);
    setError('');
    const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)setError(t(friendlyAuthErrorKey(error.message)));
    setBusy(false);
  };

  const signUp=async(event:FormEvent)=>{
    event.preventDefault();
    setError('');
    setConfirmation('');
    if(!passwordIsValid(password)){
      setError(t('auth.signUp.invalidPassword'));
      return;
    }
    if(password!==confirmationPassword){
      setError(t('auth.signUp.passwordMismatch'));
      return;
    }
    setBusy(true);
    const{data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{emailRedirectTo:`${location.origin}/auth/callback`}});
    if(error)setError(t(friendlyAuthErrorKey(error.message)));
    else if(!data.session)setConfirmation(t('auth.signUp.confirmation',{email:email.trim()}));
    setBusy(false);
  };

  const changeMode=(next:'signin'|'signup')=>{
    setMode(next);
    setPassword('');
    setConfirmationPassword('');
    setShowPassword(false);
    setError('');
    setConfirmation('');
  };

  const fillGeneratedPassword=()=>{
    const generated=generatePassword();
    setPassword(generated);
    setConfirmationPassword(generated);
    setShowPassword(true);
    setError('');
  };

  return <main className="auth-home">
    <section className="auth-brand">
      <img src="/brand/forbair-mark.png" alt="Fovyn growing F"/>
      <div><span>{t('brand.name')}</span><small>{t('brand.tagline')}</small></div>
    </section>
    <section className="auth-card">
      <Leaf/>
      <p className="eyebrow">{mode==='signin'?t('auth.signIn.eyebrow'):t('auth.signUp.eyebrow')}</p>
      <h1>{mode==='signin'?t('auth.signIn.title'):t('auth.signUp.title')}</h1>

      <form onSubmit={mode==='signin'?signIn:signUp}>
        <label>{t('auth.email')}<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
        <label>{t('auth.passwordLabel')}<span className="password-input-wrap"><input autoComplete={mode==='signin'?'current-password':'new-password'} type={showPassword?'text':'password'} required value={password} onChange={event=>setPassword(event.target.value)}/><button type="button" aria-label={showPassword?t('auth.password.hide'):t('auth.password.show')} onClick={()=>setShowPassword(!showPassword)}>{showPassword?<EyeOff/>:<Eye/>}</button></span></label>
        {mode==='signup'&&<><button type="button" className="generate-password" onClick={fillGeneratedPassword}><RefreshCw/> {password?t('auth.signUp.regenerate'):t('auth.signUp.generate')}</button><label>{t('auth.confirmPassword')}<span className="password-input-wrap"><input autoComplete="new-password" type={showPassword?'text':'password'} required value={confirmationPassword} onChange={event=>setConfirmationPassword(event.target.value)}/></span></label></>}
        {mode==='signup'&&<ul className="password-requirements" aria-label={t('auth.signUp.passwordRequirements')}>{passwordRequirements.map(requirement=><li className={requirement.test(password)?'met':''} key={requirement.key}>{t(`auth.password.${requirement.key}`,{count:passwordPolicy.minimumLength})}</li>)}</ul>}
        {error&&<p className="goal-error" role="alert">{error}</p>}
        {confirmation&&<p className="auth-confirmation" role="status">{confirmation}</p>}
        <button disabled={busy||!email.trim()||!password||(mode==='signup'&&(!passwordIsValid(password)||password!==confirmationPassword))}>{busy?(mode==='signin'?t('auth.signIn.busy'):t('auth.signUp.busy')):(mode==='signin'?t('auth.signIn.action'):t('auth.signUp.action'))}</button>
      </form>
      <button type="button" className="auth-switch" onClick={()=>changeMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?t('auth.signIn.switch'):t('auth.signUp.switch')}</button>
    </section>
  </main>;
}
