import { Validity, validateToken } from './validateToken'

import { NowRequest, NowResponse } from '@vercel/node'
import axios from 'axios'
import { PrismaClient, TradeStatus, Currency, FromOrTo } from '@prisma/client'
const prisma = new PrismaClient()

export default async function (request: NowRequest, response: NowResponse) {
    let input
    try {
        input = parseHeaders(request.headers)
    } catch (e) {
        return response.status(400).send(e)
    }

    const valid = await validateToken(input.token)

    if (valid !== Validity.VALID && valid !== Validity.ADMIN) {
        return response.status(403).send("Unauthorized: Token not valid")
    }

    try {
        const tokenObject = await prisma.token.findUnique({
            where: {
                value: input.token
            }
        })

        const queryData = `
            mutation ($amount: Float!, $user: String!) {
	            transact (data: {
		            from: $user,
		            to: "U01JD2MBVUY",
		            balance: $amount,
                    for: "Offer trade in the Hack Currency Exchange" 
                }) { 
                    id 
                }
            }
        `

        let incompleteTransactionID: number

        switch (input.from) {
            case Currency.HN:
                const response = await axios.post('https://hn.rishi.cx', {
                    query: queryData.replace(/\s/g, ''),
                    variables: {
                        amount: input.currencyWhichIsOne === FromOrTo.FROM ? input.units : input.units * input.amountPerUnit,
                        user: tokenObject!.userID
                    }
                }, {
                    headers: {
                        secret: process.env.HN_SECRET!
                    }
                })

                const body = response.data
                incompleteTransactionID = parseInt(body.data.transact.id)
                break
            case Currency.GP:
                // TODO
                incompleteTransactionID = -1
                break
        }

        await prisma.trade.create({
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
                },
                incompleteTransactionID
            }
        })

        return response.status(201).send(incompleteTransactionID)
    } catch (e) {
        console.error(e)
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

// await fetch("https://exchange.khushrajrathod.com/api/newTrade", {
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