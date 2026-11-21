import { useState } from 'react';
import { Button } from '@saplings/murphi-ui';
import type { GatewayConfig } from '@saplings/harbor';
import { RouteEditor } from './RouteEditor.js';
import { RouteList } from './RouteList.js';
import type { RouteSelection } from './route-draft.js';

export function Gateway({
  config,
  save,
}: {
  config: GatewayConfig;
  save: (config: GatewayConfig) => Promise<void>;
}) {
  const [editing, setEditing] = useState<RouteSelection | 'new'>();
  const [destination, setDestination] = useState('');
  const selected = editing === 'new' ? undefined : editing;
  return (
    <section className="panel">
      <div className="section-head top">
        <h2>Harbor routing</h2>
        <Button
          type="button"
          onClick={() => {
            setDestination('');
            setEditing('new');
          }}
        >
          Add route
        </Button>
      </div>
      <p>
        Connect incoming paths to an HTTP service and upstream. Use Configuration to edit advanced
        routing, TLS, plugins, and consumers.
      </p>

      <RouteList config={config} edit={setEditing} />
      {editing && (
        <RouteEditor
          key={selected?.route.name ?? 'new'}
          config={config}
          selected={selected}
          destination={destination}
          setDestination={setDestination}
          save={save}
          close={() => setEditing(undefined)}
        />
      )}
    </section>
  );
}
