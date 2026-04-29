-- CreateTable
CREATE TABLE `users` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `telefono` VARCHAR(191) NULL,
    `passwordHash` VARCHAR(191) NOT NULL,
    `rol` ENUM('COMPRADOR', 'ADMIN', 'DELIVERY', 'FRUVER_OWNER', 'PROVEEDOR') NOT NULL DEFAULT 'COMPRADOR',
    `direccion` VARCHAR(191) NULL,
    `lat` DOUBLE NULL,
    `lng` DOUBLE NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `delivery_perfiles` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `origen` ENUM('SMF_INDEPENDIENTE', 'VINCULADO_FRUVER') NOT NULL DEFAULT 'SMF_INDEPENDIENTE',
    `tiendaId` VARCHAR(191) NULL,
    `latActual` DOUBLE NULL,
    `lngActual` DOUBLE NULL,
    `activoAhora` BOOLEAN NOT NULL DEFAULT false,
    `zonas` VARCHAR(191) NULL,
    `calificacion` DOUBLE NULL DEFAULT 5.0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `delivery_perfiles_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tiendas` (
    `id` VARCHAR(191) NOT NULL,
    `ownerId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` VARCHAR(191) NULL,
    `direccion` VARCHAR(191) NOT NULL,
    `lat` DOUBLE NOT NULL,
    `lng` DOUBLE NOT NULL,
    `zona` VARCHAR(191) NOT NULL,
    `imagenUrl` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `comisionPct` DOUBLE NOT NULL DEFAULT 8.0,
    `radioEntregaKm` DOUBLE NOT NULL DEFAULT 3.0,
    `costodomicilio` DOUBLE NOT NULL DEFAULT 5000,
    `tiempoEstimadoMin` INTEGER NOT NULL DEFAULT 45,
    `aceptaPickup` BOOLEAN NOT NULL DEFAULT true,
    `activa` BOOLEAN NOT NULL DEFAULT true,
    `whatsapp` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productos_catalogo` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `nombreComun` VARCHAR(191) NULL,
    `categoria` ENUM('FRUTAS', 'VERDURAS_HORTALIZAS', 'FRUTOS_SECOS_SEMILLAS', 'CEREALES', 'LACTEOS', 'PROTEINAS', 'BEBIDAS', 'OTROS') NOT NULL,
    `unidad` ENUM('UNIDAD', 'GRAMO', 'KILOGRAMO', 'LIBRA', 'LITRO', 'MILILITRO', 'MANOJO', 'BOLSA') NOT NULL DEFAULT 'UNIDAD',
    `descripcion` VARCHAR(191) NULL,
    `imagenUrl` VARCHAR(191) NULL,
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `precios_mercado` (
    `id` VARCHAR(191) NOT NULL,
    `productoId` VARCHAR(191) NOT NULL,
    `precioMin` DOUBLE NOT NULL,
    `precioMax` DOUBLE NOT NULL,
    `precioSugerido` DOUBLE NOT NULL,
    `fuente` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventario_tienda` (
    `id` VARCHAR(191) NOT NULL,
    `tiendaId` VARCHAR(191) NOT NULL,
    `productoId` VARCHAR(191) NOT NULL,
    `disponible` BOOLEAN NOT NULL DEFAULT false,
    `precioVenta` DOUBLE NOT NULL,
    `stockAprox` INTEGER NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `inventario_tienda_tiendaId_productoId_key`(`tiendaId`, `productoId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedidos` (
    `id` VARCHAR(191) NOT NULL,
    `compradorId` VARCHAR(191) NOT NULL,
    `tiendaId` VARCHAR(191) NOT NULL,
    `deliveryId` VARCHAR(191) NULL,
    `estado` ENUM('PENDIENTE_PAGO', 'PAGADO', 'PREPARANDO', 'LISTO_PARA_RECOGER', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO') NOT NULL DEFAULT 'PENDIENTE_PAGO',
    `tipoDelivery` ENUM('RED_SMF', 'PICAP', 'PICKUP_TIENDA') NOT NULL DEFAULT 'RED_SMF',
    `direccionEntrega` VARCHAR(191) NULL,
    `latEntrega` DOUBLE NULL,
    `lngEntrega` DOUBLE NULL,
    `subtotal` DOUBLE NOT NULL,
    `costoDelivery` DOUBLE NOT NULL DEFAULT 0,
    `total` DOUBLE NOT NULL,
    `comisionSmf` DOUBLE NOT NULL,
    `pagoTienda` DOUBLE NOT NULL,
    `pagoDelivery` DOUBLE NOT NULL DEFAULT 0,
    `wompiRef` VARCHAR(191) NULL,
    `picapRef` VARCHAR(191) NULL,
    `codigoPickup` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `pagadoAt` DATETIME(3) NULL,
    `preparadoAt` DATETIME(3) NULL,
    `enCaminoAt` DATETIME(3) NULL,
    `entregadoAt` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `pedido_items` (
    `id` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NOT NULL,
    `productoId` VARCHAR(191) NOT NULL,
    `cantidad` INTEGER NOT NULL,
    `precioUnitario` DOUBLE NOT NULL,
    `subtotal` DOUBLE NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `planes_nutricionales` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `peso` DOUBLE NOT NULL,
    `estatura` DOUBLE NOT NULL,
    `sexo` VARCHAR(191) NOT NULL,
    `fechaNacimiento` DATETIME(3) NOT NULL,
    `actividad` VARCHAR(191) NOT NULL,
    `objetivo` VARCHAR(191) NULL,
    `imc` DOUBLE NOT NULL,
    `tmb` DOUBLE NOT NULL,
    `getd` DOUBLE NOT NULL,
    `planGemini` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notificaciones` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `pedidoId` VARCHAR(191) NULL,
    `canal` ENUM('WHATSAPP', 'EMAIL', 'PUSH') NOT NULL,
    `tipo` ENUM('PEDIDO_NUEVO', 'PEDIDO_CONFIRMADO', 'PEDIDO_PREPARANDO', 'PEDIDO_LISTO', 'EN_CAMINO', 'ENTREGADO', 'CANCELADO', 'BIENVENIDA', 'RECORDATORIO_INVENTARIO') NOT NULL,
    `mensaje` TEXT NOT NULL,
    `enviado` BOOLEAN NOT NULL DEFAULT false,
    `sentAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `delivery_perfiles` ADD CONSTRAINT `delivery_perfiles_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `delivery_perfiles` ADD CONSTRAINT `delivery_perfiles_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `tiendas`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tiendas` ADD CONSTRAINT `tiendas_ownerId_fkey` FOREIGN KEY (`ownerId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `precios_mercado` ADD CONSTRAINT `precios_mercado_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos_catalogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_tienda` ADD CONSTRAINT `inventario_tienda_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `tiendas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventario_tienda` ADD CONSTRAINT `inventario_tienda_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos_catalogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_compradorId_fkey` FOREIGN KEY (`compradorId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_tiendaId_fkey` FOREIGN KEY (`tiendaId`) REFERENCES `tiendas`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedidos` ADD CONSTRAINT `pedidos_deliveryId_fkey` FOREIGN KEY (`deliveryId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `pedido_items` ADD CONSTRAINT `pedido_items_productoId_fkey` FOREIGN KEY (`productoId`) REFERENCES `productos_catalogo`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `planes_nutricionales` ADD CONSTRAINT `planes_nutricionales_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notificaciones` ADD CONSTRAINT `notificaciones_pedidoId_fkey` FOREIGN KEY (`pedidoId`) REFERENCES `pedidos`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
