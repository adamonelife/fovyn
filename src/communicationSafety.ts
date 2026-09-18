import type {AppEnvironment} from './appConfig';

export type CommunicationAudience='authenticated_user'|'test_recipient'|'alpha_user';

export function canSendProductCommunication(input:{environment:AppEnvironment;isTest:boolean;audience:CommunicationAudience}){
  if(input.environment==='development')return input.isTest&&input.audience==='test_recipient';
  return !input.isTest&&input.audience!=='test_recipient';
}

export function assertProductCommunicationAllowed(input:{environment:AppEnvironment;isTest:boolean;audience:CommunicationAudience}){
  if(!canSendProductCommunication(input))throw new Error('Product communication blocked by Fovyn environment safety policy.');
}
