# field-grabber

Declarative field mapper — pick, rename, and transform fields from a source object.

## Install

```bash
npm install field-grabber
```

## Usage

```typescript
import { grabFields } from 'field-grabber';

const user = {
  handle: 'toreilly317',
  company: 'ACME INC.',
  website: 'www.example.com',
  bio: 'Hello World',
  status: 'Developer',
  skills: 'eating,sleeping,drinking coffee,coding',
  twitter: 'twitter.com/TwitterUserName',
  instagram: 'instagram.com/MyInstagramName',
  facebook: 'facebook.com',
};

const result = grabFields(user, [
  'handle',
  'company',
  'website',
  ['skills', (v) => String(v).split(',')],
  ['twitterHandle', 'twitter', (v) => String(v).split('/')[1]],
  {
    name: 'social',
    wantedFields: [
      'facebook',
      ['ig', 'instagram'],
      ['twitter', (v) => `@${String(v).split('/')[1]}`],
    ],
  },
]);
```

Result:

```json
{
  "handle": "toreilly317",
  "company": "ACME INC.",
  "website": "www.example.com",
  "skills": ["eating", "sleeping", "drinking coffee", "coding"],
  "twitterHandle": "TwitterUserName",
  "social": {
    "facebook": "facebook.com",
    "ig": "instagram.com/MyInstagramName",
    "twitter": "@TwitterUserName"
  }
}
```

## Field Spec Types

Each item in the specs array can be one of:

| Format | Example | Description |
|--------|---------|-------------|
| `string` | `'handle'` | Copy field as-is |
| `[new, source]` | `['ig', 'instagram']` | Rename a field |
| `[name, fn]` | `['skills', splitFn]` | Transform a field |
| `[new, source, fn]` | `['handle', 'twitter', parseFn]` | Rename + transform |
| `{ name, wantedFields }` | `{ name: 'social', wantedFields: [...] }` | Nested object (recursive) |

## API

### `grabFields(source, specs, options?)`

| Param | Type | Description |
|-------|------|-------------|
| `source` | `Record<string, unknown>` | The source object to extract fields from |
| `specs` | `FieldSpec[]` | Array of field specifications |
| `options` | `GrabFieldsOptions` | Optional configuration |

Returns a new `Record<string, unknown>` with only the specified fields.

### Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `onMissing` | `'throw' \| 'skip' \| 'undefined'` | `'throw'` | What to do when a source field doesn't exist |

- **`'throw'`** (default) — Throws a `FieldGrabberError` with a message identifying the missing field and the spec that referenced it. Transform errors are also wrapped with spec context.
- **`'skip'`** — Omits the field from the result entirely.
- **`'undefined'`** — Includes the field in the result with `undefined` as the value.

```typescript
// Strict (default) — throws if 'name' is missing
grabFields(data, ['name', 'email']);

// Lenient — missing fields become undefined
grabFields(data, ['name', 'email'], { onMissing: 'undefined' });

// Skip — missing fields are omitted from the result
grabFields(data, ['name', 'email'], { onMissing: 'skip' });
```

### Types

```typescript
import type {
  FieldSpec,
  TransformFn,
  NestedSpec,
  SourceObject,
  GrabFieldsOptions,
  OnMissing,
} from 'field-grabber';
```

## License

MIT
