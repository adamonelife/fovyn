import i18n from 'i18next';
import {initReactI18next} from 'react-i18next';

const en={
  common:{continue:'Continue',reload:'Reload Fovyn',returnHome:'Return Home',refresh:'Refresh',loading:'Loading…'},
  navigation:{home:'Home',log:'Log',goals:'Goals',history:'History',account:'Account'},
  brand:{name:'Fovyn',tagline:'Grow More Good Days.',successTagline:'Grow a brighter you'},
  auth:{
    email:'Email',passwordLabel:'Password',confirmPassword:'Confirm password',
    signIn:{eyebrow:'Welcome home',title:'Sign in to Fovyn.',action:'Sign in',busy:'Signing in…',switch:'New to Fovyn? Create an account'},
    signUp:{eyebrow:'Welcome to Fovyn',title:'Create your Fovyn account.',action:'Create account',busy:'Creating account…',switch:'Already have an account? Sign in',generate:'Generate secure password',regenerate:'Regenerate password',passwordRequirements:'Password requirements',invalidPassword:'Choose a password that meets every requirement below.',passwordMismatch:'The passwords do not match.',confirmation:'We sent a confirmation link to {{email}}. Open it to finish creating your Fovyn account.'},
    password:{show:'Show password',hide:'Hide password',minimum:'At least {{count}} characters',uppercase:'One uppercase letter',lowercase:'One lowercase letter',number:'One number',symbol:'One symbol'},
    accountCreated:{eyebrow:'Account creation successful',title:'Account creation successful',growthMessage:"Fovyn can't wait to watch you grow.",supporting:"You're now part of a calmer, more intentional way to track what matters and grow a brighter you.",continue:'Continue to Fovyn',footerTop:'Small steps',footerBottom:'A brighter tomorrow',loading:'Finishing your account…'},
    verificationError:{title:'This verification link could not be completed.',message:'The link may have expired or already been used. Return to Fovyn to sign in or request a new confirmation email.'},
    errors:{invalidCredentials:'The email or password is incorrect.',emailNotConfirmed:'Please confirm your email before signing in.',rateLimit:'Please wait a moment before trying again.',generic:'We could not complete that request. Please try again.'}
  },
  analytics:{overview:'Overview',users:'Users',verifiedUsers:'Verified Users',treesPlanted:'Trees Planted',activeGoals:'Active Goals',dormantTrees:'Dormant Trees',heartwoodTrees:'Heartwood Trees',lastSevenDays:'Last 7 Days',newUsers:'New Users',excludedTestTrees:'Excluded Test Trees',help:'Aggregate operational metrics. Test Mode records are excluded.',unavailable:'Analytics counters are unavailable.'}
} as const;

i18n.use(initReactI18next).init({resources:{en:{translation:en}},lng:'en',fallbackLng:'en',supportedLngs:['en'],interpolation:{escapeValue:false},react:{useSuspense:false},saveMissing:import.meta.env.DEV,missingKeyHandler:(_languages:readonly string[],_namespace:string,key:string)=>{if(import.meta.env.DEV)console.warn('Missing localisation key',{key})}});

export const formatLocalDate=(value:Date|string|number,options:Intl.DateTimeFormatOptions={dateStyle:'medium'})=>new Intl.DateTimeFormat(i18n.resolvedLanguage||'en',options).format(new Date(value));
export const formatLocalNumber=(value:number,options?:Intl.NumberFormatOptions)=>new Intl.NumberFormat(i18n.resolvedLanguage||'en',options).format(value);
export const localeCodeForPreference=(preference:string|null|undefined)=>preference?.toLowerCase().startsWith('en')?'en':'en';
export default i18n;
