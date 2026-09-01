import{Wine}from'lucide-react';
import{TrackerCategoryModule}from'./RecoveryModule';

export default function AlcoholModule(props:{query?:string;manage:()=>void}){return <TrackerCategoryModule {...props} module="alcohol" label="Alcohol" emptyDetail="Add an alcohol item under + Add & Manage." Icon={Wine}/>}
