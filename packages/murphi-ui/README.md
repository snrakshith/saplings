# @saplings/murphi-ui

Compose React web screens with the Murphi theme and responsive components. The host supplies React and React DOM 18.3 or 19.

## Install

```bash
npm install @saplings/murphi-ui
```

## Quick start

```tsx
import { Button, Card, MurphiThemeProvider, Typography } from '@saplings/murphi-ui';

export function ProjectCard() {
  return (
    <MurphiThemeProvider>
      <Card>
        <Typography variant="h5">Projects</Typography>
        <Button onClick={() => {}}>Continue</Button>
      </Card>
    </MurphiThemeProvider>
  );
}
```

## API and integration

- Add `MurphiThemeProvider` once around your component tree. Import from the root, `/components`, or `/core`.
- Use layout, form, overlay, navigation, and feedback components with your app state and accessible labels.
- Web styles use Emotion. For an SSR framework, integrate its Emotion SSR setup and verify styling after hydration. See this package's attribution and the UI platform guide.

Read the [integration guide](https://github.com/snrakshith/saplings/blob/main/docs/ui-platforms/README.md) for configuration and operational details.
