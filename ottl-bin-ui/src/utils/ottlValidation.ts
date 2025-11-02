/**
 * OTTL Validation utilities
 * Validates transformation statements against Transform Processor rules
 */

import type { TransformationSignal } from '../components/transformations/TransformationList';

// Metric-only functions from Transform Processor spec
const METRIC_ONLY_FUNCTIONS = [
  'convert_sum_to_gauge',
  'convert_gauge_to_sum',
  'extract_count_metric',
  'extract_sum_metric',
  'convert_summary_count_val_to_sum',
  'convert_summary_quantile_val_to_gauge',
  'convert_summary_sum_val_to_sum',
  'copy_metric',
  'scale_metric',
  'aggregate_on_attributes',
  'convert_exponential_histogram_to_histogram',
  'aggregate_on_attribute_value',
  'merge_histogram_buckets',
];

// Common OTTL functions that work across all signals
const COMMON_FUNCTIONS = [
  'set',
  'delete_key',
  'delete_matching_keys',
  'keep_keys',
  'limit',
  'merge_maps',
  'replace_match',
  'replace_pattern',
  'replace_all_matches',
  'replace_all_patterns',
  'truncate_all',
  'flatten',
  'concat',
  'split',
  'substring',
  'len',
  'int',
  'double',
  'sha256',
  'sha1',
  'md5',
  'uuid',
  'time',
  'unix_seconds',
  'unix_milli',
  'unix_nano',
  'parse_json',
  'parse_xml',
  'noop',
];

// Signal-specific function compatibility
export const FUNCTION_COMPATIBILITY: Record<string, TransformationSignal[]> = {
  // Metric-only
  ...Object.fromEntries(METRIC_ONLY_FUNCTIONS.map((fn) => [fn, ['metric']])),
  // Common functions work for all signals
  ...Object.fromEntries(COMMON_FUNCTIONS.map((fn) => [fn, ['trace', 'metric', 'log']])),
};

// Path prefixes allowed per signal
const ALLOWED_PATH_PREFIXES: Record<TransformationSignal, string[]> = {
  trace: ['resource', 'scope', 'span', 'spanevent'],
  metric: ['resource', 'scope', 'metric', 'datapoint'],
  log: ['resource', 'scope', 'log'],
};

/**
 * Check if a function name is metric-only
 */
export function isMetricOnlyFunction(functionName: string): boolean {
  return METRIC_ONLY_FUNCTIONS.includes(functionName);
}

/**
 * Check if a function is compatible with a given signal
 */
export function isFunctionCompatibleWithSignal(
  functionName: string,
  signal: TransformationSignal,
): boolean {
  const compatibility = FUNCTION_COMPATIBILITY[functionName];
  if (!compatibility) {
    // Unknown function - assume it's common/compatible
    return true;
  }
  return compatibility.includes(signal);
}

/**
 * Get the list of signals a function is compatible with
 */
export function getFunctionCompatibility(functionName: string): TransformationSignal[] {
  return FUNCTION_COMPATIBILITY[functionName] ?? ['trace', 'metric', 'log'];
}

/**
 * Get a human-readable label for function compatibility
 */
export function getFunctionCompatibilityLabel(functionName: string): string {
  const signals = getFunctionCompatibility(functionName);
  if (signals.length === 3) {
    return 'All signals';
  }
  return signals.map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(', ');
}

/**
 * Extract function names from an OTTL statement
 */
export function extractFunctionNames(statement: string): string[] {
  const functionPattern = /([a-z_]+)\s*\(/g;
  const matches = [...statement.matchAll(functionPattern)];
  return matches.map((match) => match[1]);
}

/**
 * Extract path prefixes from an OTTL statement
 */
export function extractPathPrefixes(statement: string): string[] {
  const pathPattern = /\b(resource|scope|span|spanevent|metric|datapoint|log)\./g;
  const matches = [...statement.matchAll(pathPattern)];
  return [...new Set(matches.map((match) => match[1]))];
}

/**
 * Validate if a statement is compatible with the given signal
 */
export function validateStatementForSignal(
  statement: string,
  signal: TransformationSignal,
): { valid: boolean; errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for incompatible functions
  const functions = extractFunctionNames(statement);
  const incompatibleFunctions = functions.filter(
    (fn) => !isFunctionCompatibleWithSignal(fn, signal),
  );
  
  if (incompatibleFunctions.length > 0) {
    incompatibleFunctions.forEach((fn) => {
      const compatibleWith = getFunctionCompatibility(fn);
      errors.push(
        `Function '${fn}' is not compatible with ${signal} signal. Compatible with: ${compatibleWith.join(', ')}`,
      );
    });
  }

  // Check for invalid path prefixes
  const pathPrefixes = extractPathPrefixes(statement);
  const allowedPrefixes = ALLOWED_PATH_PREFIXES[signal];
  const invalidPrefixes = pathPrefixes.filter((prefix) => !allowedPrefixes.includes(prefix));

  if (invalidPrefixes.length > 0) {
    errors.push(
      `Invalid path prefixes for ${signal} statements: ${invalidPrefixes.join(', ')}. Allowed: ${allowedPrefixes.join(', ')}`,
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Infer the most appropriate signal for a statement based on its content
 */
export function inferSignalFromStatement(statement: string): TransformationSignal {
  const functions = extractFunctionNames(statement);
  const pathPrefixes = extractPathPrefixes(statement);

  // Check for metric-only functions
  if (functions.some(isMetricOnlyFunction)) {
    return 'metric';
  }

  // Check path prefixes
  if (pathPrefixes.some((p) => ['metric', 'datapoint'].includes(p))) {
    return 'metric';
  }

  if (pathPrefixes.some((p) => p === 'log')) {
    return 'log';
  }

  if (pathPrefixes.some((p) => ['span', 'spanevent'].includes(p))) {
    return 'trace';
  }

  // Default to trace
  return 'trace';
}
