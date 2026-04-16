import multer from "multer";

const stroage = multer.diskStorage({});

export const upload = multer({stroage})