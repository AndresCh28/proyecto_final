import { createContext,useContext,useEffect,useMemo,useState,type PropsWithChildren } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchMisEspacios,type EspacioTrabajo } from '../lib/espacios'
interface Value{workspace:EspacioTrabajo|null;workspaces:EspacioTrabajo[];loading:boolean;selectWorkspace:(workspace:EspacioTrabajo)=>void;refresh:()=>Promise<void>}
const Context=createContext<Value|undefined>(undefined)
export function WorkspaceProvider({children}:PropsWithChildren){const{profile}=useAuth();const[workspace,setWorkspace]=useState<EspacioTrabajo|null>(null);const[workspaces,setWorkspaces]=useState<EspacioTrabajo[]>([]);const[loading,setLoading]=useState(true)
 async function refresh(){if(!profile){setWorkspaces([]);setWorkspace(null);setLoading(false);return}setLoading(true);try{const rows=await fetchMisEspacios(profile.idUsuario);setWorkspaces(rows);const saved=Number(sessionStorage.getItem('sigecom-workspace')??0);setWorkspace(rows.find((x)=>x.id_espacio===saved)??null)}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[profile?.idUsuario])
 function selectWorkspace(next:EspacioTrabajo){sessionStorage.setItem('sigecom-workspace',String(next.id_espacio));setWorkspace(next)}
 const value=useMemo(()=>({workspace,workspaces,loading,selectWorkspace,refresh}),[workspace,workspaces,loading]);return<Context.Provider value={value}>{children}</Context.Provider>}
export function useWorkspace(){const value=useContext(Context);if(!value)throw new Error('useWorkspace requiere WorkspaceProvider');return value}
