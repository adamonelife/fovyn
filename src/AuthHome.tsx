import {FormEvent,useState} from 'react';
import {Leaf} from 'lucide-react';
import {supabase} from './supabase';
import {friendlyAuthError,passwordIsValid,passwordRequirements} from './authValidation';

export default function AuthHome(){
  const[mode,setMode]=useState<'signin'|'signup'>('signin');
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[confirmation,setConfirmation]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  const signIn=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);
    setError('');
    const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)setError(friendlyAuthError(error.message));
    setBusy(false);
  };

  const signUp=async(event:FormEvent)=>{
    event.preventDefault();
    setError('');
    setConfirmation('');
    if(!passwordIsValid(password)){
      setError('Choose a password that meets every requirement below.');
      return;
    }
    setBusy(true);
    const{data,error}=await supabase.auth.signUp({email:email.trim(),password});
    if(error)setError(friendlyAuthError(error.message));
    else if(!data.session)setConfirmation(`We sent a confirmation link to ${email.trim()}. Open it to finish creating your Fovyn account.`);
    setBusy(false);
  };

  const changeMode=(next:'signin'|'signup')=>{
    setMode(next);
    setPassword('');
    setError('');
    setConfirmation('');
  };

  return <main className="auth-home">
    <section className="auth-brand">
      <img src="/brand/forbair-mark.png" alt="Fovyn growing F"/>
      <div><span>Fovyn</span><small>Grow More Good Days.</small></div>
    </section>
    <section className="auth-card">
      <Leaf/>
      <p className="eyebrow">{mode==='signin'?'WELCOME HOME':'WELCOME TO FOVYN'}</p>
      <h1>{mode==='signin'?'Sign in to Fovyn.':'Create your Fovyn account.'}</h1>

      <form onSubmit={mode==='signin'?signIn:signUp}>
        <label>Email<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
        <label>Password<input autoComplete={mode==='signin'?'current-password':'new-password'} type="password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
        {mode==='signup'&&<ul className="password-requirements" aria-label="Password requirements">{passwordRequirements.map(requirement=><li className={requirement.test(password)?'met':''} key={requirement.label}>{requirement.label}</li>)}</ul>}
        {error&&<p className="goal-error" role="alert">{error}</p>}
        {confirmation&&<p className="auth-confirmation" role="status">{confirmation}</p>}
        <button disabled={busy||!email.trim()||!password||(mode==='signup'&&!passwordIsValid(password))}>{busy?(mode==='signin'?'Signing in…':'Creating account…'):(mode==='signin'?'Sign in':'Create account')}</button>
      </form>
      <button type="button" className="auth-switch" onClick={()=>changeMode(mode==='signin'?'signup':'signin')}>{mode==='signin'?'New to Fovyn? Create an account':'Already have an account? Sign in'}</button>
    </section>
  </main>;
}
