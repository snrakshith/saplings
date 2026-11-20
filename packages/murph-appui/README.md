# @saplings/murph-appui — React Native

Native implementation of the Murphi design language, with shared `@saplings/ui-core` tokens. Built with `View`, `Text`, `Pressable`, `TextInput`, `Switch`, `Modal`, `ScrollView`, `Image`, and `ActivityIndicator`; **not a WebView/DOM/CSS wrapper**. Xlox folder conventions: `core`, `components`, `lib`, `icons`, `stories`.

Supported exported components: `Box`, `Stack`, `Container`, `Typography`, `Text`, `Divider`, `Card`, `Button`, `Badge`, `Alert`, `Spinner`, `Progress`, `Tag`, `Input`, `Textarea`, `Checkbox`, `Radio`, `RadioGroup`, `Switch`, `Select`, `Rating`, `Modal`, `Drawer`, `Accordion`, `Tabs`, `Avatar`, `List`, `Navbar`, `Table` (additional helper components include Breadcrumb, Kbd, Command, Separator, AlertDialog, Sidebar, Tooltip, Toast, Feedback and ColorShowcase; native overlays differ from browser semantics).

```tsx
import {MurphAppThemeProvider,Stack,Typography,Button} from '@saplings/murph-appui';
export default function App(){return <MurphAppThemeProvider defaultMode="system"><Stack gap={2} padding={2}><Typography variant="h5">Schools</Typography><Button onPress={()=>{}}>Continue</Button></Stack></MurphAppThemeProvider>}
```

A host React Native app must provide compatible `react` and `react-native` peers; test on Android and iOS for actual font, accessibility, modal, keyboard, shadow and navigation behavior. No simulator was available during this SDK build. Native `Table` is for short datasets; use `FlatList` for large data. See [UI platform gaps](../../docs/ui-platforms/GAPS_AND_IMPROVEMENTS.md).
