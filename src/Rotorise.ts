import type {
    DistributiveOmit,
    DistributivePick,
    ErrorMessage,
    Exact,
    MergeIntersectionObject,
    NonEmptyArray,
    Replace,
    SliceFromStart,
    show,
    ValueOf,
} from './utils'

// When a spec item has a transform function, use the transform's parameter type
// instead of the entity's property type. This allows callers to pass only the
// fields the transform actually needs (e.g. Pick<Obj, 'id'> instead of Obj).
type TransformOverride<
    Spec extends InputSpecShape,
    K,
    Fallback,
    Matched = Extract<Spec[number], [K, (...args: any[]) => any, ...any[]]>,
> = [Matched] extends [never]
    ? Fallback
    : // Contravariant inference: when the same key appears multiple times with
      // different transforms (e.g. Pick<Obj,'id'> and Pick<Obj,'name'>),
      // this intersects the parameter types rather than unioning them.
      (
            // biome-ignore lint/suspicious/noExplicitAny: inference
            Matched extends [any, (x: infer P) => any, ...any[]]
                ? (x: P) => void
                : never
        ) extends (x: infer I) => void
      ? I
      : Fallback

export type CompositeKeyParamsImpl<
    Entity,
    InputSpec extends InputSpecShape,
    skip extends number = 1,
> = Entity extends unknown
    ? show<
          {
              [K in extractHeadOrPass<
                  SliceFromStart<
                      InputSpec,
                      number extends skip ? 1 : skip
                  >[number]
              > &
                  keyof Entity]: TransformOverride<InputSpec, K, Entity[K]>
          } & {
              [K in extractHeadOrPass<InputSpec[number]> &
                  keyof Entity]?: TransformOverride<InputSpec, K, Entity[K]>
          }
      >
    : never

export type CompositeKeyParams<
    Entity extends Record<string, unknown>,
    FullSpec extends InputSpec<MergeIntersectionObject<Entity>>[],
    skip extends number = 1,
> = CompositeKeyParamsImpl<Entity, FullSpec, skip>

type CompositeKeyBuilderImpl<
    Entity,
    Spec,
    Separator extends string = '#',
    Deep extends number = number,
    isPartial extends boolean = false,
> = Entity extends unknown
    ? CompositeKeyStringBuilder<
          Entity,
          [Deep] extends [never]
              ? Spec
              : number extends Deep
                ? Spec
                : SliceFromStart<Spec, Deep>,
          Separator,
          boolean extends isPartial ? false : isPartial
      >
    : never

export type CompositeKeyBuilder<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<MergeIntersectionObject<Entity>>[],
    Separator extends string = '#',
    Deep extends number = number,
    isPartial extends boolean = false,
> = CompositeKeyBuilderImpl<Entity, Spec, Separator, Deep, isPartial>

type joinable = string | number | bigint | boolean | null | undefined

type ExtractHelper<Key, Value> = Value extends object
    ? Value extends {
          tag: infer Tag extends string
          value: infer Value extends joinable
      }
        ? [Tag, Value]
        : Value extends {
                value: infer Value extends joinable
            }
          ? [never, Value]
          : never
    : [Key, Value]

type ExtractPair<Entity, Spec> = Spec extends [
    infer Key extends string,
    // biome-ignore lint/suspicious/noExplicitAny: required for generic transform inference
    (...key: any[]) => infer Value,
    ...unknown[],
]
    ? ExtractHelper<Uppercase<Key>, Value>
    : Spec extends keyof Entity & string
      ? [Uppercase<Spec>, Entity[Spec] & joinable]
      : never

type CompositeKeyStringBuilder<
    Entity,
    Spec,
    Separator extends string,
    KeepIntermediate extends boolean,
    Acc extends string = '',
    AllAcc extends string = never,
