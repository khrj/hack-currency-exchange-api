import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus, PurchaseStatus } from '@prisma/client'
const prisma = new PrismaClient()

export default async (request: NowRequest, response: NowResponse) => {
    const secret = await prisma.secret.findUnique({
        where: {
            owner: "hn"
        }
    })

    if (!request.query.secret || request.query.secret !== secret?.value) {
        return response.status(403).send("Forbidden")
    }

    if (typeof request.body.body.id !== "string") {
        return response.status(400).send("Bad ID")
    }

    const validatedID = request.body.body.id

    const purchase = await prisma.purchase.findUnique({
        where: {
            incompleteTransactionID: validatedID
        }
    })

    if (purchase) {
        await prisma.purchase.update({
            where: {
                incompleteTransactionID: validatedID,
            },
            data: {
                status: PurchaseStatus.COMPLETED,
                completedAt: new Date(),
            }
        })

        const parentTrade = await prisma.trade.findUnique({
            where: {
                tradeID: purchase.partOfTradeID
            }
        })

        const unitsRemainingAfterPurchase = parentTrade?.unitsRemaining! - purchase.units

        if (unitsRemainingAfterPurchase > 0) {
            await prisma.trade.update({
                where: {
                    tradeID: parentTrade?.tradeID
                },
                data: {
                    unitsRemaining: unitsRemainingAfterPurchase,
                    status: TradeStatus.IN_PROGRESS
                }
            })
        } else if (unitsRemainingAfterPurchase === 0) {
            await prisma.trade.update({
                where: {
                    tradeID: parentTrade?.tradeID
                },
                data: {
                    unitsRemaining: unitsRemainingAfterPurchase,
                    status: TradeStatus.COMPLETED
                }
            })
        }
    } else {
        await prisma.trade.update({
            where: {
                incompleteTransactionID: validatedID
            },
            data: {
                status: TradeStatus.IN_PROGRESS
            }
        })
    }

    response.status(200).send("OK")
}