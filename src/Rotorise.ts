import type {
    DistributiveOmit,
    DistributivePick,
    Exact,
    KVPair,
    SliceFromStart,
    Slices,
    Unionize,
    ValueOf,
    evaluate,
    evaluateUnion,
} from './utils'

export type CompositeKeyParams<
    Entity extends Record<string, unknown>,
    FullSpec extends InputSpec<Entity>[],
    skip extends number = 1,
> = Entity extends unknown
    ? evaluate<
          Required<
              Pick<
                  Entity,
                  extractHeadOrPass<
                      SliceFromStart<
                          FullSpec,
                          number extends skip ? 1 : skip
                      >[number]
                  > &
                      keyof Entity
              >
          > &
              Partial<
                  Pick<
                      Entity,
                      extractHeadOrPass<FullSpec[number]> & keyof Entity
                  >
              >
      >
    : never

export type CompositeKeyBuilder<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<Entity>[],
    Delimiter extends string = '#',
    Deep extends number = Spec['length'],
    isPartial extends boolean = false,
> = Entity extends unknown
    ? CompositeKeyBuilderImpl<
          Entity,
          number extends Deep ? Spec : SliceFromStart<Spec, Deep>
      > extends infer Values extends joinablePair[]
        ? Join<
              isPartial &
                  (boolean extends isPartial ? false : true) extends false
                  ? Values
                  : Slices<Values>,
              Delimiter
          >
        : never
    : never

type joinable = string | number | bigint | boolean | null | undefined
type joinablePair = [joinable, joinable]

type Join<
    Pairs extends joinablePair[],
    Delimiter extends string,
> = Pairs extends [
    infer First extends joinablePair,
    ...infer Tail extends joinablePair[],
]
    ? `${First[0]}${Delimiter}${First[1]}${Tail extends [] ? '' : `${Delimiter}${Join<Tail, Delimiter>}`}`
    : never

type CompositeKeyBuilderImpl<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<Entity>[],
    Pairs extends joinablePair[] = [],
    KeysCache extends keyof Entity & string = keyof Entity & string,
    InputSpecsCache extends InputSpec<Entity>[] = InputSpec<Entity>[],
> = Spec extends [infer F, ...infer R extends InputSpecsCache]
    ? F extends KeysCache
        ? Entity[F] extends infer V extends joinable
            ? CompositeKeyBuilderImpl<
                  Entity,
                  R,
                  [...Pairs, [Uppercase<F>, V]],
                  KeysCache,
                  InputSpecsCache
              >
            : never
        : F extends [
                infer K extends KeysCache,
                // biome-ignore lint/suspicious/noExplicitAny: This is a type guard
                (...args: any[]) => infer V extends joinable,
            ]
          ? CompositeKeyBuilderImpl<
                Entity,
                R,
                [...Pairs, [Uppercase<K>, V]],
                KeysCache,
                InputSpecsCache
            >
          : never
    : Pairs

export type TableEntry<
    Entity extends Record<string, unknown>,
    Schema extends Record<string, FullKeySpec<Entity>>,
    Delimiter extends string = '#',
> = Entity extends unknown
    ? Entity & {
          [Key in keyof Schema]: Schema[Key] extends DiscriminatedSchema<Entity>
              ? ValueOf<{
                    [K in Schema[Key]['discriminator']]: {
                        [V in keyof Schema[Key]['spec']]: Schema[Key]['spec'][V] extends infer Value
                            ? Value extends keyof Entity
                                ? Entity[Value]
                                : Value extends InputSpec<Entity>[]
                                  ? CompositeKeyBuilder<
                                        Entity,
                                        Value,
                                        Delimiter
                                    >
                                  : never
                            : never
                    }[Entity[K] & keyof Schema[Key]['spec']]
                }>
              : Schema[Key] extends keyof Entity
                ? Entity[Schema[Key]]
                : Schema[Key] extends FullKeySpecSimple<Entity>
                  ? CompositeKeyBuilder<Entity, Schema[Key], Delimiter>
                  : never
      }
    : never

