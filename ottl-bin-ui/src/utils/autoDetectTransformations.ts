/**
 * Auto-detect transformations based on telemetry data
 * Analyzes field names and values to suggest relevant transformations
 */

import type { Transformation } from '../components/transformations/TransformationList';

export type TelemetryRecord = Record<string, unknown>;

interface DetectionRule {
  id: string;
  name: string;
  description: string;
  category: 'privacy' | 'filtering' | 'deletion' | 'attribute' | 'parsing' | 'metric' | 'formatting' | 'advanced';
  signal: 'trace' | 'metric' | 'log';
  compatibleSignals?: ('trace' | 'metric' | 'log')[];
  detect: (records: TelemetryRecord[]) => { matched: boolean; fields: string[] };
  priority: number; // Higher = more important
}

const detectionRules: DetectionRule[] = [
  // Auth tokens and secrets
  {
    id: 'mask-auth-tokens',
    name: 'Mask Auth Tokens',
    description: 'Detected authentication tokens in resource attributes',
    category: 'privacy',
    signal: 'trace',
    compatibleSignals: ['trace', 'log'],
    priority: 100,
    detect: (records) => {
      const fields: string[] = [];
      const matched = records.some((record) => {
        for (const key in record) {
          if (
            (key.includes('auth') && key.includes('token')) ||
            key.includes('api.key') ||
            key.includes('secret') ||
            key.includes('password')
          ) {
            fields.push(key);
            return true;
          }
        }
        return false;
      });
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // GUIDs and UUIDs
  {
    id: 'hash-uuids',
    name: 'Hash UUIDs and GUIDs',
    description: 'Detected UUIDs and GUIDs that should be hashed for privacy',
    category: 'privacy',
    signal: 'trace',
    compatibleSignals: ['trace', 'metric', 'log'],
    priority: 90,
    detect: (records) => {
      const fields: string[] = [];
      const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          const value = record[key];
          if (
            (key.includes('uid') || key.includes('guid') || key.includes('uuid') || key.includes('id')) &&
            typeof value === 'string' &&
            uuidPattern.test(value)
          ) {
            fields.push(key);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // Email addresses
  {
    id: 'hash-emails',
    name: 'Hash Email Addresses',
    description: 'Detected email addresses in telemetry',
    category: 'privacy',
    signal: 'trace',
    compatibleSignals: ['trace', 'metric', 'log'],
    priority: 95,
    detect: (records) => {
      const fields: string[] = [];
      const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          const value = record[key];
          if (
            (key.includes('email') || key.includes('user')) &&
            typeof value === 'string' &&
            emailPattern.test(value)
          ) {
            fields.push(key);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // IP addresses
  {
    id: 'mask-ip-addresses',
    name: 'Mask IP Addresses',
    description: 'Detected IP addresses that may contain PII',
    category: 'privacy',
    signal: 'trace',
    compatibleSignals: ['trace', 'log'],
    priority: 80,
    detect: (records) => {
      const fields: string[] = [];
      const ipPattern = /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/;
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          const value = record[key];
          if (
            (key.includes('ip') || key.includes('address') || key.includes('peer')) &&
            typeof value === 'string' &&
            ipPattern.test(value)
          ) {
            fields.push(key);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // High cardinality attributes (many unique values)
  {
    id: 'drop-high-cardinality',
    name: 'Drop High-Cardinality Attributes',
    description: 'Detected attributes with very high cardinality (cost impact)',
    category: 'filtering',
    signal: 'trace',
    compatibleSignals: ['trace'],
    priority: 60,
    detect: (records) => {
      const fields: string[] = [];
      const valueCounts = new Map<string, Set<unknown>>();
      
      records.forEach((record) => {
        for (const key in record) {
          if (!valueCounts.has(key)) {
            valueCounts.set(key, new Set());
          }
          valueCounts.get(key)!.add(record[key]);
        }
      });
      
      const matched = Array.from(valueCounts.entries()).some(([key, values]) => {
        // If almost every record has a unique value, it's high cardinality
        const uniqueRatio = values.size / records.length;
        if (uniqueRatio > 0.9 && values.size > 10) {
          fields.push(key);
          return true;
        }
        return false;
      });
      
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // Large attribute values
  {
    id: 'truncate-large-values',
    name: 'Truncate Large Values',
    description: 'Detected attributes with very large string values',
    category: 'filtering',
    signal: 'trace',
    compatibleSignals: ['trace', 'log'],
    priority: 50,
    detect: (records) => {
      const fields: string[] = [];
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          const value = record[key];
          if (typeof value === 'string' && value.length > 500) {
            fields.push(key);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // Kubernetes metadata (often unnecessary)
  {
    id: 'drop-k8s-metadata',
    name: 'Drop Verbose K8s Metadata',
    description: 'Detected verbose Kubernetes metadata that may not be needed',
    category: 'deletion',
    signal: 'trace',
    compatibleSignals: ['trace'],
    priority: 40,
    detect: (records) => {
      const fields: string[] = [];
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          if (
            key.includes('k8s.') &&
            (key.includes('annotation') || key.includes('label') || key.includes('template'))
          ) {
            fields.push(key);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // Health check / synthetic traffic sampling
  {
    id: 'sample-health-checks',
    name: 'Sample Health Check Traffic',
    description: 'Detected high-volume health check endpoints (reduce by 90%)',
    category: 'filtering',
    signal: 'trace',
    compatibleSignals: ['trace'],
    priority: 70,
    detect: (records) => {
      const fields: string[] = [];
      
      let matched = false;
      for (const record of records) {
        for (const key in record) {
          let value: string | undefined;
          const rawValue = record[key];
          if (typeof rawValue === 'string') {
            value = rawValue.trim().toLowerCase();
          } else if (typeof rawValue === 'number' || typeof rawValue === 'boolean') {
            value = String(rawValue).toLowerCase();
          } else {
            continue; // Skip null, undefined, objects, arrays
          }
          if (
            (key.includes('url') || key.includes('path') || key.includes('endpoint') || key.includes('name')) &&
            value &&
            (value.includes('/health') || 
             value.includes('/ping') || 
             value.includes('/ready') || 
             value.includes('/live') ||
             value.includes('healthcheck'))
          ) {
            fields.push(`${key}=${record[key]}`);
            matched = true;
            break;
          }
        }
        if (matched) break;
      }
      
      return { matched, fields: [...new Set(fields)] };
    },
  },

  // Excessive attribute count
  {
    id: 'limit-attribute-count',
    name: 'Limit Attribute Count',
    description: 'Detected records with >50 attributes (recommended: <40)',
    category: 'filtering',
    signal: 'trace',
    compatibleSignals: ['trace', 'log'],
    priority: 55,
    detect: (records) => {
      const fields: string[] = [];
      
      let matched = false;
      for (const record of records) {
        const attrCount = Object.keys(record).length;
        if (attrCount > 50) {
          fields.push(`${attrCount} attributes detected`);
          matched = true;
          break;
        }
      }
      
      return { matched, fields };
    },
  },

  // Duplicate/redundant attributes
  {
    id: 'drop-duplicate-attributes',
    name: 'Drop Duplicate Attributes',
    description: 'Detected attributes with identical values across all records',
    category: 'deletion',
    signal: 'trace',
    compatibleSignals: ['trace', 'metric', 'log'],
    priority: 45,
    detect: (records) => {
      const fields: string[] = [];
      const valueCounts = new Map<string, Set<unknown>>();
      
      records.forEach((record) => {
        for (const key in record) {
          if (!valueCounts.has(key)) {
            valueCounts.set(key, new Set());
          }
          valueCounts.get(key)!.add(record[key]);
        }
      });
      
      const matched = Array.from(valueCounts.entries()).some(([key, values]) => {
        // If all records have the same value, it's redundant
        if (values.size === 1 && records.length > 1) {
          fields.push(key);
          return true;
        }
        return false;
      });
      
      return { matched, fields: [...new Set(fields)] };
    },
  },
];

/**
 * Auto-detect transformations from telemetry records
 */
export function autoDetectTransformations(records: TelemetryRecord[]): Transformation[] {
  if (!records || records.length === 0) {
    return [];
  }

  const detectedTransformations: Transformation[] = [];
  
  // Run all detection rules
  detectionRules.forEach((rule) => {
    const { matched, fields } = rule.detect(records);
    
    if (matched && fields.length > 0) {
      const transformation: Transformation = {
        id: `auto-${rule.id}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        title: rule.name,
        description: `${rule.description} (Fields: ${fields.slice(0, 3).join(', ')}${fields.length > 3 ? '...' : ''})`,
        category: rule.category,
        isEnabled: false, // Start disabled, let user enable
        signal: rule.signal,
        compatibleSignals: rule.compatibleSignals,
        config: {
          autoDetected: true,
          fields,
          priority: rule.priority,
        },
      };
      
      detectedTransformations.push(transformation);
    }
  });
  
  // Sort by priority (highest first)
  return detectedTransformations.sort((a, b) => {
    const aPriority = (a.config?.priority as number) || 0;
    const bPriority = (b.config?.priority as number) || 0;
    return bPriority - aPriority;
  });
}

/**
 * Get a summary of detected issues
 */
export function getDetectionSummary(records: TelemetryRecord[]): {
  totalIssues: number;
  byCategory: Record<string, number>;
  topIssues: Array<{ name: string; count: number }>;
} {
  const detected = autoDetectTransformations(records);
  
  const byCategory: Record<string, number> = {};
  detected.forEach((t) => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });
  
  const topIssues = detected.slice(0, 5).map((t) => ({
    name: t.title,
    count: (t.config?.fields as string[])?.length || 0,
  }));
  
  return {
    totalIssues: detected.length,
    byCategory,
    topIssues,
  };
}
