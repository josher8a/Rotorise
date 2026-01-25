import { describe, it } from 'vitest'
import { attest } from '@ark/attest'
import { tableEntry } from './Rotorise'

describe('Rotorise Performance Baseline', () => {
    type User = {
        id: string
        orgId: string
        role: 'admin' | 'user' | 'guest'
        metadata: {
            lastLogin: number
            tags: string[]
        }
    }

    const userSchema = tableEntry<User>()({
        PK: [
            ['orgId', (id: string) => `ORG#${id}`],
            ['id', (id: string) => `USER#${id}`],
        ],
        SK: ['role'],
        GSI1PK: [['role', (role: string) => `ROLE#${role}`]],
    })

    it('measures instantiation count for tableEntry', () => {
        // Measure performance of the tableEntry definition
        attest.instantiations([16, 'instantiations'])
    })

    it('measures instantiation count for key generation', () => {
        userSchema.key('PK', { orgId: '123', id: '456' })
        attest.instantiations([16, 'instantiations'])
    })

    it('verifies type outputs with snapshots', () => {
        attest(
            userSchema.key('PK', { orgId: '123', id: '456' }),
        ).type.toString.snap('`ORGID#${string}#ID#${string}`')
        attest(userSchema.key('SK', { role: 'admin' })).type.toString.snap(
            '"ROLE#admin"',
        )
    })

    describe('Error Diagnostics', () => {
        it('reports error for invalid schema key', () => {
            const invalidSchema = tableEntry<User>()({
                // @ts-expect-error
                INVALID: 123,
            })
            attest(
                invalidSchema.infer.INVALID,
            ).type.toString.snap(`  | ErrorMessage<"Invalid schema definition">
  | undefined`)
        })

        it('reports error for invalid top-level key in .key()', () => {
            attest(() =>
                // @ts-expect-error
                userSchema.key('NON_EXISTENT', { id: '123' }),
            ).throws.snap('Error: Key NON_EXISTENT not found in schema')
        })

        it('reports error for invalid Spec type', () => {
            const invalidSchema = tableEntry<User>()({
                // @ts-expect-error
                BAD_SPEC: { invalid: 'logic' },
            })
            attest(
                invalidSchema.infer.BAD_SPEC,
            ).type.toString.snap(`  | ErrorMessage<"Invalid schema definition">
  | undefined`)
        })
    })
})
