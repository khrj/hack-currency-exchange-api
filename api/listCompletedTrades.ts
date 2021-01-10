import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus } from '@prisma/client'
import { Validity, validateToken } from './validateToken'
import _ from 'lodash'
const prisma = new PrismaClient()

export default async (request: NowRequest, response: NowResponse) => {
    try {
        const valid = await validateToken(request.headers.token as string)

        if (valid !== Validity.VALID && valid !== Validity.ADMIN) {
            return response.status(403).send("Unauthorized: Token not valid")
        }
    } catch (e) {
        return response.status(400).send(e)
    }

    const trades = await prisma.trade.findMany({
        where: {
            status: TradeStatus.COMPLETED
        }
    })

    const toReturn = trades.map(trade => {
        return _.pick(trade,
            [
                'tradeID',
                'sellerID',
                'units',
                'from',
                'to',
                'currencyWhichIsOne',
                'amountPerUnit',
                'unitsRemaining'
            ])
    })

    response.status(200).send(JSON.stringify(toReturn))
}

// await fetch("https://exchange.khushrajrathod.com/api/listActiveTrades", {
//     headers: {
//         token: "<TOKEN>",
//     }
// })