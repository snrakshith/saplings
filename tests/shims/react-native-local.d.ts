/** Local-only offline structural checking shim. NOT official React Native types or an installed runtime. */
declare module 'react-native' {
 import type * as React from 'react';
 export type StyleProp<T>= T|readonly T[]|null|undefined|false;
 export type ViewStyle=Record<string, any>;
 export type TextStyle=Record<string, any>;
 export interface ViewProps {children?:React.ReactNode;style?:StyleProp<ViewStyle>;nativeID?:string;accessibilityRole?:string;accessibilityLabel?:string;accessibilityState?:Record<string,unknown>;accessibilityValue?:Record<string,unknown>;accessibilityElementsHidden?:boolean;accessibilityLabelledBy?:string;accessibilityHint?:string;accessibilityViewIsModal?:boolean;onLayout?:(e:any)=>void;}
 export interface TextProps {children?:React.ReactNode;style?:StyleProp<TextStyle>;numberOfLines?:number;nativeID?:string;accessibilityRole?:string;accessibilityLabel?:string;accessibilityLabelledBy?:string;accessibilityState?:Record<string,unknown>;}
 export interface PressableProps extends ViewProps {onPress?:(event:any)=>void;disabled?:boolean;style?:StyleProp<ViewStyle>|((state:{pressed:boolean})=>StyleProp<ViewStyle>);}
 export interface TextInputProps extends TextProps {value?:string;defaultValue?:string;onChangeText?:(value:string)=>void;placeholder?:string;editable?:boolean;multiline?:boolean;textAlignVertical?:string;required?:boolean;}
 export interface SwitchProps extends ViewProps {value?:boolean;onValueChange?:(value:boolean)=>void;trackColor?:any;thumbColor?:string;disabled?:boolean;}
 export interface ImageProps extends ViewProps {source:any;}
 export const View:React.FC<ViewProps>;
 export const Text:React.FC<TextProps>;
 export const Pressable:React.FC<PressableProps>;
 export const TextInput:React.FC<TextInputProps>;
 export const Switch:React.FC<SwitchProps>;
 export const ActivityIndicator:React.FC<{color?:string;size?:'small'|'large'}>;
 export const Modal:React.FC<{children?:React.ReactNode;visible?:boolean;transparent?:boolean;animationType?:string;onRequestClose?:()=>void;accessibilityViewIsModal?:boolean}>;
 export const ScrollView:React.FC<ViewProps & {horizontal?:boolean;keyboardShouldPersistTaps?:string}>;
 export const Image:React.FC<ImageProps>;
 export function useColorScheme(): 'light'|'dark'|null;
}
