import type { Equal, isTrue } from './typeUtils'
import {
    type CompositeKeyBuilder,
    type CompositeKeyParams,
    type Slices,
    tableEntry,
    type keysWithNumericValue,
} from './Rotorise'

describe('DynamoDB Utils', () => {
    it('Slices', async () => {
        type test_Slices =
            | isTrue<
                  Equal<
                      Slices<[1, 2, 3, 4]>,
                      [] | [1] | [1, 2] | [1, 2, 3] | [1, 2, 3, 4]
                  >
              >
            | isTrue<
                  Equal<
                      Slices<[1, 2, 3, 4], 0>, // skip 0
                      [] | [1] | [1, 2] | [1, 2, 3] | [1, 2, 3, 4]
                  >
              >
            | isTrue<
                  Equal<
                      Slices<[1, 2, 3, 4], 1>, // skip 1
                      [1] | [1, 2] | [1, 2, 3] | [1, 2, 3, 4]
                  >
              >
            | isTrue<
                  Equal<
                      Slices<[1, 2, 3, 4], 2>, // skip 2
                      [1, 2] | [1, 2, 3] | [1, 2, 3, 4]
                  >
              >
            | isTrue<
                  Equal<
                      Slices<[1, 2, 3, 4], 4>, // skip 4
                      [1, 2, 3, 4]
                  >
              >
            | isTrue<
                  Equal<
                      | Slices<[1, 2, 3, 4], 5>
                      | Slices<[1, 2, 3, 4], 6>
                      | Slices<[1, 2, 3, 4], 69>
                      | Slices<[1, 2, 3, 4], -1>
                      | Slices<[1, 2, 3, 4], -420>, // skip 5 or out of bounds
                      never
                  >
              >
    })

    it('CompositeKeyParams', () => {
        type test_CompositeKeyParams =
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', 'c']
                      >,
                      | { a: string; b?: undefined; c?: undefined }
                      | { a: string; b: number; c?: undefined }
                      | { a: string; b: number; c: boolean }
                  >
              >
            | isTrue<
                  Equal<
                      CompositeKeyParams<
                          { a: string; b: number; c: boolean },
                          ['a', 'b', ['c', (c: boolean) => 'TRANSFORM']]
                      >,
                      | { a: string; b?: undefined; c?: undefined }
                      | { a: string; b: number; c?: undefined }
                      | { a: string; b: number; c: boolean }
                  >
              >
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
    })

    test('keysWithNumericValue', () => {
        type expect = isTrue<
            Equal<
                keysWithNumericValue<
                    | { a: 'a1'; b: 1; c: true; z: 'never' }
                    | { a: 'a2'; b: 2; c: 0; z: 'never' }
                >,
                'b'
            >
        >
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

        type expect_infer = isTrue<Equal<typeof testTableEntry.infer, entries>>

        expect(
            testTableEntry.key(
                'PK',
                {
                    a: 'a1',
                    b: 1,
                },
                {
                    depth: 2,
                    allowPartial: false,
                },
            ),
        ).toBe('A-a1-B-1')

        const entity = {
            a: 'a1',
            b: 1,
            c: true,
            z: 'never',
        } satisfies Entity

        const testTableEntryObj = testTableEntry.toEntry(entity)

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

        const keyDefaults = testTableEntry.key(
            'PK',
            {
                a: 'a1',
                b: 1,
            },
        )

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
    })

    test('table Entry with transform', () => {
        const base = tableEntry<
            | { a: 'a1'; b: 1; c: true; z: 'never' }
            | { a: 'a2'; b: 2; c: 0; z: 'never' }
        >()
        type t = Parameters<typeof base>
        type expect_schema = isTrue<
            Equal<
                Parameters<typeof base>,
                [
                    schema: Record<
                        string,
                        | 'b'
                        | (
                              | 'a'
                              | 'b'
                              | 'c'
                              | 'z'
                              | ['a', (key: 'a1' | 'a2') => unknown]
                              | ['b', (key: 1 | 2) => unknown]
                              | ['c', (key: true | 0) => unknown]
                              | ['z', (key: 'never') => unknown]
                          )[]
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
                SK: ['c'],
            },
            '-',
        )

        expect(
            testTableEntry.key(
                'PK',
                {
                    a: 'a1',
                    b: 1,
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
    })
})
