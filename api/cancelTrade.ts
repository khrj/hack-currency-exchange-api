import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus, Currency, FromOrTo } from '@prisma/client'
import { Validity, validateToken } from './validateToken'
import axios from 'axios'
const prisma = new PrismaClient()

export default async (request: NowRequest, response: NowResponse) => {
    const { tradeid: tradeID, token } = request.headers

    try {
        const valid = await validateToken(token as string)
        if (valid !== Validity.ADMIN && valid !== Validity.VALID) {
            return response.status(403).send("Unauthorized: Token not valid")
        }

        const trade = await prisma.trade.findUnique({
            where: {
                tradeID: parseInt(tradeID as string)
            }
        })

        const refundQuery = `
            mutation ($amount: Float!, $user: String!) {    
                send(data: { 
                    from: "U01JD2MBVUY",
                    to: $user,
                    balance: $amount,
                    for: "Currency Exchange refund"
                }) {
                    id
                }
            }`

        if (trade?.status === TradeStatus.COMPLETED) {
            return response.status(410).send("Trade already completed / cancelled")
        } else if (trade?.status === TradeStatus.PENDING) {
            await prisma.trade.update({
                where: {
                    tradeID: trade?.tradeID
                },
                data: {
                    units: 0,
                    unitsRemaining: 0,
                    status: TradeStatus.COMPLETED
                }
            })

            return response.status(200).send("Trade cancelled")
        } else if (trade?.status === TradeStatus.IN_PROGRESS) {
            switch (trade?.from) {
                case Currency.HN:
                    await axios.post(process.env.HN_URL!, {
                        query: refundQuery,
                        variables: {
                            amount: trade.currencyWhichIsOne === FromOrTo.FROM ? trade.unitsRemaining : trade.unitsRemaining * trade.amountPerUnit,
                            user: trade.sellerID
                        }
                    }, {
                        headers: {
                            secret: process.env.HN_SECRET!
                        }
                    })

                    response.status(200).send("Refunded")
                    break

                case Currency.GP:
                    // TODO
                    break
            }

            await prisma.trade.update({
                where: {
                    tradeID: trade?.tradeID
                },
                data: {
                    units: trade?.units - trade?.unitsRemaining,
                    unitsRemaining: 0,
                    status: TradeStatus.COMPLETED
                }
            })
        }
    } catch (e) {
        console.log(e)
        return response.status(400).send(e)
    }
}

// await fetch("https://exchange.hackclub.com/api/cancelTrade", {
//     headers: {
//         token: "<TOKEN>",
//         tradeID: "8"
//     }
// })