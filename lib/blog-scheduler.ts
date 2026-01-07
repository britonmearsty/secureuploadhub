import prisma from '@/lib/prisma'

/**
 * Unfeature articles that have been featured for more than 24 hours
 * This should be called by a cron job or scheduled task
 */
export async function unfeatureExpiredArticles() {
  try {
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)
    
    const expiredFeaturedArticles = await prisma.article.findMany({
      where: {
        isFeatured: true,
        featuredAt: {
          lt: twentyFourHoursAgo
        }
      },
      select: {
        id: true,
        title: true,
        featuredAt: true
      }
    })

    if (expiredFeaturedArticles.length > 0) {
      await prisma.article.updateMany({
        where: {
          id: {
            in: expiredFeaturedArticles.map(article => article.id)
          }
        },
        data: {
          isFeatured: false,
          featuredAt: null
        }
      })

      console.log(`Unfeatured ${expiredFeaturedArticles.length} expired articles:`, 
        expiredFeaturedArticles.map(a => a.title))
    }

    return {
      success: true,
      unfeaturedCount: expiredFeaturedArticles.length,
      articles: expiredFeaturedArticles
    }
  } catch (error) {
    console.error('Error unfeaturing expired articles:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Get featured articles count and their remaining time
 */
export async function getFeaturedArticlesStatus() {
  try {
    const featuredArticles = await prisma.article.findMany({
      where: {
        isFeatured: true
      },
      select: {
        id: true,
        title: true,
        slug: true,
        featuredAt: true
      },
      orderBy: {
        featuredAt: 'asc'
      }
    })

    const now = new Date()
    const articlesWithTimeLeft = featuredArticles.map(article => {
      const featuredAt = new Date(article.featuredAt!)
      const timeElapsed = now.getTime() - featuredAt.getTime()
      const timeLeft = Math.max(0, 24 * 60 * 60 * 1000 - timeElapsed)
      const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000))
      const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000))

      return {
        ...article,
        timeLeft,
        hoursLeft,
        minutesLeft,
        isExpired: timeLeft === 0
      }
    })

    return {
      success: true,
      count: featuredArticles.length,
      articles: articlesWithTimeLeft
    }
  } catch (error) {
    console.error('Error getting featured articles status:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}