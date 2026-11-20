# @sapling/murphi-ui — React web

Adapted from the uploaded Murphi React/Emotion component library with **all 36 existing component folders**, including Box, Stack, Container, Typography, Button, Input, Select, Modal, Drawer, Table, Tooltip, Alert, Tabs and the rest. Project structure follows Xlox UI (`src/core`, `src/components`, `src/lib`, `src/icons`, `src/stories`), not Xlox's single component implementation.

```tsx
import {MurphiThemeProvider,Button,Card,Typography} from '@sapling/murphi-ui';
export function Screen(){return <MurphiThemeProvider><Card><Typography variant="h5">School</Typography><Button onClick={()=>{}}>Continue</Button></Card></MurphiThemeProvider>}
```

`@sapling/ui-core` is the only theme/token source. Web components use Emotion and React; do not import this package into React Native. See `docs/ui-platforms` for contracts, original-source mapping, status and production backlog. Confirm original Murphi source redistribution rights before publishing.
