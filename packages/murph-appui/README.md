# @saplings/murph-appui

Build React Native screens with Murphi components and shared design tokens. Provide React 19.3 and React Native 0.88–0.89 in the host application.

## Install

```bash
npm install @saplings/murph-appui
```

## Quick start

```tsx
import { Button, MurphAppThemeProvider, Stack, Typography } from '@saplings/murph-appui';

export default function App() {
  return (
    <MurphAppThemeProvider defaultMode="system">
      <Stack gap={2} padding={2}>
        <Typography variant="h5">Projects</Typography>
        <Button onPress={() => {}}>Continue</Button>
      </Stack>
    </MurphAppThemeProvider>
  );
}
```

## API and integration

- Wrap the root in `MurphAppThemeProvider`. Import components from the root or `/components` and theme APIs from `/core`.
- Components include layout, typography, inputs, buttons, feedback, dialogs, navigation, lists, and tables. Use React Native's virtualized list primitives for large datasets.
- Verify accessibility, keyboard handling, and overlay behavior on Android and iOS. See the package attribution and platform coverage notes.

Read the [integration guide](https://github.com/snrakshith/saplings/blob/main/docs/ui-platforms/README.md) for configuration and operational details.
