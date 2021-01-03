import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export const enum Validity {
    INVALID,
    VALID,
    ADMIN
}

export default async function (request: NowRequest, response: NowResponse) {
    const valid = await validateToken(request.headers.token as string)

    if (valid === Validity.ADMIN) {
        response.status(200).send("ADMIN")
    } else if (valid === Validity.VALID) {
        response.status(200).send("VALUD")
    } else if (valid === Validity.INVALID) {
        response.status(200).send("INVALID")
    }
}

export async function validateToken (token: string): Promise<Validity> {
    if (token && typeof token === "string") {
        const foundToken = await prisma.token.findUnique({
            where: { value: token }
        })

        if (foundToken) {
            if (foundToken.isAdminToken) {
                return Validity.ADMIN
            } else {
                return Validity.VALID
            }
        } else {
            return Validity.INVALID
        }
    } else {
        return Validity.INVALID
    }
}