-- 06 §11.9 AI 配置：服务商 / 场景路由 / 用量
CREATE TABLE "ai_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKeyCipher" TEXT NOT NULL,
    "apiKeyLast4" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ai_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_providers_code_key" ON "ai_providers"("code");

CREATE TABLE "ai_routes" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "providerId" TEXT,
    "modelOverride" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_routes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ai_routes_scene_key" ON "ai_routes"("scene");

CREATE TABLE "ai_usage" (
    "id" TEXT NOT NULL,
    "scene" TEXT NOT NULL,
    "providerId" TEXT,
    "promptTokens" INTEGER NOT NULL DEFAULT 0,
    "completionTokens" INTEGER NOT NULL DEFAULT 0,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ai_usage_createdAt_idx" ON "ai_usage"("createdAt");
CREATE INDEX "ai_usage_scene_idx" ON "ai_usage"("scene");

ALTER TABLE "ai_routes" ADD CONSTRAINT "ai_routes_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ai_usage" ADD CONSTRAINT "ai_usage_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "ai_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
