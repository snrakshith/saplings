import {test} from 'vitest';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {createTheme,colors,spacingPx,cssVariables,cssVariableText,toNativeTypography,currentBreakpoint,resolveResponsive,getSemanticColors,buttonAppearance,controlMetrics,clampProgress} from '@saplings/ui-core';
import * as web from '@saplings/murphi-ui';

test('Murphi full color families and shared light/dark semantics',()=>{
 assert.ok(Object.keys(colors).length>=20);
 for(const name of Object.keys(colors)){
  const family=colors[name];assert.equal(Object.keys(family).length,11);
  for(const color of Object.values(family))assert.match(color,/^#[a-f0-9]{6}$/i);
 }
 const light=createTheme('light'),dark=createTheme('dark');
 assert.notEqual(light.colors.background.default,dark.colors.background.default);
 assert.equal(getSemanticColors(light).primary,light.colors.primary[500]);
 assert.equal(getSemanticColors(dark).text,dark.colors.text.primary);
 assert.equal(createTheme('dark',{primary:'#123ABC'}).colors.primary[500],'#123abc');
 assert.equal(light.colors.primary[500],createTheme().colors.primary[500]);
 assert.throws(()=>createTheme('light',{primary:'url(javascript:foo)'}));
 assert.throws(()=>createTheme('light',{radius:-1}));
 assert.throws(()=>createTheme('light',{density:'super-dense'}));
});
test('Shared responsive, density and native typography conversion',()=>{
 assert.equal(spacingPx(2),16);assert.equal(spacingPx(2,'compact'),12);
 assert.throws(()=>spacingPx(-1));assert.equal(currentBreakpoint(769),'md');
 assert.equal(resolveResponsive({xs:'a',md:'b'},800),'b');
 assert.equal(resolveResponsive({xs:'a',lg:'c'},700),'a');
 assert.throws(()=>resolveResponsive({xs:'a'},-1)); // invalid widths rejected
 const body=toNativeTypography('body1');assert.equal(body.fontSize,16);assert.equal(body.fontWeight,'400');assert.ok(body.lineHeight>=20);
 const text=cssVariableText(createTheme('dark'));assert.match(text,/--sapling-background:/);assert.match(text,/--sapling-primary:/);assert.ok(Object.keys(cssVariables(createTheme())).length>=8);
 assert.throws(()=>cssVariableText(createTheme(),'.untrusted{color:red}'));
 const appearance=buttonAppearance(createTheme(),'outlined');assert.equal(appearance.borderWidth,1);assert.equal(appearance.color,createTheme().colors.primary[500]);
 assert.equal(controlMetrics('medium').minHeight,44);assert.equal(clampProgress(150,100).percent,100);assert.throws(()=>clampProgress(NaN));
});
test('Murphi web component API exports original component system',()=>{
 for(const name of ['Box','Container','Stack','Typography','Button','Input','Select','Checkbox','Radio','Switch','Table','Modal','Drawer','Tabs','ToastProvider','Alert','Progress','Tooltip','Card','Badge','Avatar','ColorShowcase','Rating','Accordion']){
  assert.ok(web[name] && ['function','object'].includes(typeof web[name]),name);
 }
 assert.equal(typeof web.MurphiThemeProvider,'function');assert.equal(typeof web.useTheme,'function');
});
test('Murphi web SSR renders semantics and styles using ui-core theme',()=>{
 const view=React.createElement(web.MurphiThemeProvider,{defaultMode:'dark'},React.createElement(web.Card,null,React.createElement(web.Typography,{variant:'h5'},'Schools'),React.createElement(web.Button,{variant:'outlined',onClick:()=>{}},'Continue')));
 const html=renderToStaticMarkup(view);
 assert.match(html,/Schools/);assert.match(html,/Continue/);assert.match(html,/<button/);assert.match(html,/color:/);
 assert.doesNotMatch(html,/loading="false"/);
});
test('Light/dark provider uses one shared token source',()=>{
 const html=renderToStaticMarkup(React.createElement(web.MurphiThemeProvider,{defaultMode:'dark',overrides:{primary:'#123456'}},React.createElement(web.Button,null,'Test')));
 assert.match(html,/#123456/i);
});