> = Spec extends [infer Head, ...infer Tail]
    ? ExtractPair<Entity, Head> extends [
          infer Key extends joinable,
          infer Value extends joinable,
      ]
        ? CompositeKeyStringBuilder<
              Entity,
              Tail,
              Separator,
              KeepIntermediate,
              Acc extends ''
                  ? [Key] extends [never]
                      ? `${Value}`
                      : `${Key}${Separator}${Value}`
                  : [Key] extends [never]
                    ? `${Acc}${Separator}${Value}`
                    : `${Acc}${Separator}${Key}${Separator}${Value}`,
              KeepIntermediate extends true
                  ? AllAcc | (Acc extends '' ? never : Acc)
                  : never
          >
        : never
    : AllAcc | Acc

type DiscriminatedSchemaShape = {
    discriminator: PropertyKey
    spec: {
        [k in PropertyKey]: unknown
    }
}

type InputSpecShape =
    // biome-ignore lint/suspicious/noExplicitAny: key type is erased at runtime, any is needed for structural matching
    ([PropertyKey, (key: any) => unknown, ...unknown[]] | PropertyKey)[]

export type TransformShape =
    | {
          tag?: string
          value: joinable
      }
    | joinable

type ComputeTableKeyType<
    Entity,
    Spec,
    Separator extends string,
    NullAs extends never | undefined = never,
> = Spec extends InputSpecShape
    ? CompositeKeyBuilderImpl<Entity, Spec, Separator, number, false>
    : Spec extends keyof Entity
      ? Replace<Entity[Spec], null, undefined>
      : Spec extends null
        ? NullAs
        : never

type TableEntryImpl<
    Entity,
    Schema,
    Separator extends string = '#',
> = Entity extends unknown
    ? show<
          {
              readonly [Key in keyof Schema]: Schema[Key] extends DiscriminatedSchemaShape
                  ? ComputeTableKeyType<
                        Entity,
                        ValueOf<
                            Schema[Key]['spec'],
                            ValueOf<Entity, Schema[Key]['discriminator']>
                        >,
                        Separator
                    >
                  : Schema[Key] extends keyof Entity | InputSpecShape | null
                    ? ComputeTableKeyType<Entity, Schema[Key], Separator>
                    : ErrorMessage<'Invalid schema definition'>
          } & Entity
      >
    : never

/**
 * Represents a complete DynamoDB table entry, combining the original entity
 * with its computed internal and global keys.
 *
 * @template Entity The base entity type.
 * @template Schema The schema defining the table keys.
 * @template Separator The string used to join composite key components (default: '#').
 */
export type TableEntry<
    Entity extends Record<string, unknown>,
    Schema extends Record<string, FullKeySpec<Entity>>,
    Separator extends string = '#',
> = TableEntryImpl<Entity, Schema, Separator>

type InputSpec<E> = {
    [key in keyof E]:
        | (undefined extends E[key]
              ? [
                    key,
                    (key: Exclude<E[key], undefined>) => TransformShape,
                    Exclude<E[key], undefined>,
                ]
              : [key, (key: Exclude<E[key], undefined>) => TransformShape])
        | (undefined extends E[key] ? never : null extends E[key] ? never : key)
}[keyof E]

type extractHeadOrPass<T> = T extends readonly unknown[] ? T[0] : T

type FullKeySpecSimple<Entity> =
    | NonEmptyArray<InputSpec<MergeIntersectionObject<Entity>>>
    | (keyof Entity & string)
    | null

type FullKeySpecSimpleShape = InputSpecShape | string | null

type DiscriminatedSchema<Entity, E> = {
    [key in keyof E]: E[key] extends PropertyKey
        ? {
              discriminator: key
              spec: {
                  [val in E[key]]: FullKeySpecSimple<
                      Extract<
                          Entity,
                          {
                              [k in key]: val
                          }
                      >
                  >
              }
          }
        : never
}[keyof E]

type FullKeySpec<Entity> =
    | FullKeySpecSimple<Entity>
    | DiscriminatedSchema<Entity, MergeIntersectionObject<Entity>>

