import { Response } from 'express';
import { AuthRequest } from '../utils/jwt.js';
import { asyncHandler } from '../utils/errors.js';
import { config } from '../config/index.js';
import { SUCCESS_MESSAGES } from '../config/constants.js';

export const uploadFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  if (!req.file) {
    res.status(400).json({
      success: false,
      error: {
        code: 'NO_FILE',
        message: 'No se envió ningún archivo',
      },
    });
    return;
  }

  const fileUrl = `/uploads/${req.file.filename}`;

  res.json({
    success: true,
    message: SUCCESS_MESSAGES.FILE_UPLOADED,
    data: {
      url: fileUrl,
      filename: req.file.filename,
      originalName: req.file.originalname,
      size: req.file.size,
      mimetype: req.file.mimetype,
    },
  });
});

export const getFile = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { filename } = req.params;
  const filePath = `${config.upload.dir}/${filename}`;

  res.sendFile(filePath, (err) => {
    if (err) {
      res.status(404).json({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'Archivo no encontrado',
        },
      });
    }
  });
});
