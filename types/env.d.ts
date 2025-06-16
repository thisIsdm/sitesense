declare namespace NodeJS {
  interface ProcessEnv {
    MINIO_ENDPOINT?: string;
    MINIO_PORT?: string;
    MINIO_USE_SSL?: string;
    MINIO_ACCESS_KEY?: string;
    MINIO_SECRET_KEY?: string;
    NEXT_PUBLIC_MINIO_ENDPOINT?: string;
    NEXT_PUBLIC_MINIO_PORT?: string;
  }
}
