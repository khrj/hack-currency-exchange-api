import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus, Currency, FromOrTo } from '@prisma/client'
const prisma = new PrismaClient()

import { Validity, validateToken } from './validateToken'

export default async function (request: NowRequest, response: NowResponse) {
    let input
    try {
        input = parseHeaders(request.headers)
    } catch (e) {
        return response.status(400).send(e)
    }

    const valid = await validateToken(input.token)

    if (valid !== Validity.VALID && valid !== Validity.ADMIN) {
        return response.status(400).send("Unauthorized: Token not valid")
    }

    try {
        const tokenObject = await prisma.token.findUnique({
            where: {
                value: input.token
            }
        })

        // TODO interact with Currency API

        const created = await prisma.trade.create({
            data: {
                from: input.from,
                to: input.to,
                currencyWhichIsOne: input.currencyWhichIsOne,
                amountPerUnit: input.amountPerUnit,
                units: input.units,
                status: TradeStatus.PENDING,
                unitsRemaining: input.units,
                seller: {
                    connect: {
                        token_id: tokenObject?.token_id
                    }
                }
            }
        })

        return response.status(201).send(created.trade_id)
    } catch (e) {
        return response.status(500).send("Unexpected error while creating trade")
    }
}

function parseHeaders({ from, to, currency_which_is_one: currencyWhichIsOne, amount_per_unit: amountPerUnitString, units: unitsString, token }: any): {
    from: Currency,
    to: Currency,
    currencyWhichIsOne: FromOrTo,
    amountPerUnit: number,
    units: number,
    token: string
} {
    if (!(from && to && currencyWhichIsOne && amountPerUnitString && unitsString && token)) throw "Bad request: Missing arguments"
    if (!(from.toUpperCase() in Currency && to.toUpperCase() in Currency && currencyWhichIsOne.toUpperCase() in FromOrTo)) throw "Bad request: Arguments invalid"

    try {
        const amountPerUnit = parseInt(amountPerUnitString)
        const units = parseInt(unitsString)
        return {
            from: from.toUpperCase(),
            to: to.toUpperCase(),
            currencyWhichIsOne: currencyWhichIsOne.toUpperCase(),
            amountPerUnit,
            units,
            token,
        }
    } catch {
        throw "Bad request: Failed to parse arguments"
    }
}

// The following example:
// Offering 10 GP for 1 HN, 10 times.
// Total GP to be paid to market: 10 * 10 = 100
// Total Potential HN made: 10 * 1 = 10

// await fetch("http://localhost:3000/api/newTrade", {
//     headers: {
//         token: "<TOKEN>",
//         from: "GP",
//         to: "HN",
//         currency_which_is_one: "to",
//         amount_per_unit: "5",
//         units: "10",
//     }
// })
// .then(response => response.text())
// .then(body => console.log(body))