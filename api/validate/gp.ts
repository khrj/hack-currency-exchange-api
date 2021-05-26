import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient, TradeStatus, PurchaseStatus } from '@prisma/client'

import crypto from 'crypto'

const prisma = new PrismaClient()

export default async function (request: NowRequest, response: NowResponse) {
    try {
        await new Promise(resolve => {
            // slackEvents.requestListener()(request, response)
            const {
                'x-slack-request-timestamp': timestamp,
                'x-slack-signature': signature,
            } = request.headers || {}

            if (!timestamp || !signature) throw "Validation failed"

            let rawBody = ''
            request.setEncoding('utf-8')
                .on('data', data => { rawBody += data })
                .on('end', () => {
                    const hmac = crypto.createHmac('sha256', process.env.SLACK_SIGNING_SECRET!)
                        .update(`v0:${timestamp}:${rawBody}`)
                        .digest('hex')

                    if (`v0=${hmac}` === signature) {
                        resolve(true)
                    } else {
                        throw "Validation failed"
                    }
                })
        })
        if (request.body.challenge) {
            response.status(200).send(request.body.challenge)
        } else {
            response.status(200).send("OK")
            console.log(request.body)
        }
    } catch {
        response.status(403).send("Validation failed. Forbidden")
    }
}

// slackEvents.on('message.im', event => {
//     if (event.user === "UH50T81A6") {
//         console.log(event.text)
//         const parsed = event.text.match(/\$\$\$\|(.*)\|(.*)\|(.*)\|(.*)\|(.*)/)
//         console.dir(parsed, { depth: 0 })
//     }
// })


