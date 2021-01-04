import { NowRequest, NowResponse } from '@vercel/node'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

export default (request: NowRequest, response: NowResponse) => {
    response.status(501).send(`Not Implemented`)
}