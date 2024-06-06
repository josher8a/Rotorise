import type {
    DistributiveOmit,
    DistributivePick,
    Pretty,
    SliceFromStart,
    ValueOf,
} from './typeUtils'
import type { Exact } from 'type-fest'

export type Slices<
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
    P extends InputSpec<Entity>[] = Slices<Spec, skip>,
> = Entity extends unknown
    ? P extends unknown
        ? Pretty<
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
     type IsLiteral<a> =  
     [a] extends [null | undefined]
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
    : false;

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
        ? Join<isPartial & IsLiteral<isPartial> extends false ? Values : Slices<Values>, Delimiter>
        : never
    : never

type joinable = string | number | bigint | boolean | null | undefined
type joinablePair = [joinable, joinable]

export type Join<
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
    Schema extends Record<string, InputSpec<Entity>[] | keyof Entity>,
    Entity extends Record<string, unknown>,
    Delimiter extends string = '#',
> = Entity extends unknown
    ? Entity & {
          [K in keyof Schema]: Schema[K] extends InputSpec<Entity>[]
              ? CompositeKeyBuilder<Entity, Schema[K], Delimiter>
              : Entity[Schema[K] & keyof Entity]
      }
    : never

export type InterfaceWithInjection<I, D> = {
    [K in keyof I]: (dep: D) => I[K]
}

export const chainableNoOpProxy: unknown = new Proxy(() => chainableNoOpProxy, {
    get: () => chainableNoOpProxy,
})

export const createPathProxy = <T>(path = ''): T => {
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

type Unionize<T extends object> = {
    [k in keyof T]: { k: k; v: T[k] }
}[keyof T]
type KVPair = { k: PropertyKey; v: unknown }

type InputSpec<
    Entity extends Record<string, unknown>,
    KV extends KVPair = Unionize<Entity>,
> = Pretty<
    {
        [key in keyof Entity]:
            | [key, (key: Extract<KV, { k: key }>['v']) => unknown]
            | key
    }[keyof Entity]
>

type extractHeadOrPass<T extends [PropertyKey, unknown] | PropertyKey> =
    T extends [infer Head, ...infer _] ? Head : T

export type keysWithNumericValue<
    Entity extends object,
    KVs extends KVPair = Unionize<Entity>,
    K_wNumber extends PropertyKey = Extract<KVs, { v: number }>['k'],
    K_woNumber extends PropertyKey = Exclude<
        KVs,
        { k: K_wNumber; v: number }
    >['k'],
> = Exclude<K_wNumber, K_woNumber>

type FullKeySpec<Entity extends Record<string, unknown>> =
    | InputSpec<Entity>[]
    | (keysWithNumericValue<Entity> & keyof Entity)

const key =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ) =>
    <
        const Key extends keyof Schema,
        const Config extends Schema[Key] extends unknown[]
            ? { depth?: number; allowPartial?: boolean }
            : never,
        const Attributes extends Schema[Key] extends keyof Entity
            ? DistributivePick<Entity, Schema[Key] & keyof Entity>
            : Config['allowPartial'] extends true
              ? CompositeKeyParams<Entity, Schema[Key]>
              : DistributivePick<
                    Entity,
                    extractHeadOrPass<
                        Pretty<
                            SliceFromStart<
                                Schema[Key],
                                Exclude<Config['depth'], undefined>
                            >[number]
                        >
                    >
                >,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config,
    ): Schema[Key] extends InputSpec<Entity>[]
        ? CompositeKeyBuilder<
              Entity & Attributes,
              Schema[Key] extends FullKeySpec<Entity & Attributes>
                  ? Schema[Key]
                  : never,
              Separator,
              Exclude<Config['depth'], undefined>,
              Exclude<Config['allowPartial'], undefined>
          >
        : ValueOf<typeof attributes> => {
        let structure = schema[key] ?? ([] as InputSpec<Entity>[])
        if (!Array.isArray(structure)) {
            return attributes[structure as keyof typeof attributes] as never
        }

        if (config?.depth !== undefined) {
            structure = structure.slice(0, config.depth) as never
        }
        const composite: string[] = []

        for (const keySpec of structure) {
            const [key, transform] = Array.isArray(keySpec)
                ? keySpec
                : [keySpec]
            const value = attributes[key as keyof typeof attributes]
            if (value !== undefined && value !== null && value !== '') {
                composite.push(key.toString().toUpperCase())
                composite.push(
                    `${transform ? transform(value as never) : value}`,
                )
            } else if (config?.allowPartial) {
                break
            } else {
                throw new Error(
                    `buildCompositeKey: Attribute ${key.toString()} not found in ${attributes}`,
                )
            }
        }

        return composite.join(separator) as never
    }

const toEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ) =>
    <const ExactEntity extends Exact<Entity, ExactEntity>>(
        item: ExactEntity,
    ): ExactEntity extends infer E extends Entity
        ? Schema extends Record<string, FullKeySpec<E>>
            ? TableEntry<Schema, E, Separator>
            : never
        : never => {
        const entry = { ...item }

        for (const key_ in schema) {
            entry[key_] = key<Entity>()(schema, separator)(
                key_,
                item as never,
            ) as never
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
        separator: Separator = '#' as Separator,
    ) =>
    <const Entry extends TableEntry<Schema, Entity, Separator>>(
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
            ? TableEntry<Schema, E, Separator>
            : never
        : never
    fromEntry: <const Entry extends TableEntry<Schema, Entity, Separator>>(
        entry: Entry,
    ) => DistributiveOmit<Entry, keyof Schema>
    key: <
        const Key extends keyof Schema,
        const Config extends Schema[Key] extends unknown[]
            ? { depth?: number; allowPartial?: boolean }
            : never,
        const Attributes extends Schema[Key] extends keyof Entity
            ? DistributivePick<Entity, Schema[Key] & keyof Entity>
            : Config['allowPartial'] extends true
              ? CompositeKeyParams<Entity, Schema[Key]>
              : DistributivePick<
                    Entity,
                    extractHeadOrPass<
                        Pretty<
                            SliceFromStart<
                                Schema[Key],
                                Exclude<Config['depth'], undefined>
                            >[number]
                        >
                    >
                >,
    >(
        key: Key,
        attributes: Attributes,
        config?: Config | undefined,
    ) => Schema[Key] extends InputSpec<Entity>[]
        ? CompositeKeyBuilder<
              Entity & Attributes,
              Schema[Key] extends FullKeySpec<Entity & Attributes>
                  ? Schema[Key]
                  : never,
              Separator,
              Exclude<Config['depth'], undefined>,
              Exclude<Config['allowPartial'], undefined>
          >
        : ValueOf<Attributes>

    infer: TableEntry<Schema, Entity, Separator>
    path: () => TableEntry<Schema, Entity, Separator>
}

export const tableEntry =
    <const Entity extends Record<string, unknown>>() =>
    <
        const Schema extends Record<string, FullKeySpec<Entity>>,
        Separator extends string = '#',
    >(
        schema: Schema,
        separator: Separator = '#' as Separator,
    ) : TableEntryDefinition< Entity, Schema, Separator> =>{
        return {
            toEntry: toEntry<Entity>()(schema, separator) as never ,
            fromEntry: fromEntry<Entity>()(schema, separator),
            key: key<Entity>()(schema, separator),
            infer: chainableNoOpProxy as TableEntry<Schema, Entity, Separator>,
            path: () =>
                createPathProxy<TableEntry<Schema, Entity, Separator>>(),
        }
    }