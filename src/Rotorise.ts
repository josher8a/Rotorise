import type {
    DistributiveOmit,
    DistributivePick,
    Exact,
    NonEmptyArray,
    Replace,
    SliceFromStart,
    ValueOf,
    evaluate,
    MergeIntersectionObject,
} from './utils'

export type CompositeKeyParamsImpl<
    Entity,
    InputSpec extends InputSpecShape,
    skip extends number = 1,
> = Entity extends unknown
    ? evaluate<
          Pick<
              Entity,
              extractHeadOrPass<
                  SliceFromStart<
                      InputSpec,
                      number extends skip ? 1 : skip
                  >[number]
              > &
                  keyof Entity
          > &
              Partial<
                  Pick<
                      Entity,
                      extractHeadOrPass<InputSpec[number]> & keyof Entity
                  >
              >
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
    ? Join<
          CompositeKeyRec<
              Entity,
              number extends Deep ? Spec : SliceFromStart<Spec, Deep>
          >,
          Separator,
          (boolean extends isPartial ? false : isPartial) extends false
              ? false
              : true
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
type joinablePair = [joinable, joinable]

type Join<
    Pairs,
    Separator extends string,
    KeepIntermediate extends boolean = false,
    Acc extends string = '',
    AllAcc extends string = never,
> = Pairs extends [infer Head extends joinablePair, ...infer Tail]
    ? Join<
          Tail,
          Separator,
          KeepIntermediate,
          Acc extends ''
              ? [Head[0]] extends [never] ? `${Head[1]}` : `${Head[0]}${Separator}${Head[1]}`
              : [Head[0]] extends [never] ? `${Acc}${Separator}${Head[1]}` : `${Acc}${Separator}${Head[0]}${Separator}${Head[1]}`,
          KeepIntermediate extends true
              ? AllAcc | (Acc extends '' ? never : Acc)
              : never
      >
    : AllAcc | Acc

type ExtractPair<Entity, Spec> = Spec extends [
    infer Key extends string,
    // biome-ignore lint/suspicious/noExplicitAny: <explanation>
    (...key: any[]) => infer Value,
]
    ? Value extends joinable
        ? [Uppercase<Key>, Value]
        : Value extends {
                tag: infer Tag extends string
                value: infer Value extends joinable
            }
          ? [Tag, Value]
          : Value extends {
                  tag?: undefined
                  value: infer Value extends joinable
              }
            ? [never, Value]
            : never
    : Spec extends keyof Entity & string
      ? [Uppercase<Spec>, Entity[Spec] & joinable]
      : never

type CompositeKeyRec<
    Entity,
    Spec,
    Acc extends joinablePair[] = [],
    KeysCache extends string = keyof Entity & string,
> = Spec extends [infer Head, ...infer Tail]
    ? CompositeKeyRec<
          Entity,
          Tail,
          [...Acc, ExtractPair<Entity, Head>],
          KeysCache
      >
    : Acc

type DiscriminatedSchemaShape = {
    discriminator: PropertyKey
    spec: {
        [k in PropertyKey]: unknown
    }
}

// biome-ignore lint/suspicious/noExplicitAny: <explanation>
type InputSpecShape = ([PropertyKey, (key: any) => unknown] | PropertyKey)[]
export type TransformShape =
    | {
          tag?: string
          value: joinable
      }
    | joinable

type TableEntryImpl<
    Entity,
    Schema,
    Separator extends string = '#',
> = Entity extends unknown
    ? {
          [Key in keyof Schema]: Schema[Key] extends DiscriminatedSchemaShape
              ? ValueOf<{
                    [K in Schema[Key]['discriminator']]: {
                        [V in keyof Schema[Key]['spec']]: ProcessKey<
                            Entity,
                            Schema[Key]['spec'][V],
                            Separator
                        >
                    }[Entity[K & keyof Entity] & keyof Schema[Key]['spec']]
                }>
              : ProcessKey<Entity, Schema[Key], Separator>
      } & Entity
    : never

export type TableEntry<
    Entity extends Record<string, unknown>,
    Schema extends Record<string, FullKeySpec<Entity>>,
    Separator extends string = '#',
> = TableEntryImpl<Entity, Schema, Separator>

type InputSpec<E> = {
    [key in keyof E]:
        | [key, (key: E[key]) => TransformShape]
        | (undefined extends E[key] ? never : null extends E[key] ? never : key)
}[keyof E]

