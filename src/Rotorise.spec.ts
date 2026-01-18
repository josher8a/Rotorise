import { attest } from '@ark/attest'
import { describe, expect, it, test } from 'vitest'
import {
    type CompositeKeyBuilder,
    type CompositeKeyParams,
    type TransformShape,
    tableEntry,
} from './Rotorise'
import type { NonEmptyArray } from './utils'

type Equal<T, U> = (<G>() => G extends T ? 1 : 2) extends <G>() => G extends U
    ? 1
    : 2
    ? true
    : false
type isTrue<T extends true> = T

describe('DynamoDB Utils', () => {
    it('CompositeKeyParams', () => {
        type test_CompositeKeyParams =
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c']
                      >,
                      { a: string; b?: number; c?: boolean }
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', ['c', (c: boolean) => 'TRANSFORM']]
                      >,
                      { a: string; b?: number; c?: boolean }
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', ['c', (c: boolean) => 'TRANSFORM']],
                          2
                      >,
                      { a: string; b: number; c?: boolean }
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', ['c', (c: boolean) => 'TRANSFORM']],
                          number
                      >,
                      { a: string; b?: number; c?: boolean }
                  >
              >

        attest.instantiations([2012, 'instantiations'])
    })

    it('CompositeKeyBuilder', () => {
        type test_CompositeKeyBuilder =
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c']
                      >,
                      `A#${string}#B#${number}#C#${boolean}`
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          | { a: 'a1'; b: 1; c: true; z: never }
                          | { a: 'a2'; b: 2; c: true; z: never },
                          ['a', 'b']
                      >,
                      `A#${'a1'}#B#${1}` | `A#${'a2'}#B#${2}`
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c'],
                          '-'
                      >,
                      `A-${string}-B-${number}-C-${boolean}`
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c'],
                          '-',
                          2
                      >,
                      `A-${string}-B-${number}`
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c'],
                          '-',
                          3,
                          true
                      >,
                      | `A-${string}`
                      | `A-${string}-B-${number}`
                      | `A-${string}-B-${number}-C-${boolean}`
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          | { a: 'a1'; b: 1; c: true; z: never }
                          | { a: 'a2'; b: 2; c: false; z: never },
                          ['a', 'b', 'c'],
                          '#',
                          3,
                          true
                      >,
                      | 'A#a1'
                      | 'A#a1#B#1'
                      | 'A#a1#B#1#C#true'
                      | 'A#a2'
                      | 'A#a2#B#2'
                      | 'A#a2#B#2#C#false'
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          | { a: 'a1'; b: 1; c: true; z: never }
                          | { a: 'a2'; b: 2; c: false; z: never },
                          ['a', 'b', ['c', (c: boolean) => 'TRANSFORM']],
                          '#',
                          3,
                          true
                      >,
                      | 'A#a1'
                      | 'A#a1#B#1'
                      | 'A#a2'
                      | 'A#a2#B#2'
                      | 'A#a1#B#1#C#TRANSFORM'
                      | 'A#a2#B#2#C#TRANSFORM'
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          | { a: 'a1'; b: 1; c: true; z: never }
                          | { a: 'a2'; b: 2; c: false; z: never },
                          [
                              'a',
                              'b',
                              [
                                  'c',
                                  (c: boolean) => {
                                      tag: 'TAG'
                                      value: 'TRANSFORM'
                                  },
                              ],
                          ],
                          '#',
                          3,
                          true
                      >,
                      | 'A#a1'
                      | 'A#a1#B#1'
                      | 'A#a2'
                      | 'A#a2#B#2'
                      | 'A#a1#B#1#TAG#TRANSFORM'
                      | 'A#a2#B#2#TAG#TRANSFORM'
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyBuilder<
                          | { a: 'a1'; b: 1; c: true; z: never }
                          | { a: 'a2'; b: 2; c: false; z: never },
                          [
                              'a',
                              'b',
                              [
                                  'c',
                                  (c: boolean) => {
                                      value: 'TRANSFORM'
                                  },
                              ],
                          ],
                          '#',
                          3,
                          true
                      >,
                      | 'A#a1'
                      | 'A#a1#B#1'
                      | 'A#a2'
                      | 'A#a2#B#2'
                      | 'A#a1#B#1#TRANSFORM'
                      | 'A#a2#B#2#TRANSFORM'
                  >
              >

        attest.instantiations([6653, 'instantiations'])
    })

    it('tableEntry', () => {
        type Entity =
            | { a: 'a1'; b: 1; c: true; z: 'never' }
            | { a: 'a2'; b: 2; c: true; z: 'never' }
        const testTableEntry = tableEntry<Entity>()(
            {
                PK: ['a', 'b', 'c'],
                SK: 'b', // raw numeric key is only allowed for sorting propuse where other mechanism is not available (arbitrary precision numbers), either way it should use a regular composite key.
            } as const,
            '-',
        )

        expect(testTableEntry.fromEntry).toBeDefined()
        expect(testTableEntry.toEntry).toBeDefined()
        expect(testTableEntry.key).toBeDefined()
        expect(testTableEntry.infer).toBeDefined()

        type entries =
            | ({
                  a: 'a1'
                  b: 1
                  c: true
                  z: 'never'
              } & {
                  readonly PK: 'A-a1-B-1-C-true'
                  readonly SK: 1
              })
            | ({
                  a: 'a2'
                  b: 2
                  c: true
                  z: 'never'
              } & {
                  readonly PK: 'A-a2-B-2-C-true'
                  readonly SK: 2
              })

        attest<entries>(testTableEntry.infer)

        expect(
            testTableEntry.key(
                'PK',
                {
                    a: 'a1',
                    b: 1,
                    c: true,
                },
                {
                    depth: 2,
                    allowPartial: false,
                },
            ),
        ).toBe('A-a1-B-1')

        expect(
            testTableEntry.key(
                'PK',
                {
                    a: 'a1',
                    b: 1,
                    c: true,
                },
                {
                    depth: 2,
                    allowPartial: false,
                    enforceBoundary: true,
                },
            ),
        ).toBe('A-a1-B-1-')

        const entity = {
            a: 'a1',
            b: 1,
            c: true,
            z: 'never',
        } satisfies Entity

        const testTableEntryObj = testTableEntry.toEntry(entity)

        testTableEntry.toEntry({
            a: 'a1',
            b: 1,
            c: true,
            z: 'never',
            // @ts-expect-error
            nonexistent: 'nonexistent',
        })

        expect(testTableEntryObj).toEqual({
            ...entity,
            PK: 'A-a1-B-1-C-true',
            SK: 1,
        })

        const fromEntry = testTableEntry.fromEntry(testTableEntryObj)

        type expect_fromEntry =
            | isTrue<Equal<ReturnType<typeof testTableEntry.fromEntry>, Entity>>
            | isTrue<Equal<typeof fromEntry, typeof entity>> // narrow down to the exact type

        expect(fromEntry).toEqual(entity)

        const key = testTableEntry.key(
            'PK',
            {
                a: 'a1',
                b: 1,
            },
            {
                depth: 2,
                allowPartial: true,
            },
        )

        type test_buildCompositeKey = isTrue<
            Equal<typeof key, 'A-a1-B-1' | 'A-a1'>
        >

        expect(key).toBe('A-a1-B-1')

        const keyDefaults = testTableEntry.key('PK', {
            a: 'a1',
            b: 1,
            c: true,
        })

        type test_buildCompositeKeyDefaults = isTrue<
            Equal<typeof keyDefaults, 'A-a1-B-1-C-true'>
        >

        expect(keyDefaults).toBe('A-a1-B-1-C-true')

        // infer should be accesible at runtime
        expect(testTableEntry.path().PK.length).toBeDefined()

        expect(
            testTableEntry.key(
                'SK',
                {
                    b: 1,
                },
                undefined, // when is raw numeric key, configuration is not needed
            ),
        ).toBe(1)
        expect(
            testTableEntry.key(
                'SK',
                {
                    b: 1,
                },
                // @ts-expect-error
                { depth: 1 },
            ),
        ).toBe(1)

        expect(
            testTableEntry.key(
                'SK',
                {
                    b: 1,
                },
                // @ts-expect-error
                { allowPartial: true },
            ),
        ).toBe(1)

        attest.instantiations([11085, 'instantiations'])
    })

    test('path from infer then toString', () => {
        const testTableEntry = tableEntry<{
            a: 'a1'
            b: 1
            c: true
            z: 'never'
            data: {
                type: string
                description: string
            }
            logs: {
                type: string
                description: string
            }[]
        }>()(
            {
                PK: ['a', 'b', 'c'],
                SK: ['c'],
            },
            '-',
        )

        expect(testTableEntry.path().data.type.toString()).toBe('data.type')
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        expect(testTableEntry.path().logs[0]!.type.toString()).toBe(
            'logs[0].type',
        )
        // biome-ignore lint/style/noNonNullAssertion: <explanation>
        expect(testTableEntry.path().logs['0']!.type.toString()).toBe(
            'logs[0].type',
        )
        expect(testTableEntry.path().PK.toString()).toBe('PK')

        attest.instantiations([1358, 'instantiations'])
    })

    test('table Entry with transform and discriminator ', () => {
        const base = tableEntry<
            | { a: 'a1'; b: 1n; c: true; z: 'never' }
            | { a: 'a2'; b: 2; c: 0; z: 'never' }
        >()
        type t = Extract<
            Parameters<typeof base>[0][string],
            {
                discriminator: 'a'
            }
        >['spec']['a1']

        type expect_schema = isTrue<
            Equal<
                Parameters<typeof base>,
                [
                    schema: Record<
                        string,
                        | 'a'
                        | 'b'
                        | 'c'
                        | 'z'
                        | NonEmptyArray<
                              | 'a'
                              | 'b'
                              | 'c'
                              | 'z'
                              | ['a', (key: 'a1' | 'a2') => TransformShape]
                              | ['b', (key: 1n | 2) => TransformShape]
                              | ['c', (key: true | 0) => TransformShape]
                              | ['z', (key: 'never') => TransformShape]
                          >
                        | null
                        | {
                              discriminator: 'a'
                              spec: {
                                  a1:
                                      | 'a'
                                      | 'b'
                                      | 'c'
                                      | 'z'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'c'
                                            | 'z'
                                            | [
                                                  'a',
                                                  (key: 'a1') => TransformShape,
                                              ]
                                            | ['b', (key: 1n) => TransformShape]
                                            | [
                                                  'c',
                                                  (key: true) => TransformShape,
                                              ]
                                            | [
                                                  'z',
                                                  (
                                                      key: 'never',
                                                  ) => TransformShape,
                                              ]
                                        >
                                      | null
                                  a2:
                                      | 'a'
                                      | 'b'
                                      | 'c'
                                      | 'z'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'c'
                                            | 'z'
                                            | [
                                                  'a',
                                                  (key: 'a2') => TransformShape,
                                              ]
                                            | ['b', (key: 2) => TransformShape]
                                            | ['c', (key: 0) => TransformShape]
                                            | [
                                                  'z',
                                                  (
                                                      key: 'never',
                                                  ) => TransformShape,
                                              ]
                                        >
                                      | null
                              }
                          }
                        | {
                              discriminator: 'z'
                              spec: {
                                  never:
                                      | 'a'
                                      | 'b'
                                      | 'c'
                                      | 'z'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'c'
                                            | 'z'
                                            | [
                                                  'a',
                                                  (
                                                      key: 'a1' | 'a2',
                                                  ) => TransformShape,
                                              ]
                                            | [
                                                  'b',
                                                  (
                                                      key: 2 | 1n,
                                                  ) => TransformShape,
                                              ]
                                            | [
                                                  'c',
                                                  (
                                                      key: true | 0,
                                                  ) => TransformShape,
                                              ]
                                            | [
                                                  'z',
                                                  (
                                                      key: 'never',
                                                  ) => TransformShape,
                                              ]
                                        >
                                      | null
                              }
                          }
                    >,
                    separator?: string | undefined,
                ]
            >
        >

        const testTableEntry = base(
            {
                PK: [
                    'a',
                    'b',
                    ['c', (c: number | boolean) => (c ? 'VERDADERO' : 'FALSO')],
                ],
                SK: 'b',

                GSI1PK: {
                    discriminator: 'z',
                    spec: {
                        never: 'b',
                    },
                },
                GSI1SK: {
                    discriminator: 'a',
                    spec: {
                        a2: 'b',
                        a1: [
                            'a',
                            'b',
                            [
                                'c',
                                (c: number | boolean) => ({
                                    tag: 'NEW_TAG' as const,
                                    value: c
                                        ? ('VERDADERO' as const)
                                        : ('FALSO' as const),
                                }),
                            ],
                        ],
                    },
                },

                GSI2PK: {
                    discriminator: 'a',
                    spec: {
                        a2: 'b',
                        a1: null,
                    },
                },
            },
            '-',
        )

        testTableEntry

        type entries =
            | ({
                  a: 'a1'
                  b: 1n
                  c: true
                  z: 'never'
              } & {
                  readonly PK: 'A-a1-B-1-C-VERDADERO' | 'A-a1-B-1-C-FALSO'
                  readonly SK: 1n
                  readonly GSI1PK: 1n
                  readonly GSI1SK:
                      | 'A-a1-B-1-NEW_TAG-VERDADERO'
                      | 'A-a1-B-1-NEW_TAG-FALSO'
                  readonly GSI2PK: never
              })
            | ({
                  a: 'a2'
                  b: 2
                  c: 0
                  z: 'never'
              } & {
                  readonly PK: 'A-a2-B-2-C-VERDADERO' | 'A-a2-B-2-C-FALSO'
                  readonly SK: 2
                  readonly GSI1PK: 2
                  readonly GSI1SK: 2
                  readonly GSI2PK: 2
              })

        type expect_infer = isTrue<Equal<typeof testTableEntry.infer, entries>>

        expect(
            testTableEntry.key(
                'PK',
                {
                    a: 'a1',
                    b: 1n,
                    c: true,
                },
                {
                    allowPartial: true,
                },
            ),
        ).toBe('A-a1-B-1-C-VERDADERO')
        expect(
            testTableEntry.key('PK', {
                a: 'a2',
                b: 2,
                c: 0,
            }),
        ).toBe('A-a2-B-2-C-FALSO')

        expect(
            testTableEntry.key('SK', {
                b: 2,
            }),
        ).toBe(2)

        expect(
            testTableEntry.key('SK', {
                b: 1n,
            }),
        ).toBe(1n)
        const r = testTableEntry.key(
            'GSI1SK',
            {
                a: 'a1',
                b: 1n,
                c: true,
            },
            {
                depth: 2,
            },
        )

        const d = testTableEntry.key('GSI1PK', {
            z: 'never', // required to discriminate
            b: 1n,
        })
        expect(
            testTableEntry.key('GSI1PK', {
                z: 'never', // required to discriminate
                b: 1n,
            }),
        ).toBe(1n)

        expect(
            testTableEntry.key(
                'GSI1SK',
                {
                    a: 'a1',
                    b: 1n,
                    c: true,
                },
                {
                    depth: 2,
                },
            ),
        ).toBe('A-a1-B-1')

        expect(
            testTableEntry.key('GSI1SK', {
                a: 'a1',
                b: 1n,
                c: true,
            }),
        ).toBe('A-a1-B-1-NEW_TAG-VERDADERO')

        expect(
            testTableEntry.key('GSI1SK', {
                a: 'a2',
                b: 2,
                // z: 'never',
            }),
        ).toBe(2)

        expect(
            testTableEntry.key('GSI2PK', {
                a: 'a2',
                b: 2,
                // z: 'never',
            }),
        ).toBe(2)

        expect(
            testTableEntry.key('GSI2PK', {
                a: 'a1',
            }),
        ).toBeUndefined()

        attest.instantiations([64827, 'instantiations'])
    })

    test('real world example', () => {
        type BigUnion =
            | 'A'
            | 'B'
            | 'C'
            | 'D'
            | 'E'
            | 'F'
            | 'G'
            | 'H'
            | 'I'
            | 'J'
            | 'K'
            | 'L'
            | 'M'
            | 'N'
            | 'O'
            | 'P'
            | 'Q'
            | 'R'
            | 'E'
            | 'T'
            | 'U'
            | 'V'
            | 'W'
            | 'X' // excessively deep mark - before PR
            | 'Y'
            | 'Z'
            | 'A1'
            | 'B1'
            | 'C1'
            | 'D1' // excessively deep mark - before Attest
            | 'E1'
            | 'F1'
            | 'G1'
            | 'H1'
            | 'I1'
            | 'J1'
            | 'K1'
            | 'L1'
            | 'M1'
            | 'N1'
            | 'O1'
            | 'P1'
            | 'Q1'
            | 'R1'
            | 'E1'
            | 'T1'
            | 'U1'
            | 'V1'
            | 'W1'
            | 'X1'
            | 'Y1'
            | 'Z1' // YOLO

        type BigRecord = {
            [k in BigUnion]: `value:${k}`
        }

        type A = {
            id1: string
            tag: 'A'
            user: string
            id2: string

            type: 'TypeA'
        } & BigRecord

        type B = {
            id1: string
            tag: 'B'
            user: string
            id2: string
            type: 'TypeB'
        } & BigRecord

        type C = {
            id1: string
            tag: 'C'
            user: string
            id2: string
            type: 'TypeB'
        } & BigRecord

        type D = {
            id1: string
            tag: 'D'
            user: string
            deviceId: string
            id2: string
            type: 'TypeA'
            kind: string
        } & BigRecord

        type RealEntry = typeof RealEntry.infer
        const RealEntry = tableEntry<A | C | D | B>()({
            PK: ['id1', 'user'],
            SK: {
                discriminator: 'tag',
                spec: {
                    C: ['tag', 'id2', 'type'],
                    D: ['tag', 'id2', 'kind', 'type'],
                    A: ['tag', 'id2', 'type'],
                    B: ['tag', 'id2', 'type'],
                },
            },
            GSI1PK: ['id2'],
            GSI1SK: {
                discriminator: 'tag',
                spec: {
                    C: ['type'],
                    D: ['kind'],
                    A: ['type'],
                    B: ['type'],
                },
            },
        })

        let expect_infer: isTrue<
            Equal<
                RealEntry,
                | (A & {
                      readonly PK: `ID1#${string}#USER#${string}`
                      readonly SK: `TAG#A#ID2#${string}#TYPE#TypeA`
                      readonly GSI1PK: `ID2#${string}`
                      readonly GSI1SK: `TYPE#TypeA`
                  })
                | ({
                      readonly PK: `ID1#${string}#USER#${string}`
                      readonly SK: `TAG#C#ID2#${string}#TYPE#TypeB`
                      readonly GSI1PK: `ID2#${string}`
                      readonly GSI1SK: `TYPE#TypeB`
                  } & C)
                | ({
                      readonly PK: `ID1#${string}#USER#${string}`
                      readonly SK: `TAG#D#ID2#${string}#KIND#${string}#TYPE#TypeA`
                      readonly GSI1PK: `ID2#${string}`
                      readonly GSI1SK: `KIND#${string}`
                  } & D)
                | ({
                      readonly PK: `ID1#${string}#USER#${string}`
                      readonly SK: `TAG#B#ID2#${string}#TYPE#TypeB`
                      readonly GSI1PK: `ID2#${string}`
                      readonly GSI1SK: `TYPE#TypeB`
                  } & B)
            >
        >

        const expect_key = RealEntry.key(
            'PK',
            {
                id1: 'client',
                user: 'user',
            },
            {
                allowPartial: true,
            },
        ) satisfies 'ID1#client#USER#user' | 'ID1#client'

        const expect_key_ = RealEntry.key(
            'PK',
            {
                id1: 'client',
                user: 'user',
            },
            {
                // allowPartial: true,
            },
        ) satisfies 'ID1#client#USER#user'

        const expect_key2 = RealEntry.key('GSI1SK', {
            type: 'TypeA',
            tag: 'A',
        }) satisfies 'TYPE#TypeA'

        // @ts-expect-error
        const expect_key2_ = RealEntry.key('GSI1SK', {
            type: 'TypeA',
            tag: 'A',
            // biome-ignore lint/complexity/noBannedTypes: test case
        } as {})

        const expect_key_depth = RealEntry.key(
            'PK',
            {
                id1: 'client',
                user: 'user',
            },
            {
                allowPartial: true,
                depth: 1,
            },
        ) satisfies 'ID1#client'

        const expect_key_depth_partial_discriminator = RealEntry.key(
            'SK',
            { tag: 'A', id2: 'yolo' },
            { allowPartial: true, depth: 2 },
        ) satisfies 'TAG#A' | `TAG#A#ID2#${string}`

        type expect_key_depth_partial_discriminator = isTrue<
            Equal<
                typeof expect_key_depth_partial_discriminator,
                'TAG#A' | `TAG#A#ID2#yolo`
            >
        >

        const expect_key_depth_discriminator = RealEntry.key(
            'SK',
            { tag: 'A', id2: 'yolo' },
            { depth: 2 },
        ) satisfies 'TAG#A#ID2#yolo'

        attest.instantiations([38182, 'instantiations'])
    })

    test('schema allows for nullish values if has transform', () => {
        const base = tableEntry<
            | { a: 'a1'; b: 1n; c: true; z: 'never' }
            | { a: 'a2'; b: 2; c: 0; z?: 'never' | null }
        >()

        type expect_schema = isTrue<
            Equal<
                Parameters<typeof base>,
                [
                    schema: Record<
                        string,
                        | 'a'
                        | 'b'
                        | 'c'
                        | 'z'
                        | NonEmptyArray<
                              | 'a'
                              | 'b'
                              | 'c'
                              | ['a', (key: 'a1' | 'a2') => TransformShape]
                              | ['b', (key: 1n | 2) => TransformShape]
                              | ['c', (key: true | 0) => TransformShape]
                              | [
                                    'z',
                                    (key: 'never' | null) => TransformShape,
                                    'never' | null,
                                ]
                          >
                        | null
                        | {
                              discriminator: 'a'
                              spec: {
                                  a1:
                                      | 'a'
                                      | 'b'
                                      | 'c'
                                      | 'z'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'c'
                                            | 'z'
                                            | [
                                                  'a',
                                                  (key: 'a1') => TransformShape,
                                              ]
                                            | ['b', (key: 1n) => TransformShape]
                                            | [
                                                  'c',
                                                  (key: true) => TransformShape,
                                              ]
                                            | [
                                                  'z',
                                                  (
                                                      key: 'never',
                                                  ) => TransformShape,
                                              ]
                                        >
                                      | null
                                  a2:
                                      | 'a'
                                      | 'b'
                                      | 'c'
                                      | 'z'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'c'
                                            | [
                                                  'a',
                                                  (key: 'a2') => TransformShape,
                                              ]
                                            | ['b', (key: 2) => TransformShape]
                                            | ['c', (key: 0) => TransformShape]
                                            | [
                                                  'z',
                                                  (
                                                      key: 'never' | null,
                                                  ) => TransformShape,
                                                  'never' | null,
                                              ]
                                        >
                                      | null
                              }
                          }
                    >,
                    separator?: string | undefined,
                ]
            >
        >

        const testTableEntry = base(
            {
                PK: ['a', ['b', (x: 1n | 2) => x.toString()], 'c'],
                SK: ['c', ['z', (z: 'never' | null) => z ?? 'DEFAULT', null]],
                GSIPK: 'z',
                GSISK: {
                    discriminator: 'a',
                    spec: {
                        a1: ['z', ['z', (z: 'never') => z ?? 'DEFAULT']],
                        a2: [
                            [
                                'z',
                                (z: 'never' | null) => z ?? 'DEFAULT',
                                'never',
                            ],
                        ],
                    },
                },
            },
            '-',
        )

        type entries =
            | ({
                  a: 'a1'
                  b: 1n
                  c: true
                  z: 'never'
              } & {
                  readonly PK: `A-a1-B-${string}-C-true`
                  readonly SK: 'C-true-Z-never' | 'C-true-Z-DEFAULT'
                  readonly GSIPK: 'never'
                  readonly GSISK: 'Z-never-Z-never'
              })
            | ({
                  a: 'a2'
                  b: 2
                  c: 0
                  z?: 'never' | null
              } & {
                  readonly PK: `A-a2-B-${string}-C-0`
                  readonly SK: 'C-0-Z-DEFAULT' | 'C-0-Z-never'
                  readonly GSIPK: 'never' | undefined
                  readonly GSISK: 'Z-never' | 'Z-DEFAULT'
              })

        type expect_infer = isTrue<Equal<typeof testTableEntry.infer, entries>>

        expect(
            testTableEntry.key('SK', {
                c: 0,
                z: undefined,
            }),
        ).toBe('C-0-Z-DEFAULT')

        expect(
            testTableEntry.key('SK', {
                c: 0,
                z: 'never',
            }),
        ).toBe('C-0-Z-never')

        expect(
            // on partial no transform if missing
            testTableEntry.key(
                'PK',
                {
                    c: 0,
                    a: 'a2',
                },
                { allowPartial: true },
            ),
        ).toBe('A-a2')
    })

    test('heterogenous keys schema', () => {
        const base = tableEntry<
            { a: 'a1'; b: 1n; extra: 'extra' } | { a: 'a2'; b: 2 }
        >()

        type expect_schema = isTrue<
            Equal<
                Parameters<typeof base>,
                [
                    schema: Record<
                        string,
                        | 'a'
                        | 'b'
                        | NonEmptyArray<
                              | 'a'
                              | 'b'
                              | ['a', (key: 'a1' | 'a2') => TransformShape]
                              | ['b', (key: 1n | 2) => TransformShape]
                          >
                        | null
                        | {
                              discriminator: 'a'
                              spec: {
                                  a1:
                                      | 'a'
                                      | 'b'
                                      | 'extra'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | 'extra'
                                            | [
                                                  'a',
                                                  (key: 'a1') => TransformShape,
                                              ]
                                            | ['b', (key: 1n) => TransformShape]
                                            | [
                                                  'extra',
                                                  (
                                                      key: 'extra',
                                                  ) => TransformShape,
                                              ]
                                        >
                                      | null
                                  a2:
                                      | 'a'
                                      | 'b'
                                      | NonEmptyArray<
                                            | 'a'
                                            | 'b'
                                            | [
                                                  'a',
                                                  (key: 'a2') => TransformShape,
                                              ]
                                            | ['b', (key: 2) => TransformShape]
                                        >
                                      | null
                              }
                          }
                    >,
                    separator?: string | undefined,
                ]
            >
        >
    })
})
