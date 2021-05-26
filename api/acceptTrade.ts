import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, Currency, FromOrTo } from '@prisma/client'
import { Validity, validateToken } from './validateToken'
import axios from 'axios'
const prisma = new PrismaClient()

export default async (request: NowRequest, response: NowResponse) => {
    let input
    try {
        input = parseHeaders(request.headers)
    } catch (e) {
        return response.status(400).send(e)
    }

    const valid = await validateToken(input.token)
    const trade = await prisma.trade.findUnique({
        where: {
            tradeID: input.tradeID
        }
    })

    const token = await prisma.token.findUnique({
        where: {
            value: input.token
        }
    })

    if (valid !== Validity.ADMIN) {
        return response.status(403).send("Unauthorized: Token not valid or not admin token")
    }

    if (trade?.unitsRemaining! - input.units < 0) {
        return response.status(409).send("Not enough units")
    }

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

    switch (trade?.from) {
        case Currency.HN:
            const response = await axios.post(process.env.HN_URL!, {
                query: queryData,
                variables: {
                    amount: trade.currencyWhichIsOne === FromOrTo.FROM ? trade.units : trade.units * trade.amountPerUnit,
                    user: token?.userID
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

    await prisma.purchase.create({
        data: {
            units: input.units,
            buyerToken: {
                connect: {
                    value: token?.value
                }
            },
            trade: {
                connect: {
                    tradeID: trade?.tradeID
                }
            },
            // @ts-ignore
            incompleteTransactionID
        }
    })
}

function parseHeaders({ token, tradeID: tradeIDString, units: unitsString }: any): {
    token: string,
    tradeID: number,
    units: number
} {
    if (!token || !tradeIDString || !unitsString) throw "Missing arguments"
    if (typeof token !== "string") throw "Bad token"
    try {
        const units = parseInt(unitsString)
        const tradeID = parseInt(tradeIDString)
        return {
            token,
            tradeID,
            units
        }
    } catch {
        throw "Bad arguments"
    }
}