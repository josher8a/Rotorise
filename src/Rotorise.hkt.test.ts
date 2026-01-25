import { describe, it, expect } from 'vitest'
import { attest } from '@ark/attest'
import {
    tableEntry,
    Prefix,
    Suffix,
    uppercase,
    Hkt,
    tagMappers,
    SchemaConfigs,
} from './Rotorise'
import type { conform } from './utils'

describe('Rotorise HKT Transformations', () => {
    type User = {
        id: string
        orgId: string
    }

    const userTable = tableEntry<User>()({
        PK: [
            ['orgId', new Prefix('ORG#')],
            ['id', new Prefix('USER#')],
        ],
        SK: [['id', new Suffix('-KEY')]],
        GSI1PK: [['orgId', uppercase]],
    })

    it('verifies standard HKT transformations at type level', () => {
        attest(
            userTable.key('PK', { orgId: '123', id: '456' }),
        ).type.toString.snap('"ORGID#ORG#123#ID#USER#456"')
        attest(userTable.key('SK', { id: '456' })).type.toString.snap(
            '"ID#456-KEY"',
        )
        attest(userTable.key('GSI1PK', { orgId: 'google' })).type.toString.snap(
            '"ORGID#GOOGLE"',
        )
    })

    it('verifies standard HKT transformations at runtime', () => {
        const pk = userTable.key('PK', { orgId: '123', id: '456' })
        expect(pk).toBe('ORGID#ORG#123#ID#USER#456')

        const sk = userTable.key('SK', { id: '456' })
        expect(sk).toBe('ID#456-KEY')

        const gsi1pk = userTable.key('GSI1PK', { orgId: 'google' })
        expect(gsi1pk).toBe('ORGID#GOOGLE')
    })

    it('supports custom HKT implementations', () => {
        class BracketHkt extends Hkt {
            override body: `[${conform<this[0], string>}]` = undefined as never
            transform(v: string | number | bigint | boolean) {
                return `[${v}]`
            }
        }

        const customTable = tableEntry<User>()({
            PK: [['id', new BracketHkt()]],
        })

        attest(customTable.key('PK', { id: '123' })).type.toString.snap(
            '"ID#[123]"',
        )
        expect(customTable.key('PK', { id: '123' })).toBe('ID#[123]')
    })

    it('supports custom tag mapping (e.g. lowercase tags) via schema config', () => {
        const lowercaseTable = tableEntry<User>()({
            PK: [
                ['orgId', new Prefix('ORG#')],
                ['id', new Prefix('USER#')],
            ],
            [SchemaConfigs]: { tagMapper: tagMappers.lowercase },
        })

        attest(
            lowercaseTable.key('PK', { orgId: '123', id: '456' }),
        ).type.toString.snap('"orgid#ORG#123#id#USER#456"')

        expect(lowercaseTable.key('PK', { orgId: '123', id: '456' })).toBe(
            'orgid#ORG#123#id#USER#456',
        )
    })
})
