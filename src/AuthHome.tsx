import {FormEvent,useState} from 'react';
import {Leaf} from 'lucide-react';
import {supabase} from './supabase';

export default function AuthHome(){
  const[email,setEmail]=useState('');
  const[password,setPassword]=useState('');
  const[error,setError]=useState('');
  const[busy,setBusy]=useState(false);

  const signIn=async(event:FormEvent)=>{
    event.preventDefault();
    setBusy(true);
    setError('');
    const{error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
    if(error)setError(error.message);
    setBusy(false);
  };

  return <main className="auth-home">
    <section className="auth-brand">
      <img src="/brand/forbair-mark.png" alt="Fovyn growing F"/>
      <div><span>Fovyn</span><small>Grow More Good Days.</small></div>
    </section>
    <section className="auth-card">
      <Leaf/>
      <p className="eyebrow">WELCOME HOME</p>
      <h1>Sign in to Fovyn.</h1>

      <form onSubmit={signIn}>
        <label>Email<input autoComplete="email" inputMode="email" type="email" required value={email} onChange={event=>setEmail(event.target.value)}/></label>
        <label>Password<input autoComplete="current-password" type="password" required value={password} onChange={event=>setPassword(event.target.value)}/></label>
        {error&&<p className="goal-error" role="alert">{error}</p>}
        <button disabled={busy||!email.trim()||!password}>{busy?'Signing in…':'Sign in'}</button>
      </form>
    </section>
  </main>;
}
