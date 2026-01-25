import type {
    DistributiveOmit,
    DistributivePick,
    Exact,
    MergeIntersectionObject,
    NonEmptyArray,
    Replace,
    SliceFromStart,
    ValueOf,
    show,
    conform,
    ErrorMessage,
    satisfy,
    evaluate,
} from './utils'

export const hkt: unique symbol = Symbol('hkt')
export const SchemaConfigs: unique symbol = Symbol('config')
type configKey = typeof SchemaConfigs

export abstract class Hkt<F = unknown> {
    declare readonly [hkt]: F
    abstract body: unknown
    abstract transform(
        v: string | number | bigint | boolean,
    ): joinable | TransformShape
    declare readonly [0]: unknown
}

/**
 * Base HKT for tag mapping (key casing/transformations).
 */
export abstract class TagHkt extends Hkt {
    abstract override body: string
    abstract override transform(v: string): string
}

export type apply<H extends Hkt, Arg> = (H & {
    readonly [0]: Arg
})['body']

type MapTag<H extends TagHkt, T extends string> = H extends UppercaseMapper
    ? Uppercase<T>
    : H extends LowercaseMapper
      ? Lowercase<T>
      : H extends IdentityMapper
        ? T
        : apply<H, T> & string

type PartialPick<T, K extends keyof T> = { [P in K]?: T[P] }

export type CompositeKeyParamsImpl<
    Entity,
    Spec extends unknown[],
    skip extends number = 1,
> = Entity extends unknown
    ? Pick<
          Entity,
          extractHeadOrPass<
              SliceFromStart<Spec, number extends skip ? 1 : skip>[number]
          > &
              keyof Entity
      > &
          PartialPick<Entity, extractHeadOrPass<Spec[number]> & keyof Entity>
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
    TagMapper extends TagHkt = UppercaseMapper,
> = Entity extends unknown
    ? CompositeKeyStringBuilder<
          Entity,
          [Deep] extends [never]
              ? Spec
              : number extends Deep
                ? Spec
                : SliceFromStart<Spec, Deep>,
          Separator,
          boolean extends isPartial ? false : isPartial,
          TagMapper
      >
    : never

export type CompositeKeyBuilder<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<MergeIntersectionObject<Entity>>[],
    Separator extends string = '#',
    Deep extends number = number,
    isPartial extends boolean = false,
    TagMapper extends TagHkt = UppercaseMapper,
> = CompositeKeyBuilderImpl<Entity, Spec, Separator, Deep, isPartial, TagMapper>

type joinable = string | number | bigint | boolean | null | undefined

type ExtractHelper<Key, Value> = Value extends {
    value: infer V extends joinable
}
    ? Value extends { tag: infer Tag extends string }
        ? [Tag, V]
        : [never, V]
    : [Key, Value]

type ApplyHkt<H extends Hkt, Arg> = H extends UppercaseHkt
    ? Uppercase<`${conform<Arg, string | number | bigint | boolean>}`>
    : H extends Prefix<infer P>
      ? `${P}${conform<Arg, string | number | bigint | boolean>}`
      : H extends Suffix<infer S>
        ? `${conform<Arg, string | number | bigint | boolean>}${S}`
        : apply<H, Arg>

type ExtractPair<Entity, Spec, TagMapper extends TagHkt> = Spec extends [
    infer Key extends string,
    infer Transform,
    ...unknown[],
]
    ? ExtractHelper<
          MapTag<TagMapper, Key>,
          Transform extends Hkt
              ? ApplyHkt<Transform, Entity[Key & keyof Entity]>
              : Transform extends (...args: never[]) => infer Value
                ? Value
                : never
      >
    : Spec extends keyof Entity & string
      ? [MapTag<TagMapper, Spec>, Entity[Spec] & joinable]
      : never

type CompositeKeyStringBuilder<
    Entity,
    Spec,
    Separator extends string,
    KeepIntermediate extends boolean,
    TagMapper extends TagHkt,
    Acc extends string = '',
    AllAcc extends string = never,
> = Spec extends [infer Head, ...infer Tail]
    ? ExtractPair<Entity, Head, TagMapper> extends [
          infer Key extends joinable,
          infer Value extends joinable,
      ]
        ? CompositeKeyStringBuilder<
              Entity,
              Tail,
              Separator,
              KeepIntermediate,
              TagMapper,
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
    // biome-ignore lint/suspicious/noExplicitAny: ggg
    ([PropertyKey, Hkt | ((key: any) => unknown), ...unknown[]] | PropertyKey)[]

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
    TagMapper extends TagHkt,
