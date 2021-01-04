import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

import { Validity, validateToken } from './validateToken'

export default async function (request: NowRequest, response: NowResponse) {
    let input
    try {
        input = parseHeaders(request.headers)
    } catch (e) {
        return response.status(400).send(e)
    }

    const valid = await validateToken(input.token as string)

    if (valid !== Validity.ADMIN) {
        return response.status(403).send("Unauthorized: Token not valid or not admin token")
    }

    try {
        const created = await prisma.token.create({
            data: {
                isAdminToken: input.makeAdminToken,
                isBotToken: input.makeBotToken,
                name: input.name,
            }
        })

        response.status(201).send(created.value)
    } catch (e) {
        response.status(500).send("Unexpected error while creating token")
    }
}

function parseHeaders({ make_bot_token: makeBotToken, make_admin_token: makeAdminToken, name, token }: any): {
    makeBotToken: boolean,
    makeAdminToken: boolean,
    name: string,
    token: string
} {
    if (!(makeBotToken && makeAdminToken && name && token)) throw "Bad request: Missing arguments"
    if ((makeBotToken.toLowerCase() !== "true" && makeBotToken.toLowerCase() !== "false") || (makeAdminToken.toLowerCase() !== "true" && makeAdminToken.toLowerCase() !== "false")) throw "Bad Request: Invalid Arguments"

    return {
        makeBotToken: makeBotToken.toLowerCase() === "true",
        makeAdminToken: makeAdminToken.toLowerCase() === "true",
        name,
        token
    }
}

// await fetch("http://localhost:3000/api/newToken", {
//     headers: {
//         token: "<ADMIN-TOKEN>",
//         name: "Khushraj Rathod",
//         make_admin_token: "true",
//         make_bot_token: "false"
//     }
// })