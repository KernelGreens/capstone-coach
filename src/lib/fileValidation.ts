// File upload validation utilities

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export const ALLOWED_FILE_TYPES = {
  documents: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv',
  ],
  images: [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
  ],
  code: [
    'text/javascript',
    'text/typescript',
    'text/html',
    'text/css',
    'application/json',
    'text/xml',
    'text/x-python',
    'text/x-java',
  ],
  archives: [
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
};

export const ALLOWED_EXTENSIONS = [
  // Documents
  '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.csv',
  // Images
  '.jpg', '.jpeg', '.png', '.gif', '.webp',
  // Code
  '.js', '.ts', '.jsx', '.tsx', '.html', '.css', '.json', '.xml', '.py', '.java', '.go', '.rs', '.cpp', '.c', '.h',
  // Archives
  '.zip', '.rar', '.7z',
];

export const ALL_ALLOWED_TYPES = [
  ...ALLOWED_FILE_TYPES.documents,
  ...ALLOWED_FILE_TYPES.images,
  ...ALLOWED_FILE_TYPES.code,
  ...ALLOWED_FILE_TYPES.archives,
];

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateFile(file: File): ValidationResult {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    const maxSizeMB = MAX_FILE_SIZE / (1024 * 1024);
    return {
      valid: false,
      error: `File size exceeds ${maxSizeMB}MB limit. Current size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`,
    };
  }

  // Check file type by MIME type
  const isAllowedType = ALL_ALLOWED_TYPES.includes(file.type);
  
  // Also check by extension as fallback (some files may have empty/generic MIME types)
  const extension = '.' + file.name.split('.').pop()?.toLowerCase();
  const isAllowedExtension = ALLOWED_EXTENSIONS.includes(extension);

  if (!isAllowedType && !isAllowedExtension) {
    return {
      valid: false,
      error: `File type "${file.type || extension}" is not allowed. Allowed types: documents, images, code files, and archives.`,
    };
  }

  return { valid: true };
}

export function validateFiles(files: FileList | File[]): ValidationResult {
  const fileArray = Array.from(files);
  
  for (const file of fileArray) {
    const result = validateFile(file);
    if (!result.valid) {
      return result;
    }
  }

  return { valid: true };
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getAcceptString(): string {
  return ALLOWED_EXTENSIONS.join(',');
}
