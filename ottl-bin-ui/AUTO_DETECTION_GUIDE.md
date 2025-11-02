# Auto-Detection Feature Guide

## Overview
The OTTL Transformation UI now automatically analyzes uploaded telemetry data and suggests relevant transformations based on the actual fields and values present.

## How It Works

### 1. Upload Telemetry
When you upload a file (JSON, OTLP, JSONL, or key=value format):
- The system parses the telemetry records
- Runs detection rules against the data
- Identifies potential privacy, cost, and quality issues

### 2. Auto-Detected Transformations
The system automatically adds **disabled** transformation cards for:

#### **Privacy & Security (Priority: 80-100)**
- **Mask Auth Tokens** - Detects `auth.token`, `api.key`, `secret`, `password` fields
- **Hash UUIDs and GUIDs** - Detects UUID/GUID patterns in `uid`, `guid`, `id` fields
- **Hash Email Addresses** - Detects email patterns in `email`, `user` fields
- **Mask IP Addresses** - Detects IP addresses in `ip`, `address`, `peer` fields

#### **Cost Optimization (Priority: 40-60)**
- **Drop High-Cardinality Attributes** - Detects fields where >90% of values are unique
- **Truncate Large Values** - Detects string values >500 characters
- **Drop Verbose K8s Metadata** - Detects unnecessary Kubernetes annotations/labels

### 3. Review & Enable
- Auto-detected transformations start **disabled** (checkbox unchecked)
- Review the description to see which fields were detected
- **Enable** the transformations you want to apply
- See the before/after changes in the Live Preview panel

## Example: Your OTLP Sample

When you upload `Sample telemetry.json`, the system detects:

### ✅ **Mask Auth Tokens**
- **Fields:** `resource.dash0.auth.token`
- **Action:** Replaces `"hxZyXot"` with `"********"`

### ✅ **Hash UUIDs and GUIDs**
- **Fields:** 
  - `span.attributes.guid:x-request-id`
  - `resource.k8s.pod.uid`
  - `resource.k8s.deployment.uid`
  - `resource.k8s.replicaset.uid`
- **Action:** Hashes to values like `"h_a3f2b8c1"`

### ✅ **Mask IP Addresses**
- **Fields:** 
  - `span.attributes.peer.address`
  - `resource.k8s.pod.ip`
- **Action:** Masks to `"10.1.***.***"`

### ⚠️ **Drop High-Cardinality Attributes**
- **Fields:** Unique IDs that appear once per record
- **Action:** Removes to reduce storage costs

## Toast Notifications

After upload, you'll see:
1. **Success toast:** "Loaded 1 records. Auto-detected 4 recommended transformations!"
2. **Info toast:** "Found: Mask Auth Tokens (1 fields), Hash UUIDs (4 fields), ..."

## Enabling Transformations

### Option 1: Enable Individual Transformations
1. Find the auto-detected transformation card (starts disabled)
2. Click the checkbox to enable
3. See the before/after change immediately

### Option 2: Enable All
1. Click each checkbox for all auto-detected transformations
2. Review the cumulative impact in the Live Preview

## Customization

Auto-detected transformations include:
- **Title:** Descriptive name (e.g., "Mask Auth Tokens")
- **Description:** Lists the first 3 detected fields
- **Config:** Contains all detected fields and priority
- **Signal:** Automatically assigned based on data type

## Detection Rules

### Privacy Detection
```typescript
// Auth tokens
key.includes('auth') && key.includes('token')
key.includes('api.key')
key.includes('secret')
key.includes('password')

// UUIDs
value matches /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Emails
value matches /@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/

// IPs
value matches /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/
```

### Cost Detection
```typescript
// High cardinality
uniqueValues / totalRecords > 0.9 && uniqueValues > 10

// Large values
typeof value === 'string' && value.length > 500

// Verbose K8s metadata
key.includes('k8s.') && (key.includes('annotation') || key.includes('label'))
```

## Benefits

1. **Faster Setup** - No manual field hunting
2. **Best Practices** - Follows OTTL privacy/cost guidelines
3. **Context-Aware** - Detects based on actual data, not assumptions
4. **Safe Defaults** - Transformations start disabled for review
5. **Transparent** - Shows exactly which fields will be affected

## Limitations

- Maximum 250 records analyzed per upload
- Detection based on field names and value patterns
- Some edge cases may require manual transformation creation
- Auto-detected transformations use simplified logic (full OTTL statements in export)

## Next Steps

After enabling auto-detected transformations:
1. **Preview** the impact on your sample data
2. **Export OTTL** to get the full configuration
3. **Deploy** to your OpenTelemetry collector
4. **Monitor** the transformation results in production
