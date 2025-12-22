-- 06 §11.8 短信配置：服务商 / 模板 / 发送日志
CREATE TABLE "sms_providers" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "endpoint" TEXT,
    "accessKeyId" TEXT NOT NULL,
    "secretCipher" TEXT NOT NULL,
    "secretLast4" TEXT NOT NULL,
    "signName" TEXT NOT NULL,
    "templateCode" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sms_providers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_providers_code_key" ON "sms_providers"("code");

CREATE TABLE "sms_templates" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "providerId" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "sms_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "sms_templates_code_key" ON "sms_templates"("code");

CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "template" TEXT NOT NULL,
    "providerId" TEXT,
    "status" TEXT NOT NULL,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "sms_logs_createdAt_idx" ON "sms_logs"("createdAt");
CREATE INDEX "sms_logs_phone_idx" ON "sms_logs"("phone");

ALTER TABLE "sms_templates" ADD CONSTRAINT "sms_templates_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "sms_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "sms_providers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
