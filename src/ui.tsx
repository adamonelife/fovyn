import type{ReactNode}from'react';
import{ChevronRight,Search}from'lucide-react';

export function PageContainer({children,className=''}:{children:ReactNode;className?:string}){return <div className={`ui-page ${className}`.trim()}>{children}</div>}
export function PageHeader({eyebrow,title,supporting,action}:{eyebrow:string;title:string;supporting?:string;action?:ReactNode}){return <header className="ui-page-header"><div><p className="ui-eyebrow">{eyebrow}</p><h1>{title}</h1>{supporting&&<p className="ui-supporting">{supporting}</p>}</div>{action&&<div className="ui-header-action">{action}</div>}</header>}
export function PageTabs({children,className=''}:{children:ReactNode;className?:string}){return <nav className={`ui-tabs ${className}`.trim()}>{children}</nav>}
export function FilterPills({children,className=''}:{children:ReactNode;className?:string}){return <div className={`ui-filters ${className}`.trim()}>{children}</div>}
export function LogSearch({value,onChange,placeholder='Search what you can log'}:{value:string;onChange:(value:string)=>void;placeholder?:string}){return <label className="ui-log-search"><Search/><input value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder}/></label>}
export function LogSection({title,action,children}:{title:string;action?:ReactNode;children:ReactNode}){return <section className="ui-log-section"><header><h2>{title}</h2>{action}</header>{children}</section>}
export function LogItemCard({icon,meta,title,detail,action,onClick,children}:{icon:ReactNode;meta?:ReactNode;title:string;detail?:ReactNode;action?:ReactNode;onClick?:()=>void;children?:ReactNode}){return <article className="ui-log-card"><button className="ui-log-card-main" onClick={onClick} disabled={!onClick}><span className="ui-log-icon">{icon}</span><span className="ui-log-copy">{meta&&<small>{meta}</small>}<b>{title}</b>{detail&&<span>{detail}</span>}</span>{action??(onClick&&<ChevronRight/>)}</button>{children}</article>}
export function LogEmptyState({icon,title,detail}:{icon:ReactNode;title:string;detail?:string}){return <div className="ui-empty">{icon}<h2>{title}</h2>{detail&&<p>{detail}</p>}</div>}
