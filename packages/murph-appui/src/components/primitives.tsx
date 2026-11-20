import React from 'react';
import {View,Text as RNText,type ViewProps,type TextProps,type ViewStyle,type TextStyle,type StyleProp} from 'react-native';
import {getSemanticColors,spacingPx,toNativeTypography,type ThemeTypography} from '@sapling/ui-core';
import {useAppTheme} from '../core/theme.js';
export type TextVariant=Exclude<keyof ThemeTypography,'fontFamily'>;
export interface BoxProps extends ViewProps {children?:React.ReactNode;padding?:number;gap?:number;radius?:number;background?:'surface'|'background'|'primary'|'transparent';style?:StyleProp<ViewStyle>}
export function Box({children,padding,gap,radius,background='transparent',style,...rest}:BoxProps){const {theme}=useAppTheme();const c=getSemanticColors(theme);const values:ViewStyle={...(padding!==undefined?{padding:spacingPx(padding,theme.density)}:{}),...(gap!==undefined?{gap:spacingPx(gap,theme.density)}:{}),...(radius!==undefined?{borderRadius:radius}:{}),...(background!=='transparent'?{backgroundColor:background==='surface'?c.surface:background==='background'?c.background:c.primary}:{})};return <View {...rest} style={[values,style]}>{children}</View>}
export interface StackProps extends Omit<BoxProps,'background'> {direction?:'row'|'column';align?:ViewStyle['alignItems'];justify?:ViewStyle['justifyContent'];wrap?:boolean;}
export function Stack({direction='column',align,justify,wrap,style,...rest}:StackProps){return <Box {...rest} style={[{flexDirection:direction,alignItems:align,justifyContent:justify,flexWrap:wrap?'wrap':'nowrap'},style]}/>}
export interface TypographyProps extends Omit<TextProps,'style'> {variant?:TextVariant;color?:'primary'|'secondary'|'muted'|'error'|'success';align?:TextStyle['textAlign'];noWrap?:boolean;style?:StyleProp<TextStyle>;children?:React.ReactNode;}
export function Typography({variant='body1',color,align,noWrap,style,children,...rest}:TypographyProps){const {theme}=useAppTheme();const c=getSemanticColors(theme);const textColor=color==='primary'?c.primary:color==='secondary'?c.secondary:color==='muted'?c.textMuted:color==='error'?c.error:color==='success'?c.success:c.text;return <RNText {...rest} numberOfLines={noWrap?1:rest.numberOfLines} style={[{...toNativeTypography(variant),color:textColor,textAlign:align??'left'},style]}>{children}</RNText>}
export const Text=Typography;
export interface ContainerProps extends BoxProps {maxWidth?:number;centered?:boolean;}
export function Container({maxWidth=1024,centered=true,style,...rest}:ContainerProps){return <Box {...rest} style={[{width:'100%',maxWidth:Math.max(200,maxWidth),alignSelf:centered?'center':'auto'},style]}/>}
export interface DividerProps extends ViewProps {vertical?:boolean;thickness?:number;spacing?:number;}
export function Divider({vertical=false,thickness=1,spacing=0,style,...rest}:DividerProps){const {theme}=useAppTheme();return <View {...rest} accessibilityElementsHidden style={[vertical?{width:Math.max(1,thickness),alignSelf:'stretch',marginHorizontal:spacingPx(spacing),backgroundColor:theme.colors.neutral[300]}:{height:Math.max(1,thickness),marginVertical:spacingPx(spacing),backgroundColor:theme.colors.neutral[300]},style]}/>}
export interface CardProps extends BoxProps {outlined?:boolean;}
export function Card({outlined=true,style,...rest}:CardProps){const {theme}=useAppTheme();return <Box {...rest} background="surface" padding={rest.padding??2} radius={rest.radius??theme.shape.borderRadius} style={[outlined?{borderWidth:1,borderColor:theme.colors.neutral[300]}:{},style]}/>}
