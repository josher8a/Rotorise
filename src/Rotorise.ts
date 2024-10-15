type KeysOfUnion<ObjectType> = ObjectType extends unknown
    ? keyof ObjectType
    : never
type IsEqual<T, U> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U
    ? 1
    : 2
    ? true
    : false

type ArrayElement<T> = T extends readonly unknown[] ? T[0] : never

type ExactObject<ParameterType, InputType> = {
    [Key in keyof ParameterType]: Exact<
        ParameterType[Key],
        Key extends keyof InputType ? InputType[Key] : never
    >
} & Record<Exclude<keyof InputType, KeysOfUnion<ParameterType>>, never>

type Exact<ParameterType, InputType> = IsEqual<
    ParameterType,
    InputType
> extends true
    ? ParameterType
    : // Convert union of array to array of union: A[] & B[] => (A & B)[]
      ParameterType extends unknown[]
      ? Array<Exact<ArrayElement<ParameterType>, ArrayElement<InputType>>>
      : // In TypeScript, Array is a subtype of ReadonlyArray, so always test Array before ReadonlyArray.
        ParameterType extends readonly unknown[]
        ? ReadonlyArray<
              Exact<ArrayElement<ParameterType>, ArrayElement<InputType>>
          >
        : ParameterType extends object
          ? ExactObject<ParameterType, InputType>
          : ParameterType

type ValueOf<
    ObjectType,
    ValueType extends keyof ObjectType = keyof ObjectType,
> = ObjectType[ValueType]

export type evaluate<T> = T extends unknown
    ? { [K in keyof T]: T[K] } & unknown
    : never

type SliceFromStart<
    T extends unknown[],
    End extends number,
    Target extends unknown[] = [],
> = T['length'] | End extends 0
    ? []
    : Target['length'] extends End
      ? Target
      : T extends [infer A, ...infer R]
        ? SliceFromStart<R, End, [...Target, A]>
        : never

type DistributivePick<T, K> = T extends unknown
    ? K extends keyof T
        ? Pick<T, K>
        : never
    : never

type DistributiveOmit<T, K extends keyof T> = T extends unknown
    ? Omit<T, K>
    : never

type Slices<
    rest extends unknown[],
    minLength extends number = 0,
    slice extends unknown[] = [],
    passedSkip extends 1 | 0 = slice['length'] extends minLength ? 1 : 0,
> =
    | (passedSkip extends 1 ? slice : never)
    | (rest extends [infer h, ...infer R]
          ? Slices<
                R,
                minLength,
                [...slice, h],
                [...slice, h]['length'] extends minLength ? 1 : passedSkip
            >
          : never)

export type CompositeKeyParams<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<Entity>[],
    skip extends number = 1,
    P extends InputSpec<Entity>[] = Slices<
        Spec,
        IsLiteral<skip> extends true ? skip : 1
    >,
> = Entity extends unknown
    ? P extends unknown
        ? evaluate<
              {
                  [K in extractHeadOrPass<P[number]> & string]: Entity[K]
              } & {
                  [K in extractHeadOrPass<
                      Exclude<Spec[number], P[number]>
                  >]?: undefined
              }
          >
        : never
    : never
type IsLiteral<a> = [a] extends [null | undefined]
    ? true
    : [a] extends [string]
      ? string extends a
          ? false
          : true
      : [a] extends [number]
        ? number extends a
            ? false
            : true
        : [a] extends [boolean]
          ? boolean extends a
              ? false
              : true
          : [a] extends [symbol]
            ? symbol extends a
                ? false
                : true
            : [a] extends [bigint]
              ? bigint extends a
                  ? false
                  : true
              : false

export type CompositeKeyBuilder<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<Entity>[],
    Delimiter extends string = '#',
    Deep extends number = Spec['length'],
    isPartial extends boolean = false,
> = Entity extends unknown
    ? CompositeKeyBuilderImpl<
          Entity,
          IsLiteral<Deep> extends true ? SliceFromStart<Spec, Deep> : Spec
      > extends infer Values extends joinablePair[]
        ? Join<
              isPartial & IsLiteral<isPartial> extends false
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
> = Pairs extends [joinablePair]
    ? `${Pairs[0][0]}${Delimiter}${Pairs[0][1]}`
    : Pairs extends [joinablePair, ...infer Tail extends joinablePair[]]
      ? `${Pairs[0][0]}${Delimiter}${Pairs[0][1]}${Delimiter}${Join<
            Tail,
            Delimiter
        >}`
      : never

type CompositeKeyBuilderImpl<
    Entity extends Record<string, unknown>,
    Spec extends InputSpec<Entity>[],
    Pairs extends joinablePair[] = [],
> = Spec extends [infer F, ...infer R extends InputSpec<Entity>[]]
    ? F extends keyof Entity & string
        ? Entity[F] extends joinable
            ? CompositeKeyBuilderImpl<
                  Entity,
                  R,
                  [...Pairs, [Uppercase<F>, Entity[F]]]
              >
            : never
        : F extends [keyof Entity & string, (...x: (infer _)[]) => infer Tr]
          ? Tr extends joinable
              ? CompositeKeyBuilderImpl<
                    Entity,
                    R,
                    [...Pairs, [Uppercase<F[0]>, Tr]]
                >
              : never
          : never
    : Pairs

export type TableEntry<
    Entity extends Record<string, unknown>,
    Schema extends Record<string, FullKeySpec<Entity>>,
    Delimiter extends string = '#',
