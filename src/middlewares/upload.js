const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const { randomUUID } = require("crypto");

// Configuración de Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Almacenamiento
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: "drivehub",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    public_id: randomUUID(),
  }),
});

// Middleware Multer
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },
});

// Limpio archivos parciales si Multer falla antes del controlador.
const uploadCarImages = (req, res, next) => {
  upload.array("images", 10)(req, res, async (error) => {
    if (!error) return next();

    await Promise.allSettled(
      (req.files || []).map((file) =>
        cloudinary.uploader.destroy(file.filename),
      ),
    );
    return next(error);
  });
};

module.exports = {
  upload,
  uploadCarImages,
  cloudinary,
};