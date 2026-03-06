# Changelog

## 0.3.0

### Breaking Changes

- **`Exact` type simplified** — `Exact<Shape, Candidate>` now only checks excess properties at the top level. Deep recursive checking of nested objects/arrays has been removed. DynamoDB key schemas are flat, so this should not affect typical usage.
- **`.key()` narrows attributes to transform parameter types** — when a spec item has a transform function, `.key()` now accepts the transform's parameter type (e.g. `Pick<Obj, 'id'>`) instead of the full entity. Callers passing full entities still work.
- **Schema keys are `readonly`** — `TableEntry` computed key fields are now `readonly`. Code that mutates computed keys on entries will get type errors.
- **Invalid schemas return `ErrorMessage<>` instead of `never`** — code checking `extends never` on schema output types may behave differently.

### Added

- **`RotoriseError`** — custom error class for all runtime errors thrown by Rotorise, enabling `catch` filtering.
- **`ErrorMessage<T>` type** — branded type for compile-time error messages in the IDE.
- **`TransformOverride`** — type-level support for narrowing `.key()` attributes based on transform parameter types.
- **Empty separator guard** — `tableEntry()({...}, '')` is now a type error via `ErrorMessage`, in addition to the existing runtime check.
- **Performance attest baselines** — new `Rotorise.attest.test.ts` with instantiation count benchmarks.
- **`files: ["dist"]`** in `package.json` — prevents source/test files from being published to npm.
- **`treeshake: true`** in tsup config — enables tree-shaking for consumers.
- **JSDoc** on `TableEntry`, `TableEntryDefinition`, and `tableEntry`.