type InputSpec<
    Entity extends Record<string, unknown>,
    KV extends KVPair = Unionize<Entity>,
> = {
    [key in keyof Entity]:
        | [key, (key: Extract<KV, { k: key }>['v']) => unknown]
        | key
}[keyof Entity]

type extractHeadOrPass<T> = T extends unknown[] ? T[0] : T
type numeric = number | bigint
type keysWithNumericValue<
    Entity extends object,
    KVs extends KVPair = Unionize<Entity>,
    K_wNumber extends PropertyKey = Extract<KVs, { v: numeric }>['k'],
    K_woNumber extends PropertyKey = Exclude<
        KVs,
        { k: K_wNumber; v: numeric }
    >['k'],
> = Exclude<K_wNumber, K_woNumber>

type FullKeySpecSimple<Entity extends Record<string, unknown>> =
    | InputSpec<Entity>[]
    | (keysWithNumericValue<Entity> & keyof Entity)

type DiscriminatedSchema<
    Entity extends Record<string, unknown>,
    DiscriminatorPair extends { k: PropertyKey; v: PropertyKey } = Extract<
        Unionize<Pick<Entity, keyof Entity> /* Pick common keys */>,
        { v: PropertyKey }
    >,
> = DiscriminatorPair extends unknown
    ? {
          discriminator: DiscriminatorPair['k']
          spec: {
              [val in DiscriminatorPair['v']]: FullKeySpecSimple<
                  Extract<
                      Entity,
                      {
                          [k in DiscriminatorPair['k']]: val
                      }
                  >
              > | null
          }
      }
    : never

type FullKeySpec<Entity extends Record<string, unknown>> =
    | FullKeySpecSimple<Entity>
    | DiscriminatedSchema<Entity>

const chainableNoOpProxy: unknown = new Proxy(() => chainableNoOpProxy, {
    get: () => chainableNoOpProxy,
})

