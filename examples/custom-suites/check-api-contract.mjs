// Example *executable validation scenario* (not a test case for the quality package).
// Adapt to your actual contract expectations before production use.
const target = process.env.API_URL ?? 'http://127.0.0.1:3000';
const response = await fetch(new URL('/health', target));
if (!response.ok) {
  console.error(`Contract probe failed with HTTP ${response.status}`);
  process.exitCode = 1;
} else {
  const body = await response.json();
  if (body.status !== 'ok') {
    console.error('Expected health.status=ok');
    process.exitCode = 1;
  } else console.log('Health contract shape is valid');
}
