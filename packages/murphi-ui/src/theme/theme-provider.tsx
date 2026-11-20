import React,{createContext,useContext,useMemo,useState} from 'react';
import {ThemeProvider as EmotionThemeProvider} from '@emotion/react';
import {createTheme,type ColorMode,type DesignOverrides,type XloxTheme} from '@sapling/ui-core';
export interface MurphiThemeContext {theme:XloxTheme;mode:ColorMode;setMode:(mode:ColorMode)=>void;toggleTheme:()=>void;}
const Context=createContext<MurphiThemeContext|undefined>(undefined);
export function useTheme(){const context=useContext(Context);if(!context)throw new Error('useTheme requires MurphiThemeProvider');return context;}
export interface MurphiThemeProviderProps {children:React.ReactNode;defaultMode?:ColorMode;overrides?:DesignOverrides;}
export function MurphiThemeProvider({children,defaultMode='light',overrides}:MurphiThemeProviderProps){
 const [mode,setMode]=useState<ColorMode>(defaultMode);
 const theme=useMemo(()=>createTheme(mode,overrides),[mode,overrides]);
 const context=useMemo(()=>({theme,mode,setMode,toggleTheme:()=>setMode(value=>value==='light'?'dark':'light')}),[theme,mode]);
 return <Context.Provider value={context}><EmotionThemeProvider theme={theme}>{children}</EmotionThemeProvider></Context.Provider>;
}
/** Compatibility alias for the provided Murphi source; prefer MurphiThemeProvider. */
export const XloxThemeProvider=MurphiThemeProvider;
