type Environment = 'staging' | 'production';

export function deploymentEnvironment(): Environment {
  const value = process.env.SAPLINGS_DEPLOYMENT_ENVIRONMENT ?? 'production';
  if (value !== 'staging' && value !== 'production')
    throw new Error('SAPLINGS_DEPLOYMENT_ENVIRONMENT must be staging or production.');
  return value;
}

function requireSetting(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(name + ' is required for the selected provider.');
  return value;
}

function endpoint(name: string, secure: string, local: string, host: string, env: Environment) {
  const value = process.env[name];
  if (!value) return;
  const url = URL.parse(value);
  if (
    !url ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    (url.pathname && url.pathname !== '/') ||
    (url.protocol !== secure &&
      !(
        env === 'staging' &&
        url.protocol === local &&
        [host, 'localhost', '127.0.0.1'].includes(url.hostname)
      ))
  )
    throw new Error(name + ' must be a trusted endpoint.');
  return url;
}

export function providerSettings(env: Environment) {
  const region = process.env.AWS_REGION ?? 'us-east-1';
  const bucket = process.env.S3_BUCKET?.trim();
  const s3 = bucket
    ? {
        bucket,
        region,
        endpoint: endpoint('S3_ENDPOINT', 'https:', 'http:', 'object-store', env)?.href,
        encryptionKeyId: process.env.S3_KMS_KEY_ID,
      }
    : undefined;
  if (bucket && !/^[a-z0-9][.a-z0-9-]{1,61}[a-z0-9]$/.test(bucket))
    throw new Error('S3_BUCKET must be a valid bucket name.');

  const mode = process.env.STARTER_NOTIFICATIONS ?? 'off';
  if (mode !== 'off' && mode !== 'aws' && mode !== 'smtp')
    throw new Error('STARTER_NOTIFICATIONS must be off, aws, or smtp.');
  const from = mode === 'off' ? undefined : requireSetting('SES_FROM');
  if (from && !/^[^<>\s@]+@[^<>\s@]+$/.test(from))
    throw new Error('SES_FROM must be an email address.');
  const smtp =
    mode === 'smtp' ? endpoint('SMTP_URL', 'smtps:', 'smtp:', 'mailpit', env) : undefined;
  if (mode === 'smtp' && !smtp) throw new Error('SMTP_URL is required for SMTP notifications.');
  if (mode === 'smtp' && env !== 'staging')
    throw new Error(
      'The Starter SMTP adapter is reserved for staging. Configure SES for production.',
    );

  const paymentEnv = process.env.CASHFREE_ENVIRONMENT;
  const hasPayments = Boolean(
    paymentEnv || process.env.CASHFREE_CLIENT_ID || process.env.CASHFREE_CLIENT_SECRET,
  );
  if (hasPayments && paymentEnv !== 'sandbox' && paymentEnv !== 'production')
    throw new Error('Choose CASHFREE_ENVIRONMENT=sandbox or production.');
  if (hasPayments && (paymentEnv === 'production') !== (env === 'production'))
    throw new Error('Cashfree credentials must match the deployment environment.');
  const amountMinor = hasPayments ? Number(requireSetting('STARTER_CHECKOUT_AMOUNT_MINOR')) : 0;
  if (
    hasPayments &&
    (!Number.isSafeInteger(amountMinor) || amountMinor < 100 || amountMinor > 99999999999)
  )
    throw new Error('Set STARTER_CHECKOUT_AMOUNT_MINOR to a supported INR amount in paise.');
  const cashfree = hasPayments
    ? {
        clientId: requireSetting('CASHFREE_CLIENT_ID'),
        clientSecret: requireSetting('CASHFREE_CLIENT_SECRET'),
        environment: paymentEnv as 'sandbox' | 'production',
        amountMinor,
      }
    : undefined;

  const encryption = process.env.SAPLING_ENCRYPTION_KEY;
  if (encryption && !/^[A-Za-z0-9+/]{43}=$/.test(encryption))
    throw new Error('SAPLING_ENCRYPTION_KEY must be 32 bytes in standard Base64.');
  if (cashfree && !encryption)
    throw new Error('Configure SAPLING_ENCRYPTION_KEY before enabling Cashfree.');
  const valkey = process.env.VALKEY_URL;
  if (valkey) {
    const url = URL.parse(valkey);
    if (
      !url ||
      (url.protocol !== 'rediss:' &&
        !(
          env === 'staging' &&
          url.protocol === 'redis:' &&
          ['valkey', 'localhost', '127.0.0.1'].includes(url.hostname)
        ))
    )
      throw new Error('VALKEY_URL must use TLS outside the local staging network.');
  }
  return {
    s3,
    notifications: mode,
    from,
    smtp,
    region,
    cashfree,
    valkey,
    encryptionKey: encryption && Buffer.from(encryption, 'base64'),
  };
}
