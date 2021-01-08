import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus } from '@prisma/client'
const prisma = new PrismaClient()

export default async (request: NowRequest, response: NowResponse) => {
    console.log(request.body)
    const secret = await prisma.secret.findUnique({
        where: {
            owner: "hn"
        }
    })

    if (!request.query.secret || request.query.secret !== secret?.value) {
        return response.status(403).send("Forbidden")
    }

    let validatedID
    try {
        validatedID = parseInt(request.body.body.id)
    } catch (e) {
        return response.status(400).send(e)
    }

    await prisma.trade.update({
        where: {
            incompleteTransactionID: validatedID
        },
        data: {
            status: TradeStatus.IN_PROGRESS
        }
    })

    response.status(200).send("OK")
}