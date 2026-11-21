type Cell = string | number | null;
export type Result =
  | {
      kind: 'trends';
      data: { total: number; unique: number; groups: { key: string; count: number }[] };
    }
  | { kind: 'funnel'; data: { name: string; users: number }[] }
  | {
      kind: 'retention';
      data: { cohort: number; days: { day: number; users: number; rate: number | null }[] };
    }
  | {
      kind: 'experiment';
      data: {
        variants: { variant: string; exposed: number; converted: number; rate: number | null }[];
        lift: number | null;
      };
    };

const percent = (rate: number | null) => (rate === null ? '—' : (rate * 100).toFixed(1) + '%');

function Table({ columns, rows }: { columns: string[]; rows: Cell[][] }) {
  if (!rows.length) return <p>No activity in the selected period.</p>;
  return (
    <table className="miner-results-table">
      <thead>
        <tr>
          {columns.map((column) => (
            <th key={column} scope="col">
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map(([name, ...values], index) => (
          <tr key={index}>
            <th scope="row">{name}</th>
            {values.map((value, column) => (
              <td key={column}>{value}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultTable({ result }: { result: Result }) {
  switch (result.kind) {
    case 'trends':
      return (
        <>
          <p>
            {result.data.total} {result.data.total === 1 ? 'event' : 'events'} ·{' '}
            {result.data.unique} unique {result.data.unique === 1 ? 'subject' : 'subjects'}
          </p>
          <Table
            columns={['Day or property value', 'Events']}
            rows={result.data.groups.map((row) => [row.key, row.count])}
          />
        </>
      );
    case 'funnel':
      return (
        <Table
          columns={['Event', 'Subjects reached']}
          rows={result.data.map((row) => [row.name, row.users])}
        />
      );
    case 'retention':
      return (
        <>
          <p>{result.data.cohort} subjects reached the first event.</p>
          <Table
            columns={['Days since first event', 'Returned', 'Retention']}
            rows={result.data.days.map((row) => [row.day, row.users, percent(row.rate)])}
          />
        </>
      );
    case 'experiment':
      return (
        <>
          <p>
            {result.data.lift === null
              ? 'Lift requires exposure in both variants.'
              : 'Absolute lift ' + (result.data.lift * 100).toFixed(1) + ' percentage points'}
          </p>
          <Table
            columns={['Variant', 'Exposed', 'Converted', 'Conversion rate']}
            rows={result.data.variants.map((row) => [
              row.variant,
              row.exposed,
              row.converted,
              percent(row.rate),
            ])}
          />
        </>
      );
  }
}

export function MinerResults({ result }: { result: Result }) {
  return (
    <section aria-label="Miner results" aria-live="polite">
      <h3>Results</h3>
      <ResultTable result={result} />
    </section>
  );
}
