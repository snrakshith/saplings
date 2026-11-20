import React,{createContext,useContext,useMemo,useState} from 'react';
import {useColorScheme} from 'react-native';
import {createTheme,type ColorMode,type DesignOverrides,type XloxTheme} from '@saplings/ui-core';
export * from '@saplings/ui-core';
export interface AppThemeContext {theme:XloxTheme;mode:ColorMode;setMode:(mode:ColorMode)=>void;toggleTheme:()=>void;}
const Context=createContext<AppThemeContext|undefined>(undefined);
export interface MurphAppThemeProviderProps {children:React.ReactNode;defaultMode?:ColorMode|'system';overrides?:DesignOverrides;}
/** No web/DOM access. System mode reads native OS preference; explicit mode overrides it. */
export function MurphAppThemeProvider({children,defaultMode='system',overrides}:MurphAppThemeProviderProps){
 const system=useColorScheme()==='dark'?'dark':'light';const [chosen,setChosen]=useState<ColorMode|'system'>(defaultMode);
 const mode:ColorMode=chosen==='system'?system:chosen;
 const theme=useMemo(()=>createTheme(mode,overrides),[mode,overrides]);
 const value=useMemo<AppThemeContext>(()=>({theme,mode,setMode:setChosen,toggleTheme:()=>setChosen(mode==='light'?'dark':'light')}),[theme,mode]);
 return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useAppTheme(){const ctx=useContext(Context);if(!ctx)throw new Error('Wrap the native tree in MurphAppThemeProvider');return ctx;}
/** Cross-platform parity for the source Murphi provider hook. */
export const useTheme=useAppTheme;
