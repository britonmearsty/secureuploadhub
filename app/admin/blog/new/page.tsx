import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { getFreshUserData } from "@/lib/session-validation"
import ArticleForm from "../components/ArticleForm"

export default async function NewArticlePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect("/auth/signin")
  }

  const freshUser = await getFreshUserData(session.user.id)
  
  if (!freshUser || freshUser.role !== "admin") {
    redirect("/dashboard")
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Create New Article</h1>
        <p className="text-gray-600 mt-1">Write and publish a new blog article</p>
      </div>

      <ArticleForm />
    </div>
  )
}