> = Entity extends unknown
    ? Entity & {
          [Key in keyof Schema]: Schema[Key] extends keyof Entity
              ? Entity[Schema[Key]]
              : Schema[Key] extends FullKeySpecSimple<Entity>
                ? CompositeKeyBuilder<Entity, Schema[Key], Delimiter>
                : Schema[Key] extends DiscriminatedSchema<Entity>
                  ? ValueOf<{
                        [K in Schema[Key]['discriminator']]: {
                            [V in keyof Schema[Key]['spec']]: Schema[Key]['spec'][V] extends keyof Entity
                                ? Extract<
                                      Entity,
                                      {
                                          [k in K]: V
                                      }
                                  >[Schema[Key]['spec'][V]]
                                : Schema[Key]['spec'][V] extends InputSpec<
                                        Extract<
                                            Entity,
                                            {
                                                [k in K]: V
                                            }
                                        >
                                    >[]
                                  ? CompositeKeyBuilder<
                                        Extract<
                                            Entity,
                                            {
                                                [k in K]: V
                                            }
                                        >,
                                        Schema[Key]['spec'][V],
                                        Delimiter
                                    >
                                  : never
                        }[Extract<
                            Entity,
                            {
                                [k in K]: unknown
                            }
                        >[K] &
                            keyof Schema[Key]['spec']]
                    }>
                  : never
      }
    : never

type Unionize<T extends object> = {
    [k in keyof T]: { k: k; v: T[k] }
}[keyof T]
type KVPair = { k: PropertyKey; v: unknown }

type InputSpec<
    Entity extends Record<string, unknown>,
    KV extends KVPair = Unionize<Entity>,
> = evaluate<
    {
        [key in keyof Entity]:
            | [key, (key: Extract<KV, { k: key }>['v']) => unknown]
            | key
    }[keyof Entity]
>

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

type entries =
    | { a: 'a1'; b: 1n; c: true; z: '1' }
    | { a: 'a2'; b: 2; c: 0; z: '2' }

type DiscriminatedSchema<
    Entity extends Record<string, unknown>,
    KVs extends KVPair = Unionize<
        Pick<Entity, keyof Entity> /* Pick common keys */
    >,
    KVs_ extends { k: PropertyKey; v: PropertyKey } = Extract<
        KVs,
        { v: PropertyKey }
    >,
> = KVs_ extends unknown
    ? {
          discriminator: KVs_['k']
          spec: {
              [val in KVs_['v']]: FullKeySpecSimple<
                  Extract<
                      Entity,
                      {
                          [k in KVs_['k']]: val
                      }
                  >
              > | null
          }
      }
    : never

type FullKeySpec<Entity extends Record<string, unknown>> =
    | FullKeySpecSimple<Entity>
    | DiscriminatedSchema<Entity>

type t = DiscriminatedSchema<entries>

type R = ValueOf<{
    [K in t['discriminator']]: evaluate<
        ValueOf<{
            [V in keyof Extract<t, { discriminator: K }>['spec']]: {
                narrow: {
                    [k in K]: V
                }
                spec: Extract<
                    Extract<t, { discriminator: K }>['spec'],
                    { [k in V]: unknown }
                >[V]
            }
        }>
    >
}>

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
        const Key extends keyof Schema,
        const Config extends Schema[Key] extends keyof Entity
            ? never
            : { depth?: number; allowPartial?: boolean },
        const Attributes extends Schema[Key] extends keyof Entity
            ? DistributivePick<Entity, Schema[Key] & keyof Entity>
            : Schema[Key] extends InputSpec<Entity>[]
              ? CompositeKeyParams<
                    Entity,
                    Schema[Key],
                    Config['allowPartial'] extends true
                        ? 1
                        : Schema[Key]['length']
                >
              : Schema[Key] extends DiscriminatedSchema<Entity>
                ? ValueOf<{
                      [K in Schema[Key]['discriminator']]: evaluate<
                          ValueOf<{
                              [V in keyof Extract<
                                  Schema[Key],
                                  { discriminator: K }
                              >['spec']]: Entity & {
                                  [k in K]: V
                              } extends infer E extends Record<string, unknown>
                                  ? Extract<
                                        Extract<
                                            Schema[Key],
                                            { discriminator: K }
                                        >['spec'],
                                        { [k in V]: unknown }
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
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ) => Schema[Key] extends keyof Entity
        ? ValueOf<Attributes>
        : Schema[Key] extends FullKeySpecSimple<Entity & Attributes>
          ? CompositeKeyBuilder<
                Entity & Attributes,
                Schema[Key],
                Separator,
                Exclude<Config['depth'], undefined>,
                Exclude<Config['allowPartial'], undefined>
            >
          : Schema[Key] extends DiscriminatedSchema<Entity>
            ? ValueOf<{
                  [K in Schema[Key]['discriminator']]: {
                      [V in keyof Schema[Key]['spec']]: Schema[Key]['spec'][V] extends keyof Entity
                          ? Extract<
                                Entity,
                                {
                                    [k in K]: V
                                }
                            >[Schema[Key]['spec'][V]]
                          : Schema[Key]['spec'][V] extends InputSpec<
                                  Extract<
                                      Entity,
                                      {
                                          [k in K]: V
                                      }
                                  >
                              >[]
                            ? CompositeKeyBuilder<
                                  Extract<
                                      Entity,
                                      {
                                          [k in K]: V
                                      }
                                  >,
                                  Schema[Key]['spec'][V],
                                  Separator,
                                  Exclude<Config['depth'], undefined>,
                                  Exclude<Config['allowPartial'], undefined>
                              >
                            : Schema[Key]['spec'][V] extends null
                              ? undefined
                              : never
                  }[Extract<
                      Entity & Attributes,
                      {
                          [k in K]: unknown
                      }
                  >[K] &
                      keyof Schema[Key]['spec']]
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
