-- CreateTable
CREATE TABLE "recommendations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "user_id" INTEGER NOT NULL DEFAULT 1,
    "tmdb_id" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "release_year" TEXT,
    "overview" TEXT NOT NULL,
    "poster_path" TEXT,
    "reason" TEXT NOT NULL,
    "watch_providers_json" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
