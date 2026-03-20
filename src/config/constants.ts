export const APP_NAME = 'Instant Drop';
export const APP_URL = process.env.APP_URL || 'http://localhost:3000';
export const API_PREFIX = '/api/v1';

export const ERROR_MESSAGES = {
  UNAUTHORIZED: 'No autorizado',
  FORBIDDEN: 'Acceso denegado',
  NOT_FOUND: 'Recurso no encontrado',
  VALIDATION_ERROR: 'Error de validación',
  INTERNAL_ERROR: 'Error interno del servidor',
  EMAIL_EXISTS: 'El email ya está registrado',
  INVALID_CREDENTIALS: 'Credenciales inválidas',
  INVALID_OTP: 'Código OTP inválido o expirado',
  OTP_EXPIRED: 'El código OTP ha expirado',
  DROP_NOT_FOUND: 'Drop no encontrado',
  SLUG_EXISTS: 'El slug ya está en uso',
  CODE_EXISTS: 'El código de descuento ya existe',
  CODE_EXPIRED: 'El código de descuento ha expirado',
  CODE_MAX_USES: 'El código de descuento ha alcanzado su límite de usos',
  CODE_MIN_AMOUNT: 'El monto mínimo para usar este código no ha sido alcanzado',
  CODE_NOT_APPLICABLE: 'Este código no es aplicable a este drop',
  CODE_INACTIVE: 'El código de descuento está inactivo',
  OUT_OF_STOCK: 'Producto sin stock disponible',
  DROP_NOT_LIVE: 'Este drop no está disponible para compra',
  CONFIRMATION_TOKEN_INVALID: 'Token de confirmación inválido',
  ORDER_NOT_FOUND: 'Orden no encontrada',
} as const;

export const SUCCESS_MESSAGES = {
  USER_CREATED: 'Usuario creado exitosamente. Por favor verifica tu email.',
  LOGIN_SUCCESS: 'Inicio de sesión exitoso',
  OTP_SENT: 'Código OTP enviado a tu email',
  OTP_VERIFIED: 'Código verificado exitosamente',
  EMAIL_VERIFIED: 'Email verificado exitosamente',
  VERIFICATION_RESENT: 'Email de verificación reenviado',
  DROP_CREATED: 'Drop creado exitosamente',
  DROP_UPDATED: 'Drop actualizado exitosamente',
  DROP_DELETED: 'Drop eliminado exitosamente',
  CODE_CREATED: 'Código de descuento creado exitosamente',
  CODE_UPDATED: 'Código de descuento actualizado exitosamente',
  CODE_DELETED: 'Código de descuento eliminado exitosamente',
  ORDER_CREATED: 'Orden creada exitosamente',
  ORDER_CONFIRMED: 'Orden confirmada exitosamente',
  WEBHOOK_CREATED: 'Webhook creado exitosamente',
  WEBHOOK_DELETED: 'Webhook eliminado exitosamente',
  FILE_UPLOADED: 'Archivo subido exitosamente',
};
