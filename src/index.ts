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

function isNestedSpec(spec: FieldSpec): spec is NestedSpec {
  return typeof spec === 'object' && !Array.isArray(spec) && 'name' in spec;
}

function processArraySpec(
  source: SourceObject,
  spec: [string, string] | [string, TransformFn] | [string, string, TransformFn],
  result: Record<string, unknown>,
): void {
  if (spec.length === 3) {
    const [newName, sourceField, transform] = spec;
    result[newName] = transform(source[sourceField]);
    return;
  }

  const [first, second] = spec;

  if (typeof second === 'function') {
    result[first] = second(source[first]);
  } else {
    result[first] = source[second];
  }
}

function processSpec(
  source: SourceObject,
  spec: FieldSpec,
  result: Record<string, unknown>,
): void {
  if (typeof spec === 'string') {
    result[spec] = source[spec];
    return;
  }

  if (Array.isArray(spec)) {
    processArraySpec(source, spec, result);
    return;
  }

  if (isNestedSpec(spec)) {
    result[spec.name] = grabFields(source, spec.wantedFields);
  }
}

export function grabFields(
  source: SourceObject,
  specs: FieldSpec[],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const spec of specs) {
    processSpec(source, spec, result);
  }

  return result;
}