type FullKeySpecShape = FullKeySpecSimpleShape | DiscriminatedSchemaShape

export class RotoriseError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'RotoriseError'
    }
}

// Runtime implementation uses `as never` casts because the generic types are
// too complex for TS to verify at the value level. Type correctness is enforced
// by the type-level types (CompositeKeyStringBuilder, TableEntryImpl, etc.) and
// validated by the attest-based test suite.

const chainableNoOpProxy: unknown = new Proxy(() => chainableNoOpProxy, {
    get: () => chainableNoOpProxy,
})

const createPathProxy = <T>(path = ''): T => {
    return new Proxy(() => {}, {
        get: (_target, prop) => {
            if (typeof prop === 'string') {
                if (prop === 'toString') {
                    return () => path
                }

                return createPathProxy(
                    path === ''
                        ? prop
                        : !Number.isNaN(Number.parseInt(prop))
                          ? `${path}[${prop}]`
                          : `${path}.${prop}`,
                )
            }
        },
    }) as T
}

const key =
    <const Entity>() =>
    <
        const Schema extends Record<
            string,
            | InputSpec<MergeIntersectionObject<Entity>>[]
            | keyof Entity
            | {
                  discriminator: keyof Entity
                  spec: {
                      [val in string]:
                          | InputSpec<MergeIntersectionObject<Entity>>[]
                          | keyof Entity
                  }
              }
        >,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ) =>
    <
        const Key extends keyof Schema,
        const Config extends {
            depth?: number
            allowPartial?: boolean
            enforceBoundary?: boolean
        },
        const Attributes extends Partial<Entity>,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ): string | undefined => {
        const case_ = schema[key]

        if (case_ === undefined) {
            throw new RotoriseError(`Key ${key.toString()} not found in schema`)
        }
        let structure: InputSpec<MergeIntersectionObject<Entity>>[]

        if (Array.isArray(case_)) {
            structure = case_
        } else if (typeof case_ === 'object') {
            const discriminator =
                attributes[case_.discriminator as keyof Attributes]
            if (discriminator === undefined) {
                throw new RotoriseError(
                    `Discriminator ${case_.discriminator.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
            const val = case_.spec[discriminator as keyof typeof case_.spec]
            if (val === undefined) {
                throw new RotoriseError(
                    `Discriminator value ${discriminator?.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
            if (val === null) {
                return undefined
            }

            if (!Array.isArray(val)) {
                return attributes[val as keyof Attributes] as never
            }

            structure = val
        } else {
            const value = attributes[case_ as keyof Attributes]
            if (value == null) return undefined as never

            return value as never
        }

        const fullLength = structure.length

        if (config?.depth !== undefined) {
            structure = structure.slice(0, config.depth) as typeof structure
        }
        const composite: joinable[] = []

        for (const keySpec of structure) {
            const [key, transform, Default] = Array.isArray(keySpec)
                ? keySpec
                : [keySpec]

            const value = attributes[key as keyof Attributes] ?? Default

            if (transform && value !== undefined) {
                const transformed = transform(value as never)
                if (typeof transformed === 'object' && transformed !== null) {
                    if (transformed.tag !== undefined)
                        composite.push(transformed.tag)
                    composite.push(transformed.value)
                } else {
                    composite.push(key.toString().toUpperCase())
                    composite.push(transformed)
                }
            } else if (value !== undefined && value !== null && value !== '') {
                composite.push(key.toString().toUpperCase())
                composite.push(value as joinable)
            } else if (config?.allowPartial) {
                break
            } else {
                throw new RotoriseError(
                    `buildCompositeKey: Attribute ${key.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
        }

        // Each spec element produces 2 segments (KEY, value). If fewer segments
        // were emitted than expected (partial key), append a trailing separator.
        if (config?.enforceBoundary && fullLength * 2 > composite.length) {
            composite.push('')
        }

        return composite.join(separator) as never
    }

const toEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<
            string,
            | InputSpec<MergeIntersectionObject<Entity>>[]
            | keyof Entity
            | {
                  discriminator: keyof Entity
                  spec: {
                      [val in string]:
                          | InputSpec<MergeIntersectionObject<Entity>>[]
                          | keyof Entity
                  }
              }
        >,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ) =>
    <const ExactEntity extends Entity>(
        item: ExactEntity,
    ): ExactEntity extends infer E extends Entity
        ? TableEntryImpl<E, Schema, Separator>
        : never => {
        const entry = { ...item }
        const buildKey = key<Entity>()(schema, separator)

        for (const key_ in schema) {
            const val = buildKey(key_, item)
            if (val !== undefined) {
                entry[key_] = val satisfies string as never
            }
        }
        return entry as never
    }

const fromEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpecShape>,
        Separator extends string = '#',
    >(
        schema: Schema,
    ) =>
    <const Entry extends TableEntryImpl<Entity, Schema, Separator>>(
        entry: Entry,
    ): DistributiveOmit<Entry, keyof Schema> => {
        const item = { ...entry }

        for (const key_ in schema) {
            delete item[key_]
        }
        return item as never
    }

type ProcessSpecType<
    Entity,
    Spec,
    Config extends SpecConfigShape,
> = Spec extends string
    ? DistributivePick<Entity, Spec>
    : Spec extends InputSpecShape
      ? CompositeKeyParamsImpl<
            Entity,
            Spec,
            Config['allowPartial'] extends true
                ? 1
                : Extract<Config['depth'], number>
        >
      : Spec extends null | undefined
        ? unknown
        : ErrorMessage<'Invalid Spec: Expected string, InputSpecShape, null or undefined'>

// Cache commonly used conditional types
type SpecConfig<Spec> = Spec extends string ? never : SpecConfigShape

type SpecConfigShape = {
    depth?: number
    allowPartial?: boolean
    enforceBoundary?: boolean
}

// Pre-compute discriminated variant types
type ExtractVariant<Entity, K extends PropertyKey, V extends PropertyKey> = [
    Entity,
] extends [never]
    ? never
    : Extract<Entity, { [k in K]: V }>

type TagVariant<Entity, K extends PropertyKey, V extends PropertyKey> = [
    Entity,
] extends [never]
    ? { [k in K]: V }
    : Entity & { [k in K]: V }

// Flatten nested type computation
type ProcessVariant<
    Entity,
    K extends PropertyKey,
    V extends PropertyKey,
    Spec extends DiscriminatedSchemaShape,
    Config extends SpecConfigShape,
    VariantSpec = Spec['spec'][V & keyof Spec['spec']],
> = TagVariant<
    VariantSpec extends null | undefined
        ? unknown
        : ProcessSpecType<ExtractVariant<Entity, K, V>, VariantSpec, Config>,
    K,
    V
>

// Optimized attribute processing
type OptimizedAttributes<Entity, Spec, Config extends SpecConfigShape> = show<
    Spec extends DiscriminatedSchemaShape
        ? {
              [K in Spec['discriminator']]: {
                  [V in keyof Spec['spec']]: ProcessVariant<
                      Entity,
                      K,
                      V,
                      Spec,
                      Config
                  >
              }[keyof Spec['spec']]
          }[Spec['discriminator']]
        : ProcessSpecType<Entity, Spec, Config>
>

type ProcessKey<
    Entity,
    Spec,
    Separator extends string,
    NullAs extends never | undefined = never,
    Config extends SpecConfigShape = SpecConfigShape,
    Attributes = Pick<Entity, Spec & keyof Entity>,
> = [Entity] extends [never]
    ? never
    : Spec extends keyof Entity
      ? Replace<ValueOf<Attributes>, null, undefined>
      : Spec extends InputSpecShape
        ? CompositeKeyBuilderImpl<
              Entity,
              Spec,
              Separator,
              Exclude<Config['depth'], undefined>,
              Exclude<Config['allowPartial'], undefined>
          >
        : Spec extends null | undefined
          ? NullAs
          : ErrorMessage<'Invalid Spec'>

type OptimizedBuiltKey<
    Entity,
    Spec,
    Separator extends string,
    Config extends SpecConfigShape,
    Attributes,
> = Entity extends unknown
    ? show<
          Spec extends DiscriminatedSchemaShape
              ? ProcessKey<
                    Entity,
                    ValueOf<
                        Spec['spec'],
                        ValueOf<Entity, Spec['discriminator']>
                    >,
                    Separator,
                    undefined,
                    Config,
                    Attributes
                >
              : ProcessKey<
                    Entity,
                    Spec,
                    Separator,
                    undefined,
                    Config,
                    Attributes
                >
      >
    : never

type TableEntryDefinition<Entity, Schema, Separator extends string> = {
    /**
     * Converts a raw entity into a complete table entry with all keys computed.
     * Use this when preparing items for insertion into DynamoDB.
     */
    toEntry: <const ExactEntity>(
        item: Exact<Entity, ExactEntity>,
    ) => TableEntryImpl<ExactEntity, Schema, Separator>

    /**
     * Extracts the raw entity from a table entry by removing all computed keys.
     * Use this when processing items retrieved from DynamoDB.
     */
    fromEntry: <const Entry extends TableEntryImpl<Entity, Schema, Separator>>(
        entry: Entry,
    ) => DistributiveOmit<Entry, keyof Schema>

    /**
     * Generates a specific key for the given entity attributes.
     * Supports partial keys and depth limiting for query operations.
     *
     * @param key The name of the key to generate (e.g., 'PK', 'GSIPK').
     * @param attributes the object containing the values needed to build the key.
     * @param config Optional configuration for partial keys or depth limiting.
     */
    key: <
        const Key extends keyof Schema,
        const Config extends SpecConfig<Spec>,
        const Attributes extends OptimizedAttributes<Entity, Spec, Config_>,
        Spec = Schema[Key],
        Config_ extends SpecConfigShape = [SpecConfigShape] extends [Config]
            ? {
                  depth?: undefined
                  allowPartial?: undefined
                  enforceBoundary?: boolean
              }
            : Config,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ) => OptimizedBuiltKey<Attributes, Spec, Separator, Config_, Attributes>

    /**
     * A zero-runtime inference helper. Use this with `typeof` to get the
     * total type of a table entry.
     */
    infer: TableEntryImpl<Entity, Schema, Separator>

    /**
     * Creates a proxy to generate property paths as strings.
     * Useful for building UpdateExpressions or ProjectionExpressions.
     *
     * @example
     * table.path().data.nested.property.toString() // returns "data.nested.property"
     */
    path: () => TableEntryImpl<Entity, Schema, Separator>
}

/**
 * Entry point for defining a DynamoDB table schema with Rotorise.
 *
 * @template Entity The base entity type that this table represents.
 * @returns A builder function that accepts the schema and an optional separator.
 *
 * Note: the double-call `<Entity>()(schema)` is required for partial type parameter inference.
 *
 * @example
 * const userTable = tableEntry<User>()({
 *   PK: ["orgId", "id"],
 *   SK: "role"
 * })
 */
export const tableEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
        ...[separator]: [Separator] extends ['']
            ? [ErrorMessage<'Separator must not be an empty string'>]
            : [separator?: Separator]
    ): TableEntryDefinition<Entity, Schema, Separator> => {
        const sep = separator ?? ('#' as Separator)
        if (sep === '' || typeof sep !== 'string') {
            throw new RotoriseError('Separator must not be an empty string')
        }
        return {
            toEntry: toEntry()(schema as never, sep) as never,
            fromEntry: fromEntry()(schema as never) as never,
            key: key()(schema as never, sep) as never,
            infer: chainableNoOpProxy as never,
            path: () => createPathProxy() as never,
        }
    }