> = Spec extends InputSpecShape
    ? CompositeKeyBuilderImpl<Entity, Spec, Separator, number, false, TagMapper>
    : Spec extends keyof Entity & string
      ? Replace<Entity[Spec], null, undefined>
      : never

type extractHeadOrPass<T> = T extends readonly unknown[] ? T[0] : T

/**
 * Configuration for a DynamoDB table schema.
 */
export type TableSchemaConfig = {
    readonly separator?: string
    readonly tagMapper?: TagHkt
}

/**
 * A structured DynamoDB table schema, including key definitions and optional configuration.
 *
 * @template Entity The base entity type.
 * @template Keys The key definitions (e.g., PK, SK, GSI1PK).
 * @template Config Optional configuration for the table (e.g., separator, tagMapper).
 */
export type TableSchema<Entity> = Record<string, FullKeySpec<Entity>> & {
    readonly [SchemaConfigs]?: TableSchemaConfig
}

type TableEntryImpl<
    Entity,
    Schema extends Record<string, FullKeySpecShape>,
    Config extends TableSchemaConfig,
    Separator extends string = Config['separator'] extends string
        ? Config['separator']
        : '#',
    TagMapper extends TagHkt = Config['tagMapper'] extends TagHkt
        ? Config['tagMapper']
        : UppercaseMapper,
> = Entity extends unknown
    ? {
          readonly [Key in keyof Schema &
              string]: Schema[Key] extends DiscriminatedSchemaShape
              ? ComputeTableKeyType<
                    Entity,
                    Schema[Key]['spec'][Entity[Schema[Key]['discriminator'] &
                        keyof Entity] &
                        keyof Schema[Key]['spec']],
                    Separator,
                    TagMapper
                >
              : Schema[Key] extends keyof Entity | InputSpecShape | null
                ? ComputeTableKeyType<Entity, Schema[Key], Separator, TagMapper>
                : ErrorMessage<'Invalid schema definition'>
      } & Entity
    : never

/**
 * Represents a complete DynamoDB table entry, combining the original entity
 * with its computed internal and global keys.
 *
 * @template Entity The base entity type.
 * @template Schema The schema defining the table keys.
 */
export type TableEntry<
    Entity extends Record<string, unknown>,
    Schema extends TableSchema<Entity>,
> = TableEntryImpl<Entity, Omit<Schema, configKey>, Schema[configKey] & {}>

