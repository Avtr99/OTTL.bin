/**
 * OTTL Interpreter - Parses and applies OTTL statements to telemetry records
 * This is a simplified interpreter for preview purposes, not a full OTTL implementation
 */

export type TelemetryRecord = Record<string, unknown>;

interface ParsedStatement {
  function: string;
  args: string[];
  condition?: string;
}

/**
 * Parse a single OTTL statement into its components
 */
function parseStatement(statement: string): ParsedStatement | null {
  // Skip comments
  if (statement.trim().startsWith('#')) {
    return null;
  }

  // Match function calls like: set(path, value) where condition
  // or: delete_key(map, key)
  // or: replace_pattern(path, regex, replacement)
  const functionMatch = statement.match(/^(\w+)\s*\((.*)\)(?:\s+where\s+(.+))?$/);
  
  if (!functionMatch) {
    return null;
  }

  const [, func, argsStr, condition] = functionMatch;
  
  // Parse arguments (simplified - doesn't handle nested parentheses well)
  const args = parseArgs(argsStr);
  
  return {
    function: func,
    args,
    condition: condition?.trim(),
  };
}

/**
 * Parse function arguments, handling quoted strings
 */
function parseArgs(argsStr: string): string[] {
  const args: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let parenDepth = 0;

  for (let i = 0; i < argsStr.length; i++) {
    const char = argsStr[i];
    
    if (char === '"' || char === "'") {
      // Count consecutive backslashes before this quote
      let backslashCount = 0;
      let j = i - 1;
      while (j >= 0 && argsStr[j] === '\\') {
        backslashCount++;
        j--;
      }
      const isEscaped = backslashCount % 2 === 1;

      if (!isEscaped) {
        if (!inQuotes) {
          inQuotes = true;
          quoteChar = char;
        } else if (char === quoteChar) {
          inQuotes = false;
        }
      }
      current += char;
    } else if (char === '(' && !inQuotes) {
      parenDepth++;
      current += char;
    } else if (char === ')' && !inQuotes) {
      parenDepth--;
      current += char;
    } else if (char === ',' && !inQuotes && parenDepth === 0) {
      args.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  if (current.trim()) {
    args.push(current.trim());
  }
  
  return args;
}

/**
 * Extract attribute path from OTTL path expression
 * e.g., span.attributes["user.email"] -> user.email
 * e.g., resource.attributes["service.name"] -> resource.service.name
 */
function extractAttributePath(pathExpr: string): { scope: string; key: string } | null {
  // Match span.attributes["key"] or resource.attributes["key"]
  const attrMatch = pathExpr.match(/^(span|resource|log)\.attributes\["([^"]+)"\]$/);
  if (attrMatch) {
    const [, scope, key] = attrMatch;
    // Map to our flattened record format
    if (scope === 'span') {
      return { scope: 'span', key: `span.attributes.${key}` };
    } else if (scope === 'resource') {
      return { scope: 'resource', key: `resource.${key}` };
    } else if (scope === 'log') {
      return { scope: 'log', key: `log.attributes.${key}` };
    }
  }
  
  // Direct path like span.name
  if (pathExpr.startsWith('span.') || pathExpr.startsWith('resource.') || pathExpr.startsWith('log.')) {
    return { scope: pathExpr.split('.')[0], key: pathExpr };
  }
  
  return null;
}

/**
 * Evaluate a simple condition against a record
 */
function evaluateCondition(condition: string, record: TelemetryRecord): boolean {
  if (!condition) return true;
  
  // Handle IsMatch(path, pattern) conditions
  const isMatchMatch = condition.match(/^IsMatch\(([^,]+),\s*"([^"]+)"\)$/);
  if (isMatchMatch) {
    const pathExpr = isMatchMatch[1].trim();
    const pattern = isMatchMatch[2];
    
    // Handle nested path access like attributes["x"][0]["y"]
    let value: unknown = record;
    const pathParts = pathExpr.match(/\["([^"]+)"\]|\[(\d+)\]/g);
    if (pathParts) {
      for (const part of pathParts) {
        const keyMatch = part.match(/\["([^"]+)"\]/);
        const indexMatch = part.match(/\[(\d+)\]/);
        if (keyMatch && typeof value === 'object' && value !== null) {
          value = (value as Record<string, unknown>)[keyMatch[1]];
        } else if (indexMatch && Array.isArray(value)) {
          value = value[parseInt(indexMatch[1])];
        }
      }
    }
    
    if (typeof value === 'string') {
      try {
        // Basic validation: reject patterns with nested quantifiers
        if (/(\*|\+|\{).+(\*|\+|\{)/.test(pattern)) {
          return value.includes(pattern);
        }
        return new RegExp(pattern).test(value);
      } catch {
        return value.includes(pattern);
      }
    }
    return false;
  }  
  // Handle != nil checks
  const nilMatch = condition.match(/^(.+)\s*!=\s*nil$/);
  if (nilMatch) {
    const path = extractAttributePath(nilMatch[1].trim());
    if (path) {
      return record[path.key] != null;
    }
  }
  
  // Handle == checks with string
  const eqMatch = condition.match(/^(.+)\s*==\s*"([^"]*)"$/);
  if (eqMatch) {
    const path = extractAttributePath(eqMatch[1].trim());
    if (path) {
      return record[path.key] === eqMatch[2];
    }
  }
  
  // Handle == checks with number
  const eqNumMatch = condition.match(/^(.+)\s*==\s*(\d+)$/);
  if (eqNumMatch) {
    const path = extractAttributePath(eqNumMatch[1].trim());
    if (path) {
      return record[path.key] === parseInt(eqNumMatch[2]);
    }
  }
  
  // Default: condition passes
  return true;
}

/**
 * Simple hash function for preview purposes.
 * WARNING: Not cryptographically secure — do NOT use for PII or security-sensitive data.
 * Replace with a real crypto hash if cryptographic guarantees are required.
 */
function simpleHash(value: string): string {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return `preview_hash_${Math.abs(hash).toString(16).padStart(16, '0')}`;
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Evaluate a function call and return its result
 */
function evaluateFunction(funcName: string, args: string[], record: TelemetryRecord): unknown {
  switch (funcName) {
    case 'Concat': {
      // Concat([val1, val2], separator)
      const arrayMatch = args[0]?.match(/\[([^\]]+)\]/);
      const separator = args[1]?.replace(/^"|"$/g, '') || '';
      if (arrayMatch) {
        const items = arrayMatch[1].split(',').map(item => {
          const trimmed = item.trim();
          // Check if it's a cache/attribute reference
          if (trimmed.startsWith('cache[') || trimmed.startsWith('attributes[')) {
            const key = trimmed.match(/\["([^"]+)"\]/)?.[1];
            return key ? String(record[`_cache.${key}`] || record[key] || '') : '';
          }
          return trimmed.replace(/^"|"$/g, '');
        });
        return items.join(separator);
      }
      return '';
    }
    
    case 'Split': {
      // Split(value, separator)[index]
      const value = args[0];
      const separator = args[1]?.replace(/^"|"$/g, '') || '';
      const path = extractAttributePath(value);
      if (path && typeof record[path.key] === 'string') {
        return (record[path.key] as string).split(separator);
      }
      return [];
    }
    
    case 'ParseJSON': {
      // ParseJSON(string)
      const value = args[0];
      if (value.startsWith('cache[') || value.startsWith('body')) {
        const key = value.match(/\["([^"]+)"\]/)?.[1] || '_body';
        const jsonStr = record[`_cache.${key}`] || record[key];
        if (typeof jsonStr === 'string') {
          try {
            return JSON.parse(jsonStr);
          } catch {
            return {};
          }
        }
      }
      return {};
    }
    
    case 'Decode': {
      // Decode(bytes, encoding) - for preview, just return as string
      const value = args[0];
      const path = extractAttributePath(value);
      if (path) {
        return String(record[path.key] || '');
      }
      return '';
    }
    
    case 'IsMatch': {
      // IsMatch(value, pattern)
      const value = args[0];
      const rawPattern = args[1]?.replace(/^"|"$/g, '') || '';
      const path = extractAttributePath(value);
      if (path && typeof record[path.key] === 'string') {
        const isRegex = rawPattern.startsWith('/') && rawPattern.endsWith('/') && rawPattern.length > 2;
        const patternBody = isRegex ? rawPattern.slice(1, -1) : escapeRegExp(rawPattern);

        if (patternBody.length > 200) {
          return false;
        }

        try {
          return new RegExp(patternBody).test(record[path.key] as string);
        } catch {
          return false;
        }
      }
      return false;
    }

    case 'ToUpperCase': {
      // ToUpperCase(value)
      const value = args[0];
      const path = extractAttributePath(value);
      if (path && typeof record[path.key] === 'string') {
        return (record[path.key] as string).toUpperCase();
      }
      // Handle string literal
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1).toUpperCase();
      }
      return '';
    }

    case 'ToLowerCase': {
      // ToLowerCase(value)
      const value = args[0];
      const path = extractAttributePath(value);
      if (path && typeof record[path.key] === 'string') {
        return (record[path.key] as string).toLowerCase();
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        return value.slice(1, -1).toLowerCase();
      }
      return '';
    }

    case 'Substring': {
      // Substring(value, start, length)
      const value = args[0];
      const start = parseInt(args[1]) || 0;
      const length = args[2] !== undefined ? parseInt(args[2]) : undefined;
      const path = extractAttributePath(value);
      if (path && typeof record[path.key] === 'string') {
        const str = record[path.key] as string;
        return length !== undefined ? str.substring(start, start + length) : str.substring(start);
      }
      if (value.startsWith('"') && value.endsWith('"')) {
        const str = value.slice(1, -1);
        return length !== undefined ? str.substring(start, start + length) : str.substring(start);
      }
      return '';
    }

    case 'Now': {
      // Now() - returns current timestamp
      return new Date().toISOString();
    }

    case 'UnixNano': {
      // UnixNano(time) - returns nanoseconds since epoch
      // For preview, return current time in nanoseconds
      return BigInt(Date.now()) * BigInt(1000000);
    }

    case 'Int': {
      // Int(value) - convert to integer
      const value = args[0];
      const path = extractAttributePath(value);
      if (path) {
        const val = record[path.key];
        return typeof val === 'number' ? Math.floor(val) : parseInt(String(val)) || 0;
      }
      return parseInt(value) || 0;
    }

    case 'Double': {
      // Double(value) - convert to float
      const value = args[0];
      const path = extractAttributePath(value);
      if (path) {
        const val = record[path.key];
        return typeof val === 'number' ? val : parseFloat(String(val)) || 0;
      }
      return parseFloat(value) || 0;
    }

    case 'String': {
      // String(value) - convert to string
      const value = args[0];
      const path = extractAttributePath(value);
      if (path) {
        return String(record[path.key] ?? '');
      }
      return value.replace(/^"|"$/g, '');
    }

    case 'Len': {
      // Len(value) - return length of string or array
      const value = args[0];
      const path = extractAttributePath(value);
      if (path) {
        const val = record[path.key];
        if (typeof val === 'string') return val.length;
        if (Array.isArray(val)) return val.length;
      }
      return 0;
    }

    case 'UUID': {
      // UUID() - generate a random UUID
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }

    case 'ConvertCase': {
      // ConvertCase(value, toCase) - convert string case
      const value = args[0];
      const toCase = args[1]?.replace(/^"|"$/g, '').toLowerCase() || 'lower';
      const path = extractAttributePath(value);
      let str = '';
      if (path && typeof record[path.key] === 'string') {
        str = record[path.key] as string;
      } else if (value.startsWith('"') && value.endsWith('"')) {
        str = value.slice(1, -1);
      }
      switch (toCase) {
        case 'upper': return str.toUpperCase();
        case 'lower': return str.toLowerCase();
        case 'snake': return str.replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
        case 'camel': return str.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
        default: return str;
      }
      return false;
    }
    
    default:
      return undefined;
  }
}

/**
 * Apply a single parsed statement to a record
 */
function applyStatement(statement: ParsedStatement, record: TelemetryRecord): void {
  // Check condition first
  if (statement.condition && !evaluateCondition(statement.condition, record)) {
    return;
  }

  switch (statement.function) {
    case 'set': {
      // set(path, value)
      const [pathExpr, valueExpr] = statement.args;
      
      // Handle cache paths
      let targetKey: string | null = null;
      if (pathExpr.startsWith('cache[')) {
        const cacheKey = pathExpr.match(/\["([^"]+)"\]/)?.[1];
        if (cacheKey) {
          targetKey = `_cache.${cacheKey}`;
        }
      } else {
        const path = extractAttributePath(pathExpr);
        if (path) {
          targetKey = path.key;
        }
      }
      
      if (targetKey) {
        // Handle different value types
        if (valueExpr.startsWith('"') && valueExpr.endsWith('"')) {
          // String literal
          record[targetKey] = valueExpr.slice(1, -1);
        } else if (valueExpr.startsWith('SHA256(')) {
          // SHA256 hash
          const innerPath = extractAttributePath(valueExpr.slice(7, -1));
          if (innerPath && typeof record[innerPath.key] === 'string') {
            record[targetKey] = simpleHash(record[innerPath.key] as string);
          }
        } else if (valueExpr.startsWith('Concat(')) {
          // Concat function
          const concatArgs = parseArgs(valueExpr.slice(7, -1));
          record[targetKey] = evaluateFunction('Concat', concatArgs, record);
        } else if (valueExpr.startsWith('Split(')) {
          // Split function - handle Split(x, y)[index]
          const splitMatch = valueExpr.match(/Split\(([^)]+)\)\[(\d+)\]/);
          if (splitMatch) {
            const splitArgs = parseArgs(splitMatch[1]);
            const index = parseInt(splitMatch[2]);
            const result = evaluateFunction('Split', splitArgs, record);
            if (Array.isArray(result)) {
              record[targetKey] = result[index] || '';
            }
          }
        } else if (valueExpr.startsWith('ParseJSON(')) {
          // ParseJSON function
          const jsonArgs = parseArgs(valueExpr.slice(10, -1));
          record[targetKey] = evaluateFunction('ParseJSON', jsonArgs, record);
        } else if (valueExpr.startsWith('Decode(')) {
          // Decode function
          const decodeArgs = parseArgs(valueExpr.slice(7, -1));
          record[targetKey] = evaluateFunction('Decode', decodeArgs, record);
        } else if (valueExpr === 'true') {
          record[targetKey] = true;
        } else if (valueExpr === 'false') {
          record[targetKey] = false;
        } else if (valueExpr.trim() !== '' && !isNaN(Number(valueExpr))) {
          record[targetKey] = Number(valueExpr);
        } else if (valueExpr.startsWith('attributes[') || valueExpr.startsWith('cache[')) {
          // Copy from another attribute or cache
          const sourceKey = valueExpr.match(/\["([^"]+)"\]/)?.[1];
          if (sourceKey) {
            const sourceValue = valueExpr.startsWith('cache[') 
              ? record[`_cache.${sourceKey}`] 
              : record[sourceKey] || record[`span.attributes.${sourceKey}`];
            if (sourceValue !== undefined) {
              record[targetKey] = sourceValue;
            }
          }
        }
      }
      break;
    }

    case 'replace_pattern': {
      // replace_pattern(path, regex, replacement)
      const [pathExpr, regexStr, replacement] = statement.args;
      const path = extractAttributePath(pathExpr);
      if (path && typeof record[path.key] === 'string') {
        try {
          const regex = new RegExp(regexStr.replace(/^"|"$/g, '').replace(/\\\\/g, '\\'), 'g');
          const replaceWith = replacement.replace(/^"|"$/g, '').replace(/\$\$/, '$');
          record[path.key] = (record[path.key] as string).replace(regex, replaceWith);
        } catch {
          // Invalid regex, skip
        }
      }
      break;
    }

    case 'truncate_all': {
      // truncate_all(map, limit)
      const limit = parseInt(statement.args[1]) || 256;
      Object.keys(record).forEach((key) => {
        if (typeof record[key] === 'string' && (record[key] as string).length > limit) {
          const original = record[key] as string;
          const availableChars = Math.max(0, limit - 3);
          if (limit > 3) {
            record[key] = original.substring(0, availableChars) + '...';
          } else {
            record[key] = original.substring(0, limit);
          }
        }
      });
      break;
    }

    case 'keep_keys': {
      // keep_keys(map, [keys])
      const keysMatch = statement.args[1]?.match(/\[([^\]]+)\]/);
      if (keysMatch) {
        const keepKeys = keysMatch[1]
          .split(',')
          .map((k) => k.trim().replace(/^"|"$/g, ''));
        
        Object.keys(record).forEach((key) => {
          const attrName = key.split('.').pop() || key;
          if (!keepKeys.some((k) => key.includes(k) || attrName === k)) {
            // Don't delete core span fields
            if (!key.startsWith('trace.') && !key.startsWith('span.id') && !key.startsWith('span.name')) {
              delete record[key];
            }
          }
        });
      }
      break;
    }

    case 'limit': {
      // limit(map, count, priority_keys)
      const limit = parseInt(statement.args[1]) || 40;
      const keys = Object.keys(record);
      if (keys.length > limit) {
        // Keep first N keys (simplified)
        keys.slice(limit).forEach((key) => {
          delete record[key];
        });
      }
      break;
    }

    case 'drop': {
      // drop() - marks record for dropping (we'll set a flag)
      record['_dropped'] = true;
      break;
    }

    default:
      // Unknown function, skip
      break;
  }
}

