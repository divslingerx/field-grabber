export type TransformFn = (value: unknown) => unknown;

export type NestedSpec = {
  name: string;
  wantedFields: FieldSpec[];
};

export type FieldSpec =
  | string
  | [name: string, sourceField: string]
  | [name: string, transform: TransformFn]
  | [newName: string, sourceField: string, transform: TransformFn]
  | NestedSpec;

export type SourceObject = Record<string, unknown>;

export type OnMissing = 'throw' | 'skip' | 'undefined';

export type GrabFieldsOptions = {
  /** What to do when a source field doesn't exist. Default: 'throw' */
  onMissing?: OnMissing;
};

class FieldGrabberError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FieldGrabberError';
  }
}

function isNestedSpec(spec: FieldSpec): spec is NestedSpec {
  return typeof spec === 'object' && !Array.isArray(spec) && 'name' in spec;
}

function specLabel(spec: FieldSpec): string {
  if (typeof spec === 'string') return `'${spec}'`;
  if (Array.isArray(spec)) return `[${spec.map((s) => (typeof s === 'function' ? 'fn' : `'${s}'`)).join(', ')}]`;
  return `{ name: '${spec.name}' }`;
}

function getField(
  source: SourceObject,
  field: string,
  spec: FieldSpec,
  onMissing: OnMissing,
): { value: unknown; skip: boolean } {
  if (field in source) {
    return { value: source[field], skip: false };
  }

  switch (onMissing) {
    case 'throw':
      throw new FieldGrabberError(
        `Missing field '${field}' in source object (spec: ${specLabel(spec)})`,
      );
    case 'skip':
      return { value: undefined, skip: true };
    case 'undefined':
      return { value: undefined, skip: false };
  }
}

function applyTransform(
  transform: TransformFn,
  value: unknown,
  spec: FieldSpec,
): unknown {
  try {
    return transform(value);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new FieldGrabberError(
      `Transform failed for spec ${specLabel(spec)}: ${message}`,
    );
  }
}

function processArraySpec(
  source: SourceObject,
  spec: [string, string] | [string, TransformFn] | [string, string, TransformFn],
  result: Record<string, unknown>,
  onMissing: OnMissing,
): void {
  if (spec.length === 3) {
    const [newName, sourceField, transform] = spec;
    const { value, skip } = getField(source, sourceField, spec, onMissing);
    if (!skip) result[newName] = applyTransform(transform, value, spec);
    return;
  }

  const [first, second] = spec;

  if (typeof second === 'function') {
    const { value, skip } = getField(source, first, spec, onMissing);
    if (!skip) result[first] = applyTransform(second, value, spec);
  } else {
    const { value, skip } = getField(source, second, spec, onMissing);
    if (!skip) result[first] = value;
  }
}

function processSpec(
  source: SourceObject,
  spec: FieldSpec,
  result: Record<string, unknown>,
  onMissing: OnMissing,
): void {
  if (typeof spec === 'string') {
    const { value, skip } = getField(source, spec, spec, onMissing);
    if (!skip) result[spec] = value;
    return;
  }

  if (Array.isArray(spec)) {
    processArraySpec(source, spec, result, onMissing);
    return;
  }

  if (isNestedSpec(spec)) {
    result[spec.name] = grabFields(source, spec.wantedFields, { onMissing });
  }
}

export function grabFields(
  source: SourceObject,
  specs: FieldSpec[],
  options: GrabFieldsOptions = {},
): Record<string, unknown> {
  const { onMissing = 'throw' } = options;
  const result: Record<string, unknown> = {};

  for (const spec of specs) {
    processSpec(source, spec, result, onMissing);
  }

  return result;
}