type InputSpec<E> = {
    [key in keyof E]:
        | (undefined extends E[key]
              ? [
                    key,
                    ((key: Exclude<E[key], undefined>) => TransformShape) | Hkt,
                    Exclude<E[key], undefined>,
                ]
              : [
                    key,
                    ((key: Exclude<E[key], undefined>) => TransformShape) | Hkt,
                ])
        | (undefined extends E[key] ? never : null extends E[key] ? never : key)
}[keyof E]

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
    <const Schema extends TableSchema<Entity>>(schema: Schema) =>
    <
        const Key extends Extract<keyof Schema, string>,
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
        const conf = schema[SchemaConfigs]
        const separator = conf?.separator ?? '#'
        const tagMapper = conf?.tagMapper ?? tagMappers.uppercase
        const case_ = schema[key as keyof typeof schema] as
            | FullKeySpec<Entity>
            | undefined

        if (case_ === undefined) {
            throw new Error(`Key ${key.toString()} not found in schema`)
        }
        let structure: InputSpec<MergeIntersectionObject<Entity>>[]

        if (case_ == null) return undefined as never

        if (Array.isArray(case_)) {
            structure = case_
        } else if (typeof case_ === 'object' && 'discriminator' in case_) {
            const discriminator = attributes[case_.discriminator]
            if (discriminator == null) {
                throw new Error(
                    `Discriminator ${case_.discriminator.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
            const val =
                case_.spec[discriminator as unknown as keyof typeof case_.spec]
            if (val === undefined) {
                throw new Error(
                    `Discriminator value ${discriminator?.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
            if (val === null) {
                return undefined
            }

            if (!Array.isArray(val)) {
                return attributes[val as keyof Attributes] as never
            }

            structure = val as NonEmptyArray<
                InputSpec<MergeIntersectionObject<Entity>>
            >
        } else {
            const value = attributes[case_ as keyof Attributes]
            if (value == null) return undefined as never

            return value as never
        }

        const fullLength = structure.length

        if (config?.depth !== undefined) {
            structure = structure.slice(0, config.depth) as never
        }
        const composite: joinable[] = []

        for (const keySpec of structure) {
            const [key, transform, Default] = Array.isArray(keySpec)
                ? keySpec
                : [keySpec]

            const value = attributes[key as keyof Attributes] ?? Default

            if (transform && value !== undefined) {
                let transformed: any
                if (typeof transform === 'function') {
                    transformed = transform(value as never)
                } else if (
                    typeof transform === 'object' &&
                    transform !== null &&
                    'transform' in transform
                ) {
                    transformed = (transform as any).transform(value)
                }

                if (typeof transformed === 'object' && transformed !== null) {
                    if (transformed.tag !== undefined)
                        composite.push(transformed.tag)
                    composite.push(transformed.value)
                } else {
                    composite.push(tagMapper.transform(key.toString()))
                    composite.push(transformed)
                }
            } else if (value !== undefined && value !== null && value !== '') {
                composite.push(tagMapper.transform(key.toString()))
                composite.push(value as joinable)
            } else if (config?.allowPartial) {
                break
            } else {
                throw new Error(
                    `buildCompositeKey: Attribute ${key.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
        }

        if (config?.enforceBoundary && fullLength * 2 > composite.length) {
            composite.push('')
        }

        return composite.join(separator) as never
    }

const toEntry =
    <const Entity extends Record<string, unknown>>() =>
    <const Schema extends TableSchema<Entity>>(schema: Schema) =>
    <const ExactEntity extends Entity>(item: ExactEntity): any => {
        const entry = { ...item }
        const keyFn = key<Entity>()(schema)
        for (const key_ in schema) {
            const val = keyFn(key_, item)
            if (val !== undefined) {
                entry[key_] = val satisfies string as never
            }
        }
        // console.log({ entry })
        return entry as never
    }

const fromEntry =
    <const Entity extends Record<string, unknown>>() =>
    <const Schema extends TableSchema<Entity>>(schema: Schema) =>
    <const Entry extends TableEntry<Entity, Schema>>(
        entry: Entry,
    ): DistributiveOmit<Entry, keyof Schema> => {
        const item = { ...entry }

        for (const key_ in schema) {
            delete item[key_]
        }
        // console.log({ item })
        return item as never
    }

export const path = <T>(): T => createPathProxy()

type ProcessKey<
    Entity,
    Spec,
    Separator extends string,
    TagMapper extends TagHkt,
    NullAs extends never | undefined = never,
    Config extends SpecConfigShape = SpecConfigShape,
    Attributes = Pick<Entity, Spec & keyof Entity & string>,
> = [Entity] extends [never]
    ? never
    : Spec extends keyof Entity & string
      ? Replace<ValueOf<Attributes>, null, undefined>
      : Spec extends InputSpecShape
        ? CompositeKeyBuilderImpl<
              Entity,
              Spec,
              Separator,
              Exclude<Config['depth'], undefined>,
              Exclude<Config['allowPartial'], undefined>,
              TagMapper
          >
        : Spec extends null | undefined
          ? NullAs
          : ErrorMessage<'Invalid Spec'>

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
type OptimizedAttributes<
    Entity,
    Spec,
    Config extends SpecConfigShape,
> = Spec extends DiscriminatedSchemaShape
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

type OptimizedBuildedKey<
    Attributes,
    Spec,
    Config extends SpecConfigShape,
    C extends TableSchemaConfig,
    Separator extends string = C['separator'] extends string
        ? C['separator']
        : '#',
    TagMapper extends TagHkt = C['tagMapper'] extends TagHkt
        ? C['tagMapper']
        : UppercaseMapper,
> = Attributes extends unknown
    ? show<
          ProcessKey<
              Attributes,
              Spec extends DiscriminatedSchemaShape
                  ? ValueOf<
                        Spec['spec'],
                        ValueOf<Attributes, Spec['discriminator']>
                    >
                  : Spec,
              Separator,
              TagMapper,
              undefined,
              Config,
              Attributes
          >
      >
    : never

type TableEntryDefinition<
    Entity extends Record<string, any>,
    Schema extends TableSchema<Entity>,
> = {
    /**
     * Converts a raw entity into a complete table entry with all keys computed.
     * Use this when preparing items for insertion into DynamoDB.
     */
    toEntry: <const ExactEntity>(
        item: Exact<Entity, ExactEntity>,
    ) => TableEntryImpl<
        ExactEntity,
        Omit<Schema, configKey>,
        Schema[configKey] & {}
    >

    /**
     * Extracts the raw entity from a table entry by removing all computed keys.
     * Use this when processing items retrieved from DynamoDB.
     */
    fromEntry: <const Entry extends TableEntry<Entity, Schema>>(
        entry: Entry,
    ) => Extract<Entity, DistributiveOmit<Entry, keyof Schema>>

    /**
     * Generates a specific key for the given entity attributes.
     * Supports partial keys and depth limiting for query operations.
     *
     * @param key The name of the key to generate (e.g., 'PK', 'GSIPK').
     * @param attributes the object containing the values needed to build the key.
     * @param config Optional configuration for partial keys or depth limiting.
     */
    key: <
        const Key extends Exclude<keyof Schema, configKey>,
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
    ) => OptimizedBuildedKey<Attributes, Spec, Config_, Schema[configKey] & {}>

    /**
     * A zero-runtime inference helper. Use this with `typeof` to get the
     * total type of a table entry.
     */
    infer: TableEntry<Entity, Schema>

    /**
     * Creates a proxy to generate property paths as strings.
     * Useful for building UpdateExpressions or ProjectionExpressions.
     *
     * @example
     * table.path().data.nested.property.toString() // returns "data.nested.property"
     */
    path: () => TableEntry<Entity, Schema>
}

/**
 * Entry point for defining a DynamoDB table schema with Rotorise.
 *
 * @template Entity The base entity type that this table represents.
 * @returns A builder function that accepts the schema and optional configuration.
 *
 * @example
 * const userTable = tableEntry<User>()({
 *   PK: ["orgId", "id"],
 *   SK: "role",
 *   [config]: { separator: "#" }
 * })
 */
export const tableEntry =
    <const Entity extends Record<string, unknown>>() =>
    <const Schema extends TableSchema<Entity>>(
        schema: Schema,
    ): TableEntryDefinition<Entity, Schema> => {
        return {
            toEntry: toEntry()(schema as never) as never,
            fromEntry: fromEntry()(schema as never) as never,
            key: key()(schema as never) as never,
            infer: chainableNoOpProxy as never,
            path: path,
        }
    }

// --- Standard HKT Implementations ---

/**
 * Prepends a prefix to the value.
 */
export class Prefix<P extends string> extends Hkt {
    constructor(private p: P) {
        super()
    }
    override body: `${P}${conform<this[0], string | number | bigint | boolean>}` =
        undefined as never
    transform(v: string | number | bigint | boolean) {
        return `${this.p}${v}`
    }
}

/**
 * Appends a suffix to the value.
 */
export class Suffix<S extends string> extends Hkt {
    constructor(private s: S) {
        super()
    }
    override body: `${conform<this[0], string | number | bigint | boolean>}${S}` =
        undefined as never
    transform(v: string | number | bigint | boolean) {
        return `${v}${this.s}`
    }
}

/**
 * Converts the value to uppercase.
 */
export class UppercaseHkt extends Hkt {
    override body: Uppercase<`${conform<this[0], string | number | bigint | boolean>}`> =
        undefined as never
    transform(v: string | number | bigint | boolean) {
        return String(v).toUpperCase()
    }
}

export const uppercase = new UppercaseHkt()

// --- Tag Mapper Implementations ---

/**
 * Maps tags to uppercase (Default).
 */
export class UppercaseMapper extends TagHkt {
    override body: Uppercase<conform<this[0], string>> = undefined as never
    transform(v: string) {
        return v.toUpperCase()
    }
}

/**
 * Maps tags to lowercase.
 */
export class LowercaseMapper extends TagHkt {
    override body: Lowercase<conform<this[0], string>> = undefined as never
    transform(v: string) {
        return v.toLowerCase()
    }
}

/**
 * Maintains the original casing of the tag.
 */
export class IdentityMapper extends TagHkt {
    override body: conform<this[0], string> = undefined as never
    transform(v: string) {
        return v
    }
}

export const tagMappers = {
    uppercase: new UppercaseMapper(),
    lowercase: new LowercaseMapper(),
    identity: new IdentityMapper(),
}
