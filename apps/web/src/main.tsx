import React from 'react';
import {useCounter} from '@saplings/hooks';
import {MurphiThemeProvider,Card,Button,Typography,Stack,Box,Badge} from '@saplings/murphi-ui';
import {createRoot} from 'react-dom/client';
import {SaplingProfiler} from '@saplings/quality-browser-runtime/react';
import {startFrontendObservability} from '@saplings/quality-browser-runtime';
import './style.css';
startFrontendObservability({endpoint:import.meta.env.VITE_TELEMETRY_URL||undefined});
const title=location.pathname==='/login'?'Sign in':location.pathname==='/dashboard'?'Dashboard':'Sapling Quality';
function App(){
 const {value:count,increment}=useCounter(0);
 const [items,setItems]=React.useState<string[]>([]);
 React.useEffect(()=>{const controller=new AbortController();fetch('/api/items',{signal:controller.signal}).then(r=>r.json()).then(data=>setItems((data.items??[]).map((x:{name:string})=>x.name))).catch(()=>{});return ()=>controller.abort();},[]);
 return <MurphiThemeProvider><div className="app"><header><strong>Sapling Quality</strong><nav aria-label="Main navigation"><a href="/">Home</a><a href="/login">Sign in</a><a href="/dashboard">Dashboard</a></nav></header><main><Typography variant="h3" component="h1">{title}</Typography><p>Reference React + TypeScript application for unified quality testing.</p><p data-quality-state>Count: {count}</p><Button className="counter-button" type="button" onClick={()=>increment()}>Increment counter</Button><Card aria-label="Loaded items"><section aria-label="Loaded items"><h2>API items</h2><ul data-quality-items>{items.map(item=><li key={item}>{item}</li>)}</ul></section></Card><section aria-labelledby="features"><h2 id="features">Supported checks</h2><ul><li>Core Web Vitals</li><li>Accessible navigation</li><li>Responsive layouts</li><li>Visual regressions</li><li>React renders</li></ul></section></main><footer>Open-source Sapling example · Murphi UI</footer></div></MurphiThemeProvider>
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><SaplingProfiler id="app"><App/></SaplingProfiler></React.StrictMode>);