type extractHeadOrPass<T> = T extends unknown[] ? T[0] : T

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
        const Config extends { depth?: number; allowPartial?: boolean },
        const Attributes extends Partial<Entity>,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ): string | undefined => {
        const case_ = schema[key]

        if (case_ === undefined) {
            throw new Error(`Key ${key.toString()} not found in schema`)
        }
        let structure: InputSpec<MergeIntersectionObject<Entity>>[]

        if (Array.isArray(case_)) {
            structure = case_
        } else if (typeof case_ === 'object') {
            const discriminator =
                attributes[case_.discriminator as keyof Attributes]
            if (discriminator === undefined) {
                throw new Error(
                    `Discriminator ${case_.discriminator.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
            const val = case_.spec[discriminator as keyof typeof case_.spec]
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

            structure = val
        } else {
            const value = attributes[case_ as keyof Attributes]
            if (value == null) return undefined as never

            return value as never
        }

        if (config?.depth !== undefined) {
            structure = structure.slice(0, config.depth) as never
        }
        const composite: joinable[] = []

        for (const keySpec of structure) {
            const [key, transform] = Array.isArray(keySpec)
                ? keySpec
                : [keySpec]

            const value = attributes[key as keyof Attributes]

            if (transform) {
                const transformed = transform(value as never)
                if (typeof transformed === 'object' && transformed !== null) {
                    if(transformed.tag !== undefined) composite.push(transformed.tag)
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
                throw new Error(
                    `buildCompositeKey: Attribute ${key.toString()} not found in ${JSON.stringify(attributes)}`,
                )
            }
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

        for (const key_ in schema) {
            const val = key<Entity>()(schema, separator)(key_, item)
            if (val !== undefined) {
                entry[key_] = val satisfies string as never
            }
        }
        // console.log({ entry })
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
        // console.log({ item })
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
      : never

// Cache commonly used conditional types
type SpecConfig<Spec> = Spec extends string ? never : SpecConfigShape

type SpecConfigShape = {
    depth?: number
    allowPartial?: boolean
}

// Pre-compute discriminated variant types
type VariantType<Entity, K extends PropertyKey, V extends PropertyKey> = [
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
> = VariantType<
    ProcessSpecType<
        VariantType<Entity, K, V>,
        Spec['spec'][V & keyof Spec['spec']],
        Config
    >,
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
        : Spec extends null
          ? NullAs
          : never

type OptimizedBuildedKey<
    NarrowEntity,
    Spec,
    Separator extends string,
    Config extends SpecConfigShape,
    Attributes,
> = Spec extends DiscriminatedSchemaShape
    ? {
          [K in Spec['discriminator']]: {
              [V in keyof Spec['spec']]: ProcessKey<
                  NarrowEntity extends { [k in K]: V } ? NarrowEntity : never,
                  Spec['spec'][V],
                  Separator,
                  undefined,
                  Config,
                  Attributes
              >
          }[keyof Spec['spec']]
      }[Spec['discriminator']]
    : ProcessKey<NarrowEntity, Spec, Separator, undefined, Config, Attributes>

type TableEntryDefinition<Entity, Schema, Separator extends string> = {
    toEntry: <const ExactEntity extends Exact<Entity, ExactEntity>>(
        item: ExactEntity,
    ) => ExactEntity extends infer E extends Entity
        ? TableEntryImpl<E, Schema, Separator>
        : never
    fromEntry: <const Entry extends TableEntryImpl<Entity, Schema, Separator>>(
        entry: Entry,
    ) => DistributiveOmit<Entry, keyof Schema>
    key: <
        const Key extends keyof Schema,
        const Config extends SpecConfig<Spec>,
        const Attributes extends OptimizedAttributes<Entity, Spec, Config_>,
        Spec = Schema[Key],
        Config_ extends SpecConfigShape = [SpecConfigShape] extends [Config] // exclude undefined param
            ? { depth?: undefined; allowPartial?: undefined }
            : Config,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ) => OptimizedBuildedKey<
        Entity & Attributes,
        Spec,
        Separator,
        Config_,
        Attributes
    >
    infer: TableEntryImpl<Entity, Schema, Separator>
    path: () => TableEntryImpl<Entity, Schema, Separator>
}

export const tableEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ): TableEntryDefinition<Entity, Schema, Separator> => {
        return {
            toEntry: toEntry()(schema as never, separator) as never,
            fromEntry: fromEntry()(schema as never) as never,
            key: key()(schema as never, separator) as never,
            infer: chainableNoOpProxy as never,
            path: () => createPathProxy() as never,
        }
    }
