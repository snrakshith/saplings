# @saplings/ui-core

Murphi design foundations shared by web React and React Native UI. No platform rendering code, React, DOM or Emotion imports.

Exports: `createTheme`, `colors`, `lightPalette`, `darkPalette`, `spacing`, `spacingPx`, `typography`, `toNativeTypography`, `breakpoints`, `currentBreakpoint`, `resolveResponsive`, `getSemanticColors`, `cssVariables`, `cssVariableText`, semantic size/variant types, and responsive token helpers. All colors and typography are derived from the uploaded Murphi UI source.

```ts
import {createTheme,spacingPx,getSemanticColors} from '@saplings/ui-core';
const theme=createTheme('dark',{primary:'#2563eb',density:'compact'});
console.log(getSemanticColors(theme).surface,spacingPx(2,'compact'));
```

Do not place secret/tenant data in shared tokens. RN native typography uses point/pixel sizes rather than rem/CSS. `createTheme` is pure and may run on Node, web and native.
