-- CreateTable
CREATE TABLE "taste_analyses" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL DEFAULT 1,
    "movie_count" INTEGER NOT NULL,
    "genre_stats_json" TEXT NOT NULL,
    "rating_stats_json" TEXT NOT NULL,
    "review_summary" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
