import prisma from './lib/prisma'

async function main() {
    const uploads = await prisma.fileUpload.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: {
            id: true,
            fileName: true,
            storageProvider: true,
            storageFileId: true,
            storagePath: true,
        }
    })
    console.log(JSON.stringify(uploads, null, 2))
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