const createPathProxy = <T>(path = ''): T => {
    return new Proxy(() => {}, {
        get: (target, prop, receiver) => {
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
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<
            string,
            | InputSpec<Entity>[]
            | keyof Entity
            | {
                  discriminator: keyof Entity
                  spec: {
                      [val in string]: InputSpec<Entity>[] | keyof Entity | null
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
        let structure: InputSpec<Entity>[]

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
            return attributes[case_ as keyof Attributes] as never
        }

        if (config?.depth !== undefined) {
            structure = structure.slice(0, config.depth) as never
        }
        const composite: string[] = []

        for (const keySpec of structure) {
            const [key, transform] = Array.isArray(keySpec)
                ? keySpec
                : [keySpec]
            const value = attributes[key as keyof Attributes]
            if (value !== undefined && value !== null && value !== '') {
                composite.push(key.toString().toUpperCase())
                composite.push(
                    `${transform ? transform(value as never) : value}`,
                )
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
            | InputSpec<Entity>[]
            | keyof Entity
            | {
                  discriminator: keyof Entity
                  spec: {
                      [val in string]: InputSpec<Entity>[] | keyof Entity | null
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
        ? Schema extends Record<string, FullKeySpec<E>>
            ? TableEntry<E, Schema, Separator>
            : never
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
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
    ) =>
    <const Entry extends TableEntry<Entity, Schema, Separator>>(
        entry: Entry,
    ): DistributiveOmit<Entry, keyof Schema> => {
        const item = { ...entry }

        for (const key_ in schema) {
            delete item[key_]
        }
        // console.log({ item })
        return item as never
    }

type TableEntryDefinition<
    Entity extends Record<string, unknown>,
    Schema extends Record<string, FullKeySpec<Entity>>,
    Separator extends string = '#',
> = {
    toEntry: <const ExactEntity extends Exact<Entity, ExactEntity>>(
        item: ExactEntity,
    ) => ExactEntity extends infer E extends Entity
        ? Schema extends Record<string, FullKeySpec<E>>
            ? TableEntry<E, Schema, Separator>
            : never
        : never
    fromEntry: <const Entry extends TableEntry<Entity, Schema, Separator>>(
        entry: Entry,
    ) => DistributiveOmit<Entry, keyof Schema>
    key: <
        const Key extends string,
        const Config extends Spec extends string
            ? never
            : {
                  depth?: number
                  allowPartial?: boolean
              },
        const Attributes extends Spec extends string
            ? DistributivePick<Entity, Spec & keyof Entity>
            : Spec extends InputSpec<Entity>[]
              ? CompositeKeyParams<
                    Entity,
                    Spec,
                    Config['allowPartial'] extends true ? 1 : Spec['length']
                >
              : Spec extends DiscriminatedSchema<Entity>
                ? ValueOf<{
                      [K in Spec['discriminator']]: evaluateUnion<
                          ValueOf<{
                              [V in keyof Extract<
                                  Spec,
                                  {
                                      discriminator: K
                                  }
                              >['spec']]: Entity & {
                                  [k in K]: V
                              } extends infer E extends Record<string, unknown>
                                  ? Extract<
                                        Extract<
                                            Spec,
                                            {
                                                discriminator: K
                                            }
                                        >['spec'],
                                        {
                                            [k in V]: unknown
                                        }
                                    >[V] extends infer S
                                      ? (
                                            S extends keyof E
                                                ? DistributivePick<
                                                      E,
                                                      S & keyof E
                                                  >
                                                : S extends InputSpec<E>[]
                                                  ? CompositeKeyParams<
                                                        E,
                                                        S,
                                                        Config['allowPartial'] extends true
                                                            ? 1
                                                            : S['length']
                                                    >
                                                  : never
                                        ) extends infer P
                                          ? [P] extends [never]
                                              ? {
                                                    [k in K]: V
                                                }
                                              : P & {
                                                    [k in K]: V
                                                }
                                          : never
                                      : never
                                  : never
                          }>
                      >
                  }>
                : never,
        NarrowEntity extends Entity = Entity & Attributes,
        Spec extends FullKeySpec<Entity> = Key extends keyof Schema
            ? Schema[Key]
            : never,
    >(
        key: Key & keyof Schema,
        attributes: Attributes,
        config?: Config,
    ) => Spec extends keyof Entity
        ? ValueOf<Attributes>
        : Spec extends FullKeySpecSimple<NarrowEntity>
          ? CompositeKeyBuilder<
                NarrowEntity,
                Spec,
                Separator,
                Exclude<Config['depth'], undefined>,
                Exclude<Config['allowPartial'], undefined>
            >
          : Spec extends DiscriminatedSchema<NarrowEntity>
            ? ValueOf<{
                  [K in Spec['discriminator']]: {
                      [V in keyof Spec['spec']]: Spec['spec'][V] extends keyof NarrowEntity
                          ? Extract<
                                NarrowEntity,
                                {
                                    [k in K]: V
                                }
                            >[Spec['spec'][V]]
                          : Spec['spec'][V] extends InputSpec<
                                  Extract<
                                      NarrowEntity,
                                      {
                                          [k in K]: V
                                      }
                                  >
                              >[]
                            ? CompositeKeyBuilder<
                                  Extract<
                                      NarrowEntity,
                                      {
                                          [k in K]: V
                                      }
                                  >,
                                  Spec['spec'][V],
                                  Separator,
                                  Exclude<Config['depth'], undefined>,
                                  Exclude<Config['allowPartial'], undefined>
                              >
                            : Spec['spec'][V] extends null
                              ? undefined
                              : never
                  }[Extract<
                      NarrowEntity,
                      {
                          [k in K]: unknown
                      }
                  >[K] &
                      keyof Spec['spec']]
              }>
            : never
    infer: TableEntry<Entity, Schema, Separator>
    path: () => TableEntry<Entity, Schema, Separator>
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
            toEntry: toEntry<Entity>()(schema as never, separator) as never,
            fromEntry: fromEntry<Entity>()(schema),
            key: key<Entity>()(schema as never, separator) as never,
            infer: chainableNoOpProxy as TableEntry<Entity, Schema, Separator>,
            path: () =>
                createPathProxy<TableEntry<Entity, Schema, Separator>>(),
        }
    }
