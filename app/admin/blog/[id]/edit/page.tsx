import { auth } from "@/auth"
import { redirect, notFound } from "next/navigation"
import { getFreshUserData } from "@/lib/session-validation"
import prisma from "@/lib/prisma"
import ArticleForm from "../../components/ArticleForm"

interface EditArticlePageProps {
  params: Promise<{ id: string }>
}

export default async function EditArticlePage({ params }: EditArticlePageProps) {
  const { id } = await params
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const freshUser = await getFreshUserData(session.user.id)
  
  if (!freshUser || freshUser.role !== "admin") {
    redirect("/dashboard")
  }

  // Fetch the article with categories and tags
  const article = await prisma.article.findUnique({
    where: { id },
    include: {
      categories: {
        include: {
          category: true
        }
      },
      tags: {
        include: {
          tag: true
        }
      }
    }
  })

  if (!article) {
    notFound()
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Article</h1>
        <p className="text-gray-600 mt-1">Update your blog article</p>
      </div>

      <ArticleForm article={{
        ...article,
        excerpt: article.excerpt || ''
      }} />
    </div>
  )
}