/**
 * Parse OTTL YAML and extract statements
 */
function extractStatementsFromYaml(yaml: string): string[] {
  const statements: string[] = [];
  const lines = yaml.split('\n');
  
  let inStatements = false;
  
  for (const line of lines) {
    const trimmed = line.trim();
    
    // Detect statements section
    if (trimmed === 'statements:') {
      inStatements = true;
      continue;
    }
    
    // Detect end of statements (new section)
    if (inStatements && trimmed.match(/^[a-z_]+:/) && !trimmed.startsWith('-')) {
      inStatements = false;
      continue;
    }
    
    // Extract statement
    if (inStatements && trimmed.startsWith('- ')) {
      const statement = trimmed.slice(2).trim();
      if (statement && !statement.startsWith('#')) {
        statements.push(statement);
      }
    }
  }
  
  return statements;
}

/**
 * Apply raw OTTL YAML to a telemetry record
 * Returns the transformed record
 */
export function applyRawOttl(record: TelemetryRecord, rawOttl: string): TelemetryRecord {
  const cloned = JSON.parse(JSON.stringify(record)) as TelemetryRecord;
  
  try {
    const statements = extractStatementsFromYaml(rawOttl);
    
    for (const statementStr of statements) {
      const parsed = parseStatement(statementStr);
      if (parsed) {
        applyStatement(parsed, cloned);
      }
    }
  } catch (error) {
    console.warn('Error applying raw OTTL:', error);
  }
  
  return cloned;
}

/**
 * Check if the raw OTTL has custom edits that differ from generated
 */
export function hasCustomStatements(rawOttl: string): boolean {
  const statements = extractStatementsFromYaml(rawOttl);
  return statements.length > 0;
}
