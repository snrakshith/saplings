import type { GatewayConfig } from '@saplings/harbor';
import type { RealmConfig } from '@saplings/kingsman';

export interface Project {
  id: string;
  name: string;
}

export interface TenantSummary {
  id: string;
  name: string;
}

export interface ProjectSummary extends Project {
  tenants: TenantSummary[];
}

export interface ConfigPair {
  kingsman: RealmConfig;
  harbor: GatewayConfig;
}

export interface Tenant extends TenantSummary, ConfigPair {
  revision: number;
}
