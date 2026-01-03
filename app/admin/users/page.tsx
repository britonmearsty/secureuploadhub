import prisma from "@/lib/prisma"
import EnhancedUsersManagementClient from "./EnhancedUsersManagementClient"

export default async function AdminUsersPage() {
    // Authentication and authorization handled by AdminLayout
    // If this component renders, user is guaranteed to be an authenticated admin

    // Fetch users with additional data for enhanced management
    const users = await prisma.user.findMany({
        select: {
            id: true,
            email: true,
            name: true,
            image: true,
            role: true,
            status: true,
            createdAt: true,
            _count: {
                select: {
                    uploadPortals: true,
                    fileUploads: true,
                    subscriptions: true
                }
            },
            subscriptions: {
                select: {
                    id: true,
                    status: true,
                    plan: {
                        select: {
                            name: true,
                            price: true
                        }
                    }
                },
                orderBy: {
                    createdAt: 'desc'
                },
                take: 1
            }
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    // Convert dates to strings for client component
    const serializedUsers = users.map(user => ({
        ...user,
        createdAt: user.createdAt.toISOString()
    }));

    const totalUsers = await prisma.user.count();

    return (
        <div className="p-6">
            <EnhancedUsersManagementClient 
                initialUsers={serializedUsers} 
                totalUsers={totalUsers}
            />
        </div>
    );
}
