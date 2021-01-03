import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { Validity, validateToken } from './validateToken'

export default async function (request: NowRequest, response: NowResponse) {
    let { makebottoken: makeBotToken, makeadmintoken: makeAdminToken, name, token } = request.headers
    const valid = await validateToken(token as string)

    console.log(request.headers)

    try {
        makeBotToken = JSON.parse((makeBotToken as string).toLowerCase())
        makeAdminToken = JSON.parse((makeAdminToken as string).toLowerCase())
        if (typeof name !== "string") throw "Bad request"

        if (valid === Validity.ADMIN) {
            const created = await prisma.token.create({
                data: {
                    isAdminToken: makeAdminToken as unknown as boolean,
                    isBotToken: makeBotToken as unknown as boolean,
                    name: name as string,
                }
            })

            response.status(201).send(created.value)
        } else {
            response.status(403).send("Unauthorized: Token not valid or not admin token")
        }
    } catch (e) {
        response.status(400).send("Bad request - see documentation")
    }
}

// await fetch("http://localhost:3000/api/newToken", {
//     headers: {
//         token: "<ADMIN-TOKEN>",
//         name: "Khushraj Rathod",
//         makeAdminToken: "true",
//         makeBotToken: "false"
//     }
